// Edge Function `on-instructor-verified`. The admin instructors page calls it after it approves or rejects a teaching
// profile: supabase.functions.invoke("on-instructor-verified", { body: { instructor_id, status } }).
// It is a copy of on-recruiter-verified for the instructor_profiles table (migration 0008).
//
// 1. The caller must be signed in and an admin (is_admin(), the same check RLS uses).
// 2. Load the instructor row with the service role. `status` must match verification_status (approved or
//    rejected), so a stale call never sends the wrong email, and this decision must not have been emailed yet:
//    verify_notified_at is empty or older than verified_at (a new decision after an earlier email is emailed again).
// 3. Claim verify_notified_at with a conditional update (a double click sends once), email the instructor
//    (approved: a dashboard link; rejected: the admin's note and a contact link). A failed send releases the claim.
//
// Secrets: RESEND_API_KEY, EMAIL_FROM, ADMIN_NOTIFY_EMAIL (reply-to), SITE_URL.
// Returns JSON { ok: true, sent } or { ok: false, error }. Logs never contain names or emails.
import { fail, ok, preflight } from "../_shared/cors.ts";
import { adminEmail, getCaller, serviceClient, siteUrl } from "../_shared/clients.ts";
import { instructorApproved, instructorRejected } from "../_shared/email.ts";
import { sendEmail } from "../_shared/resend.ts";
import { firstName, readJson, str, validateInstructorVerifiedBody } from "../_shared/validate.ts";

const time = (v: unknown) => (v ? Date.parse(String(v)) : NaN);

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  if (req.method !== "POST") return fail("method not allowed", 405);

  const body = await readJson(req);
  if (!body.ok) return fail(body.error, 400);
  const parsed = validateInstructorVerifiedBody(body.value);
  if (!parsed.ok) return fail(parsed.error, 400);
  const { instructor_id: id, status } = parsed.value;

  const caller = await getCaller(req);
  if (!caller) return fail("sign in required", 401);
  if (!caller.isAdmin) return fail("admin only", 403);

  const db = serviceClient();
  const { data: row, error } = await db
    .from("instructor_profiles")
    .select("id, verification_status, rejection_note, verified_at, verify_notified_at")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    console.error("load instructor failed", error.code ?? "", { id });
    return fail("could not load the instructor", 500);
  }
  if (!row) return fail("instructor not found", 404);
  if (row.verification_status !== status) return fail("status does not match the instructor", 409);

  const notified = row.verify_notified_at ?? null;
  if (notified !== null && !(time(notified) < time(row.verified_at))) return fail("this decision was already emailed", 409);

  // The instructor's address: the auth user first (always confirmed by now), then the profile.
  const { data: profile } = await db.from("profiles").select("email, full_name").eq("id", id).maybeSingle();
  const { data: auth } = await db.auth.admin.getUserById(id);
  const to = str(auth?.user?.email) || str(profile?.email);
  if (!to) return fail("the instructor has no email address", 422);

  // Claim: only while verify_notified_at still holds the value read above and the decision has not changed.
  let claim = db.from("instructor_profiles").update({ verify_notified_at: new Date().toISOString() }).eq("id", id).eq("verification_status", status);
  claim = notified === null ? claim.is("verify_notified_at", null) : claim.eq("verify_notified_at", notified);
  const { data: claimed, error: claimError } = await claim.select("id");
  if (claimError) {
    console.error("claim verify_notified_at failed", claimError.code ?? "", { id });
    return fail("could not update the instructor", 500);
  }
  if (!claimed || claimed.length === 0) return fail("this decision was already emailed", 409);

  const first = firstName(profile?.full_name);
  const mail =
    status === "approved"
      ? instructorApproved({ firstName: first, accountUrl: siteUrl("/account/") })
      : instructorRejected({ firstName: first, note: str(row.rejection_note).trim(), contactUrl: siteUrl("/contact/") });
  const sent = await sendEmail({ to, subject: mail.subject, html: mail.html, text: mail.text, replyTo: adminEmail() || undefined });

  if (!sent) {
    const { error: release } = await db.from("instructor_profiles").update({ verify_notified_at: notified }).eq("id", id);
    if (release) console.error("release verify_notified_at failed", release.code ?? "", { id });
  }

  console.log("instructor notified", { id, status, sent });
  return ok({ sent });
});
