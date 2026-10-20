// Edge Function `on-application-submitted`. The browser calls it right after it sets an application to
// `submitted`: supabase.functions.invoke("on-application-submitted", { body: { application_id } }).
//
// 1. Who is calling? The user's JWT (gateway verify_jwt = true, then auth.getUser()).
// 2. Load the application with the service role; it must belong to the caller (or the caller is admin),
//    be `submitted`, and not have been emailed before (applications.notified_at, migration 0004).
// 3. Verify the Turnstile token stored on the row when TURNSTILE_SECRET_KEY is set; record turnstile_ok and
//    drop the token. The account is email-confirmed, so the result is a signal for the admin, not a gate.
// 4. Email the student a confirmation and the admin a summary, then stamp notified_at.
//
// Secrets: RESEND_API_KEY, EMAIL_FROM, ADMIN_NOTIFY_EMAIL, TURNSTILE_SECRET_KEY (optional), SITE_URL.
// Returns JSON { ok: true } or { ok: false, error }. Logs never contain personal data.
import { fail, ok, preflight } from "../_shared/cors.ts";
import { adminEmail, getCaller, serviceClient, siteUrl } from "../_shared/clients.ts";
import { adminNewApplication, applicationReceived, type Row } from "../_shared/email.ts";
import { sendEmail } from "../_shared/resend.ts";
import { verifyTurnstile } from "../_shared/turnstile.ts";
import { firstName, programNames, readJson, str, validateSubmittedBody } from "../_shared/validate.ts";

type App = Record<string, unknown>;

const skills = (v: unknown) => (v && typeof v === "object" && !Array.isArray(v) ? Object.entries(v as Record<string, unknown>).filter(([, l]) => str(l) && str(l) !== "None").map(([k, l]) => `${k}: ${str(l)}`).join(", ") : str(v));

function adminRows(a: App, id: string): Row[] {
  const discount = a.discount_type ? `${str(a.discount_type)} ${str(a.discount_percent)}% (${str(a.discount_status) || "pending"})` : "none";
  const utm = a.utm && typeof a.utm === "object" ? Object.entries(a.utm as Record<string, unknown>).map(([k, v]) => `${k}=${str(v)}`).join(" ") : [a.utm_source, a.utm_medium, a.utm_campaign].filter(Boolean).map(String).join(" / ");
  return [
    ["Name", str(a.full_name)],
    ["Email", str(a.email)],
    ["Phone", str(a.phone)],
    ["WhatsApp", str(a.whatsapp)],
    ["Location", [a.city, a.country].filter(Boolean).map(String).join(", ")],
    ["Age", str(a.dob_or_age)],
    ["Language", str(a.language)],
    ["Status", str(a.current_status)],
    ["Degree", str(a.degree)],
    ["University", str(a.university)],
    ["Graduation", str(a.graduation_year)],
    ["GPA", str(a.gpa)],
    ["Experience", str(a.experience_years)],
    ["Job", [a.job_title, a.company].filter(Boolean).map(String).join(" at ")],
    ["Goal", str(a.career_goal)],
    ["Skills", skills(a.software_skills)],
    ["LinkedIn", str(a.linkedin_url)],
    ["Portfolio", str(a.portfolio_url)],
    ["Programs", programNames(a.programs).join(", ")],
    ["Format", str(a.format)],
    ["Schedule", str(a.schedule)],
    ["Start", str(a.start_pref)],
    ["Laptop", str(a.has_laptop)],
    ["Source", str(a.source)],
    ["Discount", discount],
    ["Proof file", a.proof_file_path ? "uploaded" : ""],
    ["CV file", a.cv_file_path ? "uploaded" : ""],
    ["Newsletter", a.newsletter ? "yes" : "no"],
    ["UTM", utm],
    ["Application", id],
  ];
}

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  if (req.method !== "POST") return fail("method not allowed", 405);

  const body = await readJson(req);
  if (!body.ok) return fail(body.error, 400);
  const parsed = validateSubmittedBody(body.value);
  if (!parsed.ok) return fail(parsed.error, 400);
  const id = parsed.value.application_id;

  const caller = await getCaller(req);
  if (!caller) return fail("sign in required", 401);

  const db = serviceClient();
  const { data: app, error } = await db.from("applications").select("*").eq("id", id).maybeSingle();
  if (error) {
    console.error("load application failed", error.code ?? "", { id });
    return fail("could not load the application", 500);
  }
  if (!app) return fail("application not found", 404);
  if (app.user_id !== caller.id && !caller.isAdmin) return fail("not your application", 403);
  if (app.status !== "submitted") return fail("application is not submitted", 409);
  if (app.notified_at) return ok({ already: true });

  // Turnstile: record and drop the token.
  const verified = await verifyTurnstile(app.turnstile_token);
  const botCheck = verified === null ? "not configured" : verified ? "passed" : "failed";
  if (app.turnstile_token || verified !== null) {
    const { error: e } = await db.from("applications").update({ turnstile_ok: verified, turnstile_token: null }).eq("id", id);
    if (e) console.error("record turnstile failed", e.code ?? "", { id });
  }

  const to = str(app.email) || caller.email || "";
  const programs = programNames(app.programs);
  const student = applicationReceived({
    firstName: firstName(app.full_name),
    programs,
    discountType: str(app.discount_type),
    discountPercent: Number(app.discount_percent ?? 0),
    accountUrl: siteUrl("/account/"),
  });
  const admin = adminNewApplication({
    name: str(app.full_name),
    programs,
    rows: adminRows(app, id),
    botCheck,
    adminUrl: siteUrl(`/admin/application/?id=${encodeURIComponent(id)}`),
  });

  const sentStudent = await sendEmail({ to, subject: student.subject, html: student.html, text: student.text, replyTo: adminEmail() || undefined });
  const sentAdmin = adminEmail() ? await sendEmail({ to: adminEmail(), subject: admin.subject, html: admin.html, text: admin.text, replyTo: to || undefined }) : false;

  const { error: stamp } = await db.from("applications").update({ notified_at: new Date().toISOString() }).eq("id", id);
  if (stamp) console.error("stamp notified_at failed", stamp.code ?? "", { id });

  console.log("application notified", { id, student: sentStudent, admin: sentAdmin, botCheck });
  return ok({ student: sentStudent, admin: sentAdmin });
});
