# Connect the accounts: Supabase, Resend, Turnstile, GitHub Pages

About 20 minutes of clicking. When you finish: students sign up and confirm their email, save drafts, submit applications, upload documents and follow their status; you review everything in `/admin` and every status change sends a branded email. Until then the site still works: forms show, and on submit they say "Applications open soon" and take an email instead.

Have these open in tabs: the Supabase dashboard, the Resend dashboard, the Cloudflare dashboard, and this repo on GitHub.

What runs where:

- **Supabase**: the database (Postgres with Row Level Security), authentication, two private file buckets and five Edge Functions (`supabase/functions/`).
- **Resend**: sends the application and status emails on your behalf.
- **Cloudflare Turnstile**: the bot check on the forms.
- **GitHub Pages**: hosts the static site. The build bakes in the public keys only.

## 1. Create the Supabase project (3 min)

The free plan allows **2 active projects per account**, and the `morcosfady` account is at that limit.

1. Open https://supabase.com/dashboard. Pick an unused project and pause it: open it, **Project Settings > General > Pause project** (or **Delete project** if it is really gone). Or upgrade the organization to Pro.
2. Back on the dashboard, **New project**. Name `vdc-academy`, region **East US (North Virginia)** (`us-east-1`), set a strong database password and save it in your password manager. Free plan.
3. Wait for provisioning (about 1 minute).
4. **Project Settings > API**. Copy for step 8:
   - **Project URL**, like `https://abcdefghijklmnop.supabase.co`. The part before `.supabase.co` is your **project ref**.
   - **anon public** key. Safe in the browser: Row Level Security decides what it may read.
   - Never copy the **service_role** key anywhere outside Supabase. The Edge Functions receive it automatically.

## 2. Run the migrations (3 min)

**SQL Editor > New query**. Paste one file at a time, in this order, and click **Run** after each. Each should end with "Success. No rows returned".

