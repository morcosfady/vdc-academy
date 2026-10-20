// Edge Function `on-status-changed`. The admin page calls it after it updates an application's status:
// supabase.functions.invoke("on-status-changed", { body: { application_id, to_status } }).
//
// 1. The caller must be signed in and an admin (is_admin(), the same check RLS uses).
// 2. Load the application with the service role. `to_status` must match the row, so a stale call never sends
//    the wrong email. Drafts are not emailable.
// 3. Email the student a short, calm message for the new status with a link to the dashboard, then stamp
//    applications.status_notified_at (migration 0004).
//
// Secrets: RESEND_API_KEY, EMAIL_FROM, ADMIN_NOTIFY_EMAIL (reply-to), SITE_URL.
// Returns JSON { ok: true } or { ok: false, error }. Logs never contain personal data.
import { fail, ok, preflight } from "../_shared/cors.ts";
import { adminEmail, getCaller, serviceClient, siteUrl } from "../_shared/clients.ts";
import { statusChanged } from "../_shared/email.ts";
import { sendEmail } from "../_shared/resend.ts";
import { firstName, programNames, readJson, str, validateStatusBody } from "../_shared/validate.ts";

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  if (req.method !== "POST") return fail("method not allowed", 405);

  const body = await readJson(req);
  if (!body.ok) return fail(body.error, 400);
  const parsed = validateStatusBody(body.value);
  if (!parsed.ok) return fail(parsed.error, 400);
  const { application_id: id, to_status } = parsed.value;

  const caller = await getCaller(req);
  if (!caller) return fail("sign in required", 401);
  if (!caller.isAdmin) return fail("admin only", 403);

  const db = serviceClient();
  const { data: app, error } = await db
    .from("applications")
    .select("id, user_id, status, full_name, email, programs")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    console.error("load application failed", error.code ?? "", { id });
    return fail("could not load the application", 500);
  }
  if (!app) return fail("application not found", 404);
  if (app.status !== to_status) return fail("to_status does not match the application", 409);

  // The student's address: the application first, then the profile.
  let to = str(app.email);
  if (!to && app.user_id) {
    const { data: profile } = await db.from("profiles").select("email, full_name").eq("id", app.user_id).maybeSingle();
    to = str(profile?.email);
  }
  if (!to) return fail("the student has no email address", 422);

  const mail = statusChanged(to_status, {
    firstName: firstName(app.full_name),
    programs: programNames(app.programs),
    accountUrl: siteUrl("/account/"),
  });
  const sent = await sendEmail({ to, subject: mail.subject, html: mail.html, text: mail.text, replyTo: adminEmail() || undefined });

  const { error: stamp } = await db.from("applications").update({ status_notified_at: new Date().toISOString() }).eq("id", id);
  if (stamp) console.error("stamp status_notified_at failed", stamp.code ?? "", { id });

  console.log("status notified", { id, to_status, sent });
  return ok({ sent });
});
