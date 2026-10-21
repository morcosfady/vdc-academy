// Edge Function `on-recruiter-verified`. The admin recruiters page calls it after it approves or rejects a company
// account: supabase.functions.invoke("on-recruiter-verified", { body: { recruiter_id, status } }).
//
// 1. The caller must be signed in and an admin (is_admin(), the same check RLS uses).
// 2. Load the recruiter row with the service role. `status` must match verification_status (approved or
//    rejected), so a stale call never sends the wrong email, and this decision must not have been emailed yet:
//    verify_notified_at is empty or older than verified_at (a new decision after an earlier email is emailed again).
// 3. Claim verify_notified_at with a conditional update (a double click sends once), email the recruiter
//    (approved: a dashboard link; rejected: the admin's note and a contact link). A failed send releases the claim.
//
// Secrets: RESEND_API_KEY, EMAIL_FROM, ADMIN_NOTIFY_EMAIL (reply-to), SITE_URL.
// Returns JSON { ok: true, sent } or { ok: false, error }. Logs never contain names or emails.
import { fail, ok, preflight } from "../_shared/cors.ts";
import { adminEmail, getCaller, serviceClient, siteUrl } from "../_shared/clients.ts";
import { recruiterApproved, recruiterRejected } from "../_shared/email.ts";
import { sendEmail } from "../_shared/resend.ts";
import { firstName, readJson, str, validateRecruiterVerifiedBody } from "../_shared/validate.ts";

const time = (v: unknown) => (v ? Date.parse(String(v)) : NaN);

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  if (req.method !== "POST") return fail("method not allowed", 405);

  const body = await readJson(req);
  if (!body.ok) return fail(body.error, 400);
  const parsed = validateRecruiterVerifiedBody(body.value);
  if (!parsed.ok) return fail(parsed.error, 400);
  const { recruiter_id: id, status } = parsed.value;

  const caller = await getCaller(req);
  if (!caller) return fail("sign in required", 401);
  if (!caller.isAdmin) return fail("admin only", 403);

  const db = serviceClient();
  const { data: rec, error } = await db
    .from("recruiter_profiles")
    .select("id, company_name, verification_status, rejection_note, verified_at, verify_notified_at")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    console.error("load recruiter failed", error.code ?? "", { id });
    return fail("could not load the recruiter", 500);
  }
  if (!rec) return fail("recruiter not found", 404);
  if (rec.verification_status !== status) return fail("status does not match the recruiter", 409);

  const notified = rec.verify_notified_at ?? null;
  if (notified !== null && !(time(notified) < time(rec.verified_at))) return fail("this decision was already emailed", 409);

  // The recruiter's address: the auth user first (always confirmed by now), then the profile.
  const { data: profile } = await db.from("profiles").select("email, full_name").eq("id", id).maybeSingle();
  const { data: auth } = await db.auth.admin.getUserById(id);
  const to = str(auth?.user?.email) || str(profile?.email);
  if (!to) return fail("the recruiter has no email address", 422);

  // Claim: only while verify_notified_at still holds the value read above and the decision has not changed.
  let claim = db.from("recruiter_profiles").update({ verify_notified_at: new Date().toISOString() }).eq("id", id).eq("verification_status", status);
  claim = notified === null ? claim.is("verify_notified_at", null) : claim.eq("verify_notified_at", notified);
  const { data: claimed, error: claimError } = await claim.select("id");
  if (claimError) {
    console.error("claim verify_notified_at failed", claimError.code ?? "", { id });
    return fail("could not update the recruiter", 500);
  }
  if (!claimed || claimed.length === 0) return fail("this decision was already emailed", 409);

  const first = firstName(profile?.full_name);
  const mail =
    status === "approved"
      ? recruiterApproved({ firstName: first, company: str(rec.company_name), accountUrl: siteUrl("/account/") })
      : recruiterRejected({ firstName: first, note: str(rec.rejection_note).trim(), contactUrl: siteUrl("/contact/") });
  const sent = await sendEmail({ to, subject: mail.subject, html: mail.html, text: mail.text, replyTo: adminEmail() || undefined });

  if (!sent) {
    const { error: release } = await db.from("recruiter_profiles").update({ verify_notified_at: notified }).eq("id", id);
    if (release) console.error("release verify_notified_at failed", release.code ?? "", { id });
  }

  console.log("recruiter notified", { id, status, sent });
  return ok({ sent });
});
