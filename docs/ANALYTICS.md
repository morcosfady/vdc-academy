# Analytics: Umami or Plausible, cookieless, off by default

About 5 minutes. When you finish: you see page views, where visitors come from, and a handful of funnel events (apply started, steps completed, submitted, sign-ups, price list requests). No cookies, no banner, no personal data. Until then the site loads no analytics script at all.

What runs where:

- **Umami** (preferred) or **Plausible**: counts page views and the events below. Pick one.
- **GitHub Actions**: bakes four public `NEXT_PUBLIC_ANALYTICS_*` values into the static build. They are public by design, like the Supabase anon key.
- **The site**: `lib/analytics.ts` (`track`, the whitelist) and `components/layout/Analytics.tsx` (loads the script, sends `program_viewed`). The CSP in `app/layout.tsx` adds the script's origin to `script-src` and `connect-src` only when the script is set.

## 1. Pick a provider (3 min)

### Umami Cloud (free tier, recommended)

1. https://cloud.umami.is, create an account. The Hobby plan is free (up to 100k events a month, enough here).
2. **Settings > Websites > Add website**. Name `VDC Academy`, domain `morcosfady.github.io` (or your custom domain).
3. Open the website, **Edit > Tracking code**. Copy the `data-website-id` value (a UUID). The script URL is `https://cloud.umami.is/script.js`.

### Umami self-hosted

Same as above on your own instance (https://umami.is/docs/install). The script URL is `https://<your-umami-host>/script.js`. The site sends events to the script's own origin, so nothing else needs allowing.

### Plausible

1. https://plausible.io (paid after the trial, or self-hosted Community Edition), **Add website**, domain `morcosfady.github.io`.
2. The script URL is `https://plausible.io/js/script.js` (self-hosted: `https://<your-host>/js/script.js`). The domain you entered is `NEXT_PUBLIC_ANALYTICS_DOMAIN`.
3. Custom events show up under **Goals**: add a goal of type **Custom event** for each event name below you want on the dashboard.

## 2. GitHub Actions variables (1 min)

Repo on GitHub > **Settings > Secrets and variables > Actions**. Add these as repository **Variables** (or secrets; the workflow reads secrets first, then variables):

| Name | Umami | Plausible |
| --- | --- | --- |
| `NEXT_PUBLIC_ANALYTICS_PROVIDER` | `umami` | `plausible` |
| `NEXT_PUBLIC_ANALYTICS_SCRIPT` | `https://cloud.umami.is/script.js` | `https://plausible.io/js/script.js` |
| `NEXT_PUBLIC_ANALYTICS_WEBSITE_ID` | the website id (UUID) | leave unset |
| `NEXT_PUBLIC_ANALYTICS_DOMAIN` | leave unset | `morcosfady.github.io` |

The script value must be a full `https://` URL: the build reads its origin for the CSP and fails loudly on a typo. A provider without its id (or domain) counts as off.

Push to `main` (or **Actions > Deploy to GitHub Pages > Run workflow**). Open the live site in a normal window: the provider dashboard shows the visit within a minute.

To turn analytics off again, delete `NEXT_PUBLIC_ANALYTICS_PROVIDER` and redeploy.

## 3. What is counted

Page views come from the provider script itself, including client-side navigations. Query strings and hashes are not recorded (Umami: `data-exclude-search` and `data-exclude-hash`; Plausible records the path only).

Events, and only these. Every prop is checked against a fixed list in `lib/analytics.ts`; anything else is dropped before it is sent.

| Event | When | Props |
| --- | --- | --- |
| `program_viewed` | a program page opens (`/programs/<slug>/`, slug from `content/programs.ts`) | `slug` |
| `apply_started` | the apply form (not the gate, not the fallback) is shown to a logged-in user, once per page load | none |
| `apply_step_completed` | Continue passes validation on steps 1 to 4 | `step` (1 to 4, the step just completed) |
| `apply_submitted` | the application is saved as submitted, right before the success page | `programs_count`, `discount` (`freshGrad`, `student` or `none`) |
| `signup_completed` | an account is created, from `/signup/` or the gate on `/apply/` | `status` (`fresh_grad`, `student`, `professional`, `career_changer`, `other`) |
| `price_list_requested` | the price list form on `/pricing/` is saved | none |
| `fresh_grad_quiz_completed` | the fresh graduate quiz shows its result | `qualified` (true or false) |
| `company_form_submitted` | the team training form on `/for-companies/` is saved | `size` (the team size bucket, for example `6 to 10`) |

Submitting the last apply step is `apply_submitted`; there is no separate `apply_step_completed` for step 5.

Events fired before the script has loaded wait in a small queue and go out when it loads. To add an event: add it to `AnalyticsEvents` and `rules` in `lib/analytics.ts`, then one `track("name", { ... })` line where it happens.

## Privacy

- **No cookies**, nothing stored on the device for analytics, no fingerprinting. Umami and Plausible are cookieless, so no consent banner is needed.
- **No personal data**: no emails, names, phones, cities or free text. Props are whitelisted per event and checked by type and shape.
- **Do Not Track is honored**: with `navigator.doNotTrack === "1"` the script is not loaded and nothing is sent.
- **Nothing in demo or mock mode**: the client demo (`/demo/`, localStorage `vdc-demo`) and the test mock (`?mock=1`, localStorage `vdc-mock`) never load the script or send events.
- Suggested line for the privacy policy: "We count visits and a few anonymous actions (for example, that an application was submitted) with a cookieless analytics service. We do not record your name, email or any other personal information, and we respect Do Not Track."

## Alternative: Google Analytics 4 (not built)

GA4 sets cookies and sends data to Google, so in the EU, the UK and several US states it needs consent first. What it would take:

1. A minimal consent banner in the design system (one line of copy, **Accept** and **Decline**, same weight, a link to the privacy policy), remembered in localStorage and reopenable from the footer.
2. `gtag.js` loaded only after **Accept**, never before. `https://www.googletagmanager.com` added to `script-src`, and `https://*.google-analytics.com` and `https://*.analytics.google.com` to `connect-src`.
3. **Consent Mode v2**: before anything loads, `gtag("consent", "default", { ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied", analytics_storage: "denied" })`, then `gtag("consent", "update", { analytics_storage: "granted" })` on Accept.
4. A third provider branch in `lib/analytics.ts` (`gtag("event", name, props)`); the event whitelist stays the same.

For a site this size Umami gives the same answers with none of that.

## Local testing

- With `localStorage["vdc-track-debug"] = "1"` the last 50 cleaned events are kept on `window.__vdcEvents`, even when no provider is configured and in mock mode (nothing is sent; this only shows what would be). `tests/analytics.spec.ts` uses it.
- To try a real provider locally, put the four variables in `.env.local` and run `pnpm dev`. Add `localhost` to the website's allowed domains if the provider asks for it.

## What is not tested yet

- No provider has received events from this site yet. The Umami `data-host-url` points at the script's own origin; if the browser console shows a CSP block for another Umami host, that host must be added to `connect-src` in `app/layout.tsx`.
- Plausible's newer per-site scripts (`/js/pa-....js` with `plausible.init()`) are not supported; use the `script.js` with `data-domain` above.
