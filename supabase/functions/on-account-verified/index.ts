// Edge Function `on-account-verified`. The auth callback page calls it once per page load, right after the
// confirmation link signs the user in: supabase.functions.invoke("on-account-verified"). No body.
// The browser ignores the answer and never waits more than 3 seconds for it.
//
// 1. The caller must be signed in (JWT, auth.getUser()). The auth user is read with the service role and its email
//    must be confirmed.
// 2. Load the profile with the service role. If welcome_sent_at is empty, claim it (a conditional update, so two
//    tabs never send twice) and send the welcome email for the role: student, recruiter (under review) or academy
//    team (admin, super_admin). If the send fails, the claim is released so a later call can retry.
// 3. A recruiter also triggers one email to ADMIN_NOTIFY_EMAIL ("New recruiter to review"), claimed the same way
//    with recruiter_alert_sent_at (migration 0006).
//
// Secrets: RESEND_API_KEY, EMAIL_FROM, ADMIN_NOTIFY_EMAIL, SITE_URL.
// Returns JSON { ok: true, welcome, alert } or { ok: false, error }. Logs never contain names or emails.
import { fail, ok, preflight } from "../_shared/cors.ts";
import { adminEmail, getCaller, serviceClient, siteUrl } from "../_shared/clients.ts";
import {
  adminNewRecruiter,
  COMPANY_SIZE_LABEL,
  COMPANY_TYPE_LABEL,
  EXPECTED_HIRES_LABEL,
  HIRING_ROLE_LABEL,
  labelOf,
  type Email,
  type Row,
  welcomeRecruiter,
  welcomeStudent,
  welcomeTeam,
} from "../_shared/email.ts";
import { sendEmail } from "../_shared/resend.ts";
import { firstName, str } from "../_shared/validate.ts";

type Kind = "student" | "recruiter" | "team";
type Outcome = "sent" | "failed" | "already" | "skipped";

// The same order as lib/roles.ts: team first, then recruiter, everyone else is a student.
function kindOf(p: { role: unknown; account_type: unknown }): Kind {
  if (p.role === "admin" || p.role === "super_admin") return "team";
  if (p.role === "recruiter" || p.account_type === "recruiter") return "recruiter";
  return "student";
}

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  if (req.method !== "POST") return fail("method not allowed", 405);

  const caller = await getCaller(req);
  if (!caller) return fail("sign in required", 401);
  const id = caller.id;

  const db = serviceClient();
  const { data: auth, error: authError } = await db.auth.admin.getUserById(id);
  if (authError || !auth?.user) {
    console.error("load auth user failed", authError?.status ?? "", { id });
    return fail("could not load the account", 500);
  }
  const to = str(auth.user.email);
  if (!auth.user.email_confirmed_at || !to) return fail("the email is not confirmed yet", 409);

  const { data: profile, error } = await db
    .from("profiles")
    .select("id, full_name, role, account_type, onboarding_complete, welcome_sent_at, recruiter_alert_sent_at")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    console.error("load profile failed", error.code ?? "", { id });
    return fail("could not load the profile", 500);
  }
  if (!profile) return fail("profile not found", 404);

  const kind = kindOf(profile);
  const first = firstName(profile.full_name);

  let company: Record<string, unknown> | null = null;
  if (kind === "recruiter") {
    const { data: r, error: rError } = await db
      .from("recruiter_profiles")
      .select("job_title, company_name, company_website, company_type, company_size, linkedin_url, hiring_roles, expected_hires, verification_status")
      .eq("id", id)
      .maybeSingle();
    if (rError) console.error("load recruiter profile failed", rError.code ?? "", { id });
    company = r ?? null;
  }
  const companyName = str(company?.company_name);

  // Claim a stamp column (only while it is empty), send, and release the claim if the send failed.
  async function once(column: "welcome_sent_at" | "recruiter_alert_sent_at", mail: Email, recipient: string, replyTo?: string): Promise<Outcome> {
    const { data: claimed, error: claimError } = await db
      .from("profiles")
      .update({ [column]: new Date().toISOString() })
      .eq("id", id)
      .is(column, null)
      .select("id");
    if (claimError) {
      console.error(`claim ${column} failed`, claimError.code ?? "", { id });
      return "failed";
    }
    if (!claimed || claimed.length === 0) return "already";
    const sent = await sendEmail({ to: recipient, subject: mail.subject, html: mail.html, text: mail.text, replyTo });
    if (!sent) {
      const { error: release } = await db.from("profiles").update({ [column]: null }).eq("id", id);
      if (release) console.error(`release ${column} failed`, release.code ?? "", { id });
      return "failed";
    }
    return "sent";
  }

  // 1. The welcome email.
  let welcome: Outcome = "already";
  if (!profile.welcome_sent_at) {
    const mail =
      kind === "team"
        ? welcomeTeam({ firstName: first, adminUrl: siteUrl("/admin/") })
        : kind === "recruiter"
          ? welcomeRecruiter({ firstName: first, company: companyName, accountUrl: siteUrl("/account/") })
          : welcomeStudent({ firstName: first, programsUrl: siteUrl("/programs/"), applyUrl: siteUrl("/apply/"), accountUrl: siteUrl("/account/") });
    welcome = await once("welcome_sent_at", mail, to, adminEmail() || undefined);
  }

  // 2. The team alert for a new recruiter.
  let alert: Outcome = "skipped";
  if (kind === "recruiter") {
    const admin = adminEmail();
    if (profile.recruiter_alert_sent_at) alert = "already";
    else if (!admin) console.warn("recruiter alert skipped: ADMIN_NOTIFY_EMAIL is missing", { id });
    else {
      const roles = Array.isArray(company?.hiring_roles) ? (company?.hiring_roles as unknown[]).map((r) => labelOf(HIRING_ROLE_LABEL, r)).join(", ") : "";
      const rows: Row[] = [
        ["Company", companyName],
        ["Name", str(profile.full_name)],
        ["Job title", str(company?.job_title)],
        ["Email", to],
        ["Type", labelOf(COMPANY_TYPE_LABEL, company?.company_type)],
        ["Size", labelOf(COMPANY_SIZE_LABEL, company?.company_size)],
        ["Website", str(company?.company_website)],
        ["LinkedIn", str(company?.linkedin_url)],
        ["Hires for", roles],
        ["Expected hires", labelOf(EXPECTED_HIRES_LABEL, company?.expected_hires)],
        ["Profile", profile.onboarding_complete ? "complete" : "incomplete (finishing onboarding)"],
        ["Account", id],
      ];
      const mail = adminNewRecruiter({ company: companyName, name: str(profile.full_name), rows, adminUrl: siteUrl("/admin/recruiters/") });
      alert = await once("recruiter_alert_sent_at", mail, admin, to);
    }
  }

  console.log("account verified", { id, kind, welcome, alert });
  return ok({ welcome, alert });
});
