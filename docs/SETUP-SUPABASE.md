# Connect the forms: Supabase, Resend, Turnstile, GitHub Pages

About 20 minutes. When you finish, the apply form, the contact form and the "notify me" forms save rows and send emails. Until then the site still works: the form shows, and on submit it says "Applications open soon" and takes an email instead.

What you need open: the Supabase dashboard, the Resend dashboard, the Cloudflare dashboard, and this repo on GitHub.

## 1. Create the Supabase project (3 min)

1. Go to https://supabase.com/dashboard, click **New project**.
2. Name it `vdc-academy`, pick a region close to Texas (`us-east-1` is fine), set a database password and save it somewhere safe. Free plan is enough.
3. Wait for the project to finish provisioning (about 1 minute).
4. Open **Project Settings > API** and copy two values; you need them in step 7:
   - **Project URL**, looks like `https://abcdefghijklmnop.supabase.co`
   - **anon public** key (under "Project API keys"). This key is safe in the browser: Row Level Security limits it to INSERT only.
   - Never copy the **service_role** key anywhere outside Supabase.

## 2. Run the migrations (3 min)

Option A, SQL editor (no tools to install):

1. Open **SQL Editor > New query**.
2. Paste the whole content of `supabase/migrations/0001_init.sql`, click **Run**. You should see "Success. No rows returned".
3. New query, paste `supabase/migrations/0002_hardening.sql`, **Run**.

Option B, CLI (if you have the Supabase CLI installed):

```bash
supabase login
supabase link --project-ref <your-project-ref>   # the part before .supabase.co in the Project URL
supabase db push
```

What this created: tables `applications`, `leads`, `contact_messages`, `newsletter_subscribers`, `admin_emails`, `activity_log`; Row Level Security so the public can only insert; and a **private** storage bucket `applications` (5 MB per file, PDF/JPG/PNG/DOC/DOCX only) where CVs and discount proofs go under random names.

Check: **Storage** in the left menu should show a bucket named `applications` marked Private. If it is missing (some dashboards block SQL inserts into storage), click **New bucket**, name `applications`, leave **Public** off, set file size limit 5 MB, allowed MIME types `application/pdf, image/jpeg, image/png, application/msword, application/vnd.openxmlformats-officedocument.wordprocessingml.document`, then run `0002_hardening.sql` again (it is safe to repeat).

## 3. Make yourself an admin (1 min)

SQL Editor, new query, replace the address with the one you will log in with:

```sql
insert into public.admin_emails (email) values ('you@example.com');
```

Only emails in this table can read the rows or the uploaded files (through Supabase Auth, used by the future `/admin` page). You can always read everything in the dashboard's **Table Editor** regardless.

## 4. Resend for email (3 min)

1. https://resend.com, create an account, **Domains > Add domain**, add your sending domain and the DNS records it shows. Until the domain is verified you can only send to your own address (use `onboarding@resend.dev` as the from address for testing).
2. **API Keys > Create API key**, permission "Sending access". Copy the key (`re_...`). You need it in step 5.
3. Decide the from address, for example `VDC Academy <hello@your-domain.com>`.

## 5. Deploy the `notify` function and set its secrets (4 min)

The function runs inside Supabase. It verifies the Turnstile token, then emails the candidate and you. It needs the Supabase CLI once:

```bash
npm i -g supabase           # or: brew install supabase/tap/supabase
supabase login
supabase link --project-ref <your-project-ref>
supabase functions deploy notify --no-verify-jwt
```

`--no-verify-jwt` is required: the database webhook does not send a user token; the function checks its own secret instead.

Set the secrets (one command, or Dashboard > **Edge Functions > Secrets**). Make `WEBHOOK_SECRET` a long random string, for example the output of `openssl rand -hex 32`:

```bash
supabase secrets set \
  RESEND_API_KEY=re_xxxxxxxxx \
  EMAIL_FROM="VDC Academy <hello@your-domain.com>" \
  ADMIN_NOTIFY_EMAIL=you@example.com \
  TURNSTILE_SECRET_KEY=0x4AAAAAAA... \
  WEBHOOK_SECRET=<long random string> \
  SITE_URL=https://morcosfady.github.io/vdc-academy
```

