# Go live: connect the real backend

A numbered runbook for the day the owner frees a Supabase slot. Claude runs every step marked **Claude** with the Supabase MCP, the Supabase CLI and `gh`; the steps marked **Owner** need a click only the owner can make. The click-by-click version of each step is in `docs/SETUP-SUPABASE.md`.

Never write keys, passwords or personal data in any file in this repo. Public build values (`NEXT_PUBLIC_*`) go in GitHub Actions secrets; server secrets go in Supabase Edge Function secrets.

## Status log

Update this table every time the runbook runs.

| Step | 2026-10-20 (v8) |
| --- | --- |
| 1 Project | **Blocked, needs owner.** Creation refused: the free plan allows 2 active projects per owner and `morcosfady` already has `pharaohs-bites` (org Pharaoh's Bites) and `kanisa-checkin` (org Kanisa) active. Tried through the MCP and the CLI. |
| 2 to 9 | Not started: they all need the project. |
| 10 | This table and `docs/HANDOFF.md` (v9). |

## Before you start (Owner)

1. **Free a Supabase slot.** Pause or delete one of the two active projects (Dashboard > the project > Project Settings > General > Pause project), or upgrade one organization to Pro. Pausing keeps the data; a paused free project can be restored later.
2. Tell Claude which organization should hold `vdc-academy` (today: "Pharaoh's Bites" or "Kanisa"; a new organization of its own is cleanest).
3. Have ready: a test email address you can open (for step 9), and, if possible, the Resend and Turnstile items from "Owner-only items" below.

## 1. Create the project (Claude)

- `vdc-academy`, region `us-east-1`, free plan, in the organization the owner named. A strong database password is generated and given only to the owner (never stored in the repo).
- If creation fails again with the 2-project limit: **stop** and tell the owner exactly that. Nothing else in this runbook can run without the project.
- Record the project ref (the part before `.supabase.co`) in the status log. The ref is not a secret.

## 2. Migrations and the RLS proof (Claude)

1. Apply in order, 0001 to 0007: `supabase/migrations/0001_init.sql`, `0002_hardening.sql`, `0003_accounts.sql`, `0004_notifications.sql`, `0005_roles_registration.sql` (roles, recruiters, hiring requests, the owner's role grant), `0006_emails.sql` (welcome and recruiter alert stamps), `0007_evaluations.sql` (student opt-in, talent list, evaluations by verified recruiters, the student-safe view) (MCP `apply_migration`, or `supabase link --project-ref <ref>` then `supabase db push`). All seven are re-runnable.
2. Run `supabase/tests/rls_accounts.sql` (MCP `execute_sql` or the SQL editor). Paste the PASS/FAIL summary into `docs/HANDOFF.md`. **Every check must PASS (at least 50)**; a FAIL stops the runbook until it is fixed with a new migration. The same proof already runs in CI on every push to `main` that touches `supabase/**` (`.github/workflows/db-tests.yml`: a local Supabase stack, every migration applied twice, fails on any FAIL), so a live FAIL means the live project differs from a fresh stack.
3. `list_tables` and confirm: `profiles`, `recruiter_profiles`, `hiring_requests`, `student_evaluations`, `role_grants`, `applications`, `application_events`, `account_deletion_requests`, `leads`, `contact_messages`, `newsletter_subscribers`, `admin_emails`, all with RLS on.

## 3. Advisors (Claude)

- Run the security and performance advisors (MCP `get_advisors`, types `security` and `performance`).
- Fix anything critical or high with a new migration `0008_*.sql` (committed), for example a missing `search_path` on a function or an unindexed foreign key. Note warnings that are accepted, with the reason, in the handoff.

## 4. Auth settings (Claude where the API allows, else Owner)

- Site URL: the value of `NEXT_PUBLIC_SITE_URL` (`https://morcosfady.github.io/vdc-academy` today).
- Redirect URLs: `<site>/auth/callback/`, `<site>/account/reset-password/`, `<site>/apply/`, `http://localhost:3000/auth/callback/`, `http://localhost:3000/account/reset-password/`.
- Email templates from `supabase/templates/` (confirm signup, magic link, reset password) with the subjects listed in `docs/SETUP-SUPABASE.md` step 3.
- Email confirmation **on**, secure email change on, minimum password length **8**.
- Rate limits: keep the defaults for sign-in and token refresh; email sending is limited by the built-in mailer (about 3 per hour) until custom SMTP with Resend is set (step 6). Turn on CAPTCHA protection with the Turnstile secret once it exists.
- The CLI can push these from `supabase/config.toml` (`supabase config push`) if the `[auth]` section is added; otherwise the owner clicks them in **Authentication > URL Configuration / Providers / Email Templates** (about 4 minutes).

## 5. Storage (Claude)

- Buckets `documents` (5 MB, `application/pdf`, `image/jpeg`, `image/png`) and `avatars` (2 MB, `image/jpeg`, `image/png`, `image/webp`) exist and are **private**. Migration 0003 creates them; check with `select id, public, file_size_limit, allowed_mime_types from storage.buckets;` and create any missing one in the dashboard, then rerun 0003.

## 6. Edge Functions and secrets (Claude, values from the Owner)

```bash
supabase link --project-ref <ref>
supabase functions deploy on-application-submitted on-status-changed notify-lead on-account-verified on-recruiter-verified on-evaluation-published
supabase secrets set RESEND_API_KEY=... EMAIL_FROM="VDC Academy <...>" ADMIN_NOTIFY_EMAIL=thefadys99@gmail.com TURNSTILE_SECRET_KEY=... SITE_URL=https://morcosfady.github.io/vdc-academy
```

- **Client email: `thefadys99@gmail.com`** (confirmed by the owner 2026-10-29). It is both the super admin (granted in migration 0005) and `ADMIN_NOTIFY_EMAIL`, so every "new application / lead / recruiter" email goes there. Create the Resend account with this address too, so the test sender can reach it before a domain is verified.
- `RESEND_API_KEY` and `EMAIL_FROM` come from the owner (Resend, below). Until a domain is verified, use `EMAIL_FROM="VDC Academy <onboarding@resend.dev>"`: Resend's test sender delivers **only to the Resend account owner's own address**, so `ADMIN_NOTIFY_EMAIL` and the step 9 test email must be that address.
- Six functions: the three from v7, `on-account-verified` and `on-recruiter-verified` (v9 account emails) and `on-evaluation-published` (tells a student an evaluation was published, see "Emails" below). All six use the same secrets; `ADMIN_NOTIFY_EMAIL` also receives the "New recruiter to review" email.
- `TURNSTILE_SECRET_KEY` can wait; without it the functions skip the bot check and record "not configured".
- Typed into the terminal by the owner or set in **Edge Functions > Secrets**. Never pasted into a file or a commit.

## 7. GitHub Actions secrets and one push (Claude)

```bash
gh secret set NEXT_PUBLIC_SUPABASE_URL -R morcosfady/vdc-academy        # https://<ref>.supabase.co
gh secret set NEXT_PUBLIC_SUPABASE_ANON_KEY -R morcosfady/vdc-academy   # the anon / publishable key (public by design)
gh secret set NEXT_PUBLIC_TURNSTILE_SITE_KEY -R morcosfady/vdc-academy  # when the owner has it
gh secret set NEXT_PUBLIC_SITE_URL -R morcosfady/vdc-academy            # https://morcosfady.github.io/vdc-academy
```

- Values are read from the MCP (`get_project_url`, `get_publishable_keys`) and piped to `gh secret set` without printing them.
- Push to `main` (or `gh workflow run "Deploy to GitHub Pages"`), wait for the green check (`gh run watch`).
- Confirm the deployed bundle contains the project URL: `curl -s https://morcosfady.github.io/vdc-academy/login/ | grep -o '_next/static/chunks/[^"]*\.js' | head -40` and grep those chunks for `<ref>.supabase.co`. The header must now show **Log in** and `/apply/` must show the account gate instead of "Applications open soon".

## 8. The owner becomes super admin (Owner)

1. Owner: on the live site, **Sign up** with `thefadys99@gmail.com`, the email granted in `role_grants` (migration 0005; the site code never contains it), using the "Academy team account" path (name and phone only).
2. Owner: open the confirmation email and click the link. The `apply_role_grant` trigger makes the account `super_admin` the moment the email is confirmed; no SQL needed. The welcome email that follows is the "team access is active" one.
3. Owner: the account menu shows **Admin**. Claude can confirm with `select id, onboarding_complete from public.profiles where role = 'super_admin';` (one row).

Fallback for colleagues (no grant): they sign up and confirm, then Claude runs (there is no promote button on the site yet; it is the first planned super-admin-only screen, `manage_admins` in `lib/roles.ts`) `update public.profiles set role = 'admin' where id = (select id from auth.users where email = '<colleague email>');` through `execute_sql` (the email is typed in the session, never written to a file). They sign out and in to see **Admin**.

## 9. Live smoke test (Claude drives, Owner opens the inbox)

With a test email the owner provides:

1. Sign up on the live site as a student, open the confirmation email (it greets the test name), land on the dashboard. Inbox: "Welcome to VDC Academy"; the profile row has `welcome_sent_at` set.
2. Log out, log in with the password.
3. Apply: five steps, a small test PDF as discount proof, submit. Dashboard shows **Submitted**.
4. Inbox: "We received your VDC Academy application"; admin inbox: "New application: ...".
5. As admin: `/admin/`, open the application, verify the discount, change the status to **Under review**.
6. Inbox: the status email. Student dashboard: the timeline step.
7. Recruiter: sign up a second test address as a recruiter and confirm. Its inbox: "Your VDC Academy company account is under review"; admin inbox: "New recruiter to review: ...". As admin, approve it in `/admin/recruiters/`: its inbox gets "Your company account is verified" and `recruiter_profiles.verify_notified_at` is set. With the Resend test sender only the Resend owner's inbox receives mail, so run this sub-step after the domain is verified.
8. Clean up: delete the test user in **Authentication > Users** (rows and files cascade) or with `delete from auth.users where email = '<test email>';`, then check `storage.objects` has nothing left under that user id.

Record each sub-step as done or failed in the status log, with the function log line for any failure (ids and status codes only).

## 10. Write it down (Claude)

Update the status log above and `docs/HANDOFF.md`: done, blocked or needs owner for every step. No keys, passwords or personal data.

## Emails

Every email the site sends. The Auth emails come from Supabase (built-in mailer, or Resend SMTP once set); all others go through Resend from an Edge Function, each stamped once on its row so a retry never sends twice. Templates: `supabase/templates/` (Auth) and `supabase/functions/_shared/email.ts` (functions).

| Email | Trigger | Sent by | To |
| --- | --- | --- | --- |
| Confirm your VDC Academy account | sign-up | Supabase Auth (`confirm-signup.html`) | the new user |
| Your VDC Academy sign-in link | magic link request | Supabase Auth (`magic-link.html`) | the user |
| Reset your VDC Academy password | forgot password | Supabase Auth (`reset-password.html`) | the user |
| Welcome to VDC Academy | first landing on `/auth/callback/` with a confirmed email, student | `on-account-verified` (`welcome_sent_at`) | the student |
| Your VDC Academy company account is under review | the same, recruiter | `on-account-verified` (`welcome_sent_at`) | the recruiter |
| Your VDC Academy team access is active | the same, admin or super admin | `on-account-verified` (`welcome_sent_at`) | the team member |
| New recruiter to review: company | the same, recruiter | `on-account-verified` (`recruiter_alert_sent_at`) | `ADMIN_NOTIFY_EMAIL` |
| Your company account is verified | an admin approves a recruiter | `on-recruiter-verified` (`verify_notified_at`) | the recruiter |
| About your VDC Academy company account | an admin rejects a recruiter (includes the rejection note) | `on-recruiter-verified` (`verify_notified_at`) | the recruiter |
| We received your VDC Academy application | a student submits | `on-application-submitted` (`notified_at`) | the student |
| New application: name (program) | the same | `on-application-submitted` (`notified_at`) | `ADMIN_NOTIFY_EMAIL` |
| Status email (one per status) | an admin changes an application status | `on-status-changed` (`status_notified_at`) | the student |
| A recruiter evaluated your work | an admin publishes an evaluation (it names no company and shows no scores) | `on-evaluation-published` (`student_evaluations.notified_at`) | the student |
| New lead / Contact message from name | a lead form or the contact form | `notify-lead` (`notified_at`) | `ADMIN_NOTIFY_EMAIL` |

## Owner-only items

- [ ] **Free a Supabase slot**: pause or delete one of `pharaohs-bites` / `kanisa-checkin`, or upgrade an organization to Pro. This is the only blocker for steps 1 to 9.
- [ ] **Resend**: create an account and verify a sending domain the academy controls, ideally the client's (`academy.baybimdesigns.com` or `baybimdesigns.com`). That needs DNS access from the client (three records: SPF/MX on a `send.` subdomain and a DKIM TXT). Until then the temporary option is `onboarding@resend.dev`, which only delivers to the Resend account owner's own inbox: fine for the smoke test, not for students.
- [ ] **Cloudflare Turnstile**: a widget for `morcosfady.github.io` (plus the custom domain later, and `localhost`), mode Managed. Site key goes to GitHub (step 7), secret key to Supabase (step 6).
- [ ] Optional: **Google OAuth** client ID and secret for "Continue with Google" (Google Cloud console, authorized redirect `https://<ref>.supabase.co/auth/v1/callback`), then `NEXT_PUBLIC_AUTH_GOOGLE=1` in GitHub.
- [ ] Two test email addresses for step 9 (a student and a recruiter), and access to the owner inbox for step 8.
