// Edge Function `on-evaluation-published`. The admin evaluations page calls it after it publishes an evaluation:
// supabase.functions.invoke("on-evaluation-published", { body: { evaluation_id } }). Failures are ignored by the page.
//
// 1. The caller must be signed in and an admin (is_admin(), the same check RLS uses).
// 2. Load the evaluation with the service role. It must be 'published' and not emailed yet (notified_at is empty).
// 3. Claim notified_at with a conditional update (a double click sends once), then email the student. A failed send
//    releases the claim so a retry can send.
//
// The email says only that a recruiter evaluated the student's work and links to the dashboard. It names no company and
// shows no scores, and it never contains the private note: the evaluation itself is read on the dashboard.
//
// Secrets: RESEND_API_KEY, EMAIL_FROM, ADMIN_NOTIFY_EMAIL (reply-to), SITE_URL.
// Returns JSON { ok: true, sent } or { ok: false, error }. Logs never contain names or emails.
import { fail, ok, preflight } from "../_shared/cors.ts";
import { adminEmail, getCaller, serviceClient, siteUrl } from "../_shared/clients.ts";
import { evaluationPublished } from "../_shared/email.ts";
import { sendEmail } from "../_shared/resend.ts";
import { firstName, readJson, str, validateEvaluationBody } from "../_shared/validate.ts";

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  if (req.method !== "POST") return fail("method not allowed", 405);

  const body = await readJson(req);
  if (!body.ok) return fail(body.error, 400);
  const parsed = validateEvaluationBody(body.value);
  if (!parsed.ok) return fail(parsed.error, 400);
  const { evaluation_id: id } = parsed.value;

  const caller = await getCaller(req);
  if (!caller) return fail("sign in required", 401);
  if (!caller.isAdmin) return fail("admin only", 403);

  const db = serviceClient();
  const { data: row, error } = await db.from("student_evaluations").select("id, student_id, status, notified_at").eq("id", id).maybeSingle();
  if (error) {
    console.error("load evaluation failed", error.code ?? "", { id });
    return fail("could not load the evaluation", 500);
  }
  if (!row) return fail("evaluation not found", 404);
  if (row.status !== "published") return fail("only a published evaluation is emailed", 409);
  if (row.notified_at) return fail("this evaluation was already emailed", 409);

  // The student's address: the auth user first (always confirmed by now), then the profile.
  const { data: profile } = await db.from("profiles").select("email, full_name").eq("id", row.student_id).maybeSingle();
  const { data: auth } = await db.auth.admin.getUserById(row.student_id);
  const to = str(auth?.user?.email) || str(profile?.email);
  if (!to) return fail("the student has no email address", 422);

  // Claim: only while notified_at is still empty and the evaluation is still published.
  const { data: claimed, error: claimError } = await db
    .from("student_evaluations")
    .update({ notified_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "published")
    .is("notified_at", null)
    .select("id");
  if (claimError) {
    console.error("claim notified_at failed", claimError.code ?? "", { id });
    return fail("could not update the evaluation", 500);
  }
  if (!claimed || claimed.length === 0) return fail("this evaluation was already emailed", 409);

  const mail = evaluationPublished({ firstName: firstName(profile?.full_name), accountUrl: siteUrl("/account/#evaluations") });
  const sent = await sendEmail({ to, subject: mail.subject, html: mail.html, text: mail.text, replyTo: adminEmail() || undefined });

  if (!sent) {
    const { error: release } = await db.from("student_evaluations").update({ notified_at: null }).eq("id", id);
    if (release) console.error("release notified_at failed", release.code ?? "", { id });
  }

  console.log("evaluation published notice", { id, sent });
  return ok({ sent });
});