You can set `TURNSTILE_SECRET_KEY` after step 6; without it the function does not check tokens (it still sends emails). `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically; do not set them.

## 6. Create the database webhooks (2 min)

Dashboard > **Database > Webhooks** (if you see "Enable webhooks", click it). Create three, identical except for the table:

- Name: `notify-applications` / `notify-leads` / `notify-contact`
- Table: `applications` / `leads` / `contact_messages` (schema `public`)
- Events: **Insert** only
- Type: **Supabase Edge Functions**, function `notify`
- HTTP headers: add `Authorization` with value `Bearer <WEBHOOK_SECRET>` (the exact string from step 5, with the word `Bearer` and a space). Remove any auto-added Authorization header that holds a key.
- Timeout: 5000 ms is fine.

Newsletter signups do not need a webhook.

## 7. Cloudflare Turnstile (2 min)

1. https://dash.cloudflare.com > **Turnstile > Add site**.
2. Site name `VDC Academy`, hostnames: `morcosfady.github.io` (add your custom domain too if you have one; add `localhost` for local testing). Widget mode **Managed**.
3. Copy the **Site key** (goes to GitHub in step 8) and the **Secret key** (goes to `TURNSTILE_SECRET_KEY` in step 5).

Without a site key the widget renders nothing and forms still submit; without a secret key the function skips the check.

## 8. GitHub Actions secrets and push (2 min)

Repo on GitHub > **Settings > Secrets and variables > Actions > New repository secret**, add three:

| Name | Value |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | the Project URL from step 1 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | the anon public key from step 1 |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | the Turnstile site key from step 7 |

Repository **Variables** with the same names work too; the workflow reads secrets first, then variables. These values are baked into the static build and are public by design (anon key, site key); the secrets that matter stay in Supabase.

Push to `main` (or **Actions > Deploy to GitHub Pages > Run workflow**). Wait for the green check.

## 9. Verify with a test application (2 min)

1. Open https://morcosfady.github.io/vdc-academy/apply/ in a private window.
2. Fill the five steps with your own email, pick this year as graduation year to see the fresh graduate banner, attach a small PDF as proof, submit.
3. You should land on "Thank you" with the "What happens next" timeline.
4. Within a minute: a confirmation email in your inbox and a "New application" email at `ADMIN_NOTIFY_EMAIL`.
5. Supabase > **Table Editor > applications**: one row, `turnstile_ok` is `true` (or empty if no Turnstile secret), `turnstile_token` is empty. **Storage > applications > proof/**: your PDF under a random name.

If no email arrives: **Edge Functions > notify > Logs** shows the call and any Resend error; **Database > Webhooks** shows the delivery status. A `401` means the webhook `Authorization` header and `WEBHOOK_SECRET` differ.

Where rows live: `applications` (full form), `leads` (notify-me and price-list forms), `contact_messages` (contact page), `newsletter_subscribers` (the optional checkbox). Delete your test row afterwards.

## Local testing without keys

- `?mock=1` on the apply page points submissions at a fake server that Playwright intercepts (`tests/apply.spec.ts`). Nothing is sent anywhere.
- For a real local run: put the three `NEXT_PUBLIC_*` values in `.env.local` (gitignored) and run `pnpm dev`.

## What the owner must provide

- [ ] Supabase project: **Project URL** and **anon key** (step 1)
- [ ] Migrations run: `0001_init.sql` then `0002_hardening.sql` (step 2); bucket `applications` exists and is private
- [ ] Your email in `admin_emails` (step 3)
- [ ] Resend: verified sending domain, API key, from address (step 4)
- [ ] `notify` deployed with `--no-verify-jwt` and six secrets set: `RESEND_API_KEY`, `EMAIL_FROM`, `ADMIN_NOTIFY_EMAIL`, `TURNSTILE_SECRET_KEY`, `WEBHOOK_SECRET`, `SITE_URL` (step 5)
- [ ] Three webhooks on INSERT (`applications`, `leads`, `contact_messages`) with the `Authorization: Bearer <WEBHOOK_SECRET>` header (step 6)
- [ ] Turnstile site key and secret key (step 7)
- [ ] GitHub Actions secrets `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, then a push (step 8)
- [ ] One test application submitted and both emails received (step 9)