1. `supabase/migrations/0001_init.sql` (tables, the first policies, the old `applications` bucket)
2. `supabase/migrations/0002_hardening.sql` (fixes and guards)
3. `supabase/migrations/0003_accounts.sql` (profiles, the status pipeline, events, deletion requests, the `documents` and `avatars` buckets, Row Level Security for accounts)
4. `supabase/migrations/0004_notifications.sql` (email bookkeeping for the functions, admin bootstrap fix)
5. `supabase/migrations/0005_roles_registration.sql` (roles student, recruiter, admin, super admin; recruiter company profiles and hiring requests; the owner's super admin grant in `role_grants`)
6. `supabase/migrations/0006_emails.sql` (when the welcome email and the new recruiter alert went out; the browser can never write these)

All six are safe to run twice. CLI alternative, if you install it in step 6 first: `supabase db push`.

What you have now: `profiles` (one row per user, with `account_type` student or recruiter and `role` student, recruiter, admin or super_admin), `recruiter_profiles` (company details and the verification status), `hiring_requests`, `applications` (owned by a user, `draft` to `enrolled`), `application_events` (the student's timeline), `account_deletion_requests`, `leads`, `contact_messages`, `newsletter_subscribers`. Students only ever see their own rows; admins see everything. The old `admin_emails` table still works as a fallback.

## 3. Authentication (4 min)

### URL configuration

**Authentication > URL Configuration**:

- **Site URL**: `https://morcosfady.github.io/vdc-academy`
- **Redirect URLs**, add each one with **Add URL**:
  - `https://morcosfady.github.io/vdc-academy/auth/callback/`
  - `https://morcosfady.github.io/vdc-academy/account/reset-password/`
  - `https://morcosfady.github.io/vdc-academy/apply/`
  - `http://localhost:3000/auth/callback/`
  - `http://localhost:3000/account/reset-password/`

When you move to a custom domain, add the same three paths under the new domain and change Site URL.

### Providers

**Authentication > Providers**:

- **Email**: enabled. **Confirm email** on. Leave **Secure email change** on. Minimum password length 8 is fine.
- **Google** (optional, recommended): toggle on. You need a Google OAuth client:
  1. https://console.cloud.google.com > a project > **APIs and Services > Credentials > Create credentials > OAuth client ID**, type **Web application**.
  2. Authorized JavaScript origins: `https://morcosfady.github.io`. Authorized redirect URI: the **Callback URL** shown in the Supabase Google provider panel (`https://<project-ref>.supabase.co/auth/v1/callback`).
  3. Paste the Google **Client ID** and **Client secret** into the Supabase panel, **Save**.
  4. The site shows the Google button only when the build has `NEXT_PUBLIC_AUTH_GOOGLE=1` (step 8).
- **LinkedIn (OIDC)**: a later option, same pattern (an app at https://www.linkedin.com/developers, the "Sign In with LinkedIn using OpenID Connect" product, client ID and secret into Supabase). The site has no button for it yet.

### Email templates

**Authentication > Email Templates**. For each of the three, paste the file content into the **Message body** (source view), set the subject, **Save**:

| Template | Subject | File |
| --- | --- | --- |
| Confirm signup | `Confirm your VDC Academy account` | `supabase/templates/confirm-signup.html` |
| Magic Link | `Your VDC Academy sign-in link` | `supabase/templates/magic-link.html` |
| Reset Password | `Reset your VDC Academy password` | `supabase/templates/reset-password.html` |

They use `{{ .ConfirmationURL }}`; the confirm signup email also greets the user by the name from the sign-up form (`{{ .Data.full_name }}`) and reads "Welcome to VDC Academy." when there is none. Leave "Change Email Address" and "Invite user" on the defaults for now.

Supabase's built-in mailer is limited to about 3 emails per hour and is meant for testing. For real traffic, **Project Settings > Authentication > SMTP Settings**: enable custom SMTP with Resend (host `smtp.resend.com`, port `465`, user `resend`, password = your Resend API key from step 5, sender = your from address). Do this after step 5.

## 4. Storage (1 min)

**Storage** in the left menu should show three buckets, all **Private**: `documents` (CVs and discount proofs, 5 MB, PDF/JPG/PNG), `avatars` (profile photos, 2 MB, JPG/PNG/WebP) and the older `applications`. The migration created them. If `documents` or `avatars` is missing (some dashboards block SQL inserts into storage), click **New bucket**, create it with the same name, **Public** off, the size limit and MIME types above, then run `0003_accounts.sql` again (it only updates what exists).

Files land in `<user id>/<random uuid>.<ext>`. A student can read only their own folder; admins read everything through short-lived signed links.

## 5. Resend for email (3 min)

1. https://resend.com, create an account. **Domains > Add domain**, add your sending domain (for example `baybimdesigns.com` or `academy.baybimdesigns.com`) and add the DNS records it shows at your DNS host. Verification takes a few minutes. Until it is verified you can only send to your own address; use `onboarding@resend.dev` as the from address for a first test.
2. **API Keys > Create API key**, permission **Sending access**. Copy it (`re_...`), you need it in step 6.
3. Decide the from address, for example `VDC Academy <hello@baybimdesigns.com>`.

## 6. Edge Functions (4 min)

Five functions run inside Supabase. The browser calls them with the signed-in user's token (or the anon key for public forms):

| Function | Called when | Does |
| --- | --- | --- |
| `on-application-submitted` | a student submits | checks the application belongs to the caller, verifies the Turnstile token, emails the student a confirmation and you a summary with an admin link, once per application |
| `on-status-changed` | you change a status in `/admin` | admin only; emails the student a short message for the new status with a dashboard link |
| `notify-lead` | a visitor sends a lead or a contact message | rate limited; verifies Turnstile; emails you a summary, once per row |
| `on-account-verified` | the confirmation link lands on `/auth/callback/` | email must be confirmed; sends the welcome email for the role (student, recruiter under review, or team access) once per account; for a recruiter also emails you "New recruiter to review" once |
| `on-recruiter-verified` | you approve or reject a recruiter in `/admin/recruiters/` | admin only; emails the recruiter "verified" or the rejection with your note and a contact link, once per decision |

The email templates are plain TypeScript functions (`supabase/functions/_shared/email.ts`), not React Email: the static repo has no build step for the functions, and plain functions deploy as they are.

Install the CLI once and deploy:

```bash
npm i -g supabase            # or: brew install supabase/tap/supabase, or scoop install supabase
supabase login               # opens the browser
supabase link --project-ref <your-project-ref>
supabase functions deploy on-application-submitted on-status-changed notify-lead on-account-verified on-recruiter-verified
```

Set the secrets (one command, or **Edge Functions > Secrets** in the dashboard):

```bash
supabase secrets set \
  RESEND_API_KEY=re_xxxxxxxxx \
  EMAIL_FROM="VDC Academy <hello@baybimdesigns.com>" \
  ADMIN_NOTIFY_EMAIL=you@example.com \
  TURNSTILE_SECRET_KEY=0x4AAAAAAA... \
  SITE_URL=https://morcosfady.github.io/vdc-academy
```

You can set `TURNSTILE_SECRET_KEY` after step 7; without it the functions do not check tokens and record "not configured". `SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically; do not set them.

Run the deploy command again after any change under `supabase/functions/`. Logs: **Edge Functions > (function) > Logs**. The logs contain ids and status codes, never names or emails.

## 7. Cloudflare Turnstile (2 min)

1. https://dash.cloudflare.com > **Turnstile > Add widget**.
2. Widget name `VDC Academy`, hostnames `morcosfady.github.io` (add your custom domain too, and `localhost` for local testing). Widget mode **Managed**.
3. Copy the **Site key** (GitHub, step 8) and the **Secret key** (`TURNSTILE_SECRET_KEY`, step 6).

Without a site key the widget renders nothing and forms still submit; without a secret key the functions skip the check.

## 8. GitHub Actions secrets and push (2 min)

Repo on GitHub > **Settings > Secrets and variables > Actions > New repository secret**:

| Name | Value |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | the Project URL from step 1 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | the anon public key from step 1 |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | the Turnstile site key from step 7 |
| `NEXT_PUBLIC_SITE_URL` | `https://morcosfady.github.io/vdc-academy` (change once for a custom domain) |
| `NEXT_PUBLIC_AUTH_GOOGLE` | optional, `1` to show the Google button (step 3) |

Repository **Variables** with the same names work too; the workflow reads secrets first, then variables. These values are baked into the static build and are public by design. The secrets that matter stay in Supabase.

Push to `main` (or **Actions > Deploy to GitHub Pages > Run workflow**) and wait for the green check.

## 9. Sign up with the owner email, confirm, you are super admin (1 min)

1. Open https://morcosfady.github.io/vdc-academy/signup/ and **sign up** with the owner email (the one granted in `role_grants` by migration 0005), choosing the academy team account (name and phone only).
2. Click the link in the confirmation email. The moment the email is confirmed, the database makes the account **super admin**; no SQL needed. A "Your VDC Academy team access is active" email follows.
3. The account menu shows **Admin**.

Fallback for colleagues (their email has no grant): they sign up and confirm, then you promote them from the site, or run this in **SQL Editor > New query** with their address (the snippet from 0003):

```sql
update public.profiles set role = 'admin'
where id = (select id from auth.users where email = 'colleague@example.com');
```

They sign out and in again to see **Admin**. To remove an admin, set the role back to `'student'` (or `'recruiter'` for a recruiter account).

## 10. Test the whole flow (3 min)

1. In a private window: https://morcosfady.github.io/vdc-academy/account/ > **Create account** with a second address you control. Confirm from the email (branded, "Confirm your VDC Academy account"). A "Welcome to VDC Academy" email follows, and the profile row gets `welcome_sent_at`.
2. **Apply**: fill the five steps, pick last year as graduation year to see the fresh graduate discount, attach a small PDF as proof, submit. You land on the dashboard with status **Submitted**.
3. Within a minute: "We received your VDC Academy application" in the student inbox, "New application: ..." at `ADMIN_NOTIFY_EMAIL`.
4. Supabase > **Table Editor > applications**: one row, `status = submitted`, `notified_at` set, `turnstile_ok` true (or empty without a Turnstile secret), `turnstile_token` empty. **Storage > documents > <user id>/**: your PDF.
5. As admin: `/admin`, open the application, change the status to **Under review**. The student inbox gets "We are reviewing your application"; the row's `status_notified_at` is set; the student dashboard shows the step.
6. Send one contact message from `/contact`: a "Contact message from ..." email arrives; the row has `notified_at`.
7. Delete the test rows afterwards (Table Editor) or delete the test user in **Authentication > Users** (the rows and files cascade).

If no email arrives: **Edge Functions > (function) > Logs** shows the call and any Resend status. `401` means the user session was missing; `403` means the caller is not the owner or not an admin; `409` means the application is not `submitted`.

## Local testing without keys

- `?mock=1` on the apply page points writes at a fake server that Playwright intercepts (`tests/apply.spec.ts`). Nothing is sent anywhere.
- For a real local run: put `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY` and `NEXT_PUBLIC_SITE_URL=http://localhost:3000` in `.env.local` (gitignored), run `pnpm dev`. The two localhost redirect URLs from step 3 make sign-in work locally.
- Row Level Security check: paste `supabase/tests/rls_accounts.sql` into the SQL editor and run it. It creates three throwaway users, proves students see only their own rows and cannot promote themselves, prints PASS or FAIL per check (30 checks, including recruiters and roles) and cleans up. CI runs the same script on a local Supabase stack on every push to `main` that touches `supabase/**` (`.github/workflows/db-tests.yml`).

## Checklist

| Step | Done when |
| --- | --- |
| 1 Project | `vdc-academy` exists in `us-east-1`; Project URL and anon key copied |
| 2 Migrations | 0001 to 0006 ran without errors |
| 3 Auth | Site URL and five redirect URLs saved; Email provider with confirmation on; three email templates pasted; optional Google |
| 4 Storage | `documents` and `avatars` exist and are Private |
| 5 Resend | domain verified, API key created, from address chosen |
| 6 Functions | five functions deployed; five secrets set |
| 7 Turnstile | site key and secret key copied |
| 8 GitHub | four secrets set (five with Google); one push with a green check |
| 9 Super admin | signed up with the owner email and confirmed; your profile has `role = 'super_admin'`; the account menu shows Admin |
| 10 Test | sign-up, confirmation, application, both emails, a status change email, a contact email |

## What is not tested yet

- Nothing in this document has run against a live project yet: migrations, the five functions, Resend, Turnstile and Google sign-in are written and reviewed, not executed. Expect to fix small things on the first pass; the function logs say what.
- `supabase/tests/rls_accounts.sql` runs in CI on a fresh local stack, not yet on the live project. If the `auth.users` insert fails on your Postgres version, create the three users in the dashboard instead (the file explains how).
- Supabase's built-in mailer rate limit (about 3 per hour) will block sign-ups under any real load until custom SMTP is set (step 3, last paragraph).
- Turnstile tokens expire after five minutes. A student who takes longer than that on the apply form may be recorded as "failed" on the bot check. The account is email-confirmed, so this is a signal in your admin email, not a block.
- The function rate limit for `notify-lead` is per isolate and resets on cold starts. It stops accidental loops, not a determined attacker; Supabase's gateway limits sit in front of it.
- Account deletion is a request (`account_deletion_requests`); an admin still deletes the user in **Authentication > Users**, which cascades to their rows and files.
