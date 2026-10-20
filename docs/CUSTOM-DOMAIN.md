# Move to a custom domain

Today the site lives at `https://morcosfady.github.io/vdc-academy/` (GitHub Pages project site, base path `/vdc-academy`). On a custom domain such as `academy.baybimdesigns.com` the site moves to the root (`/`). Everything that depends on the address follows two build values:

| Value | GitHub Pages today | Custom domain |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | `https://morcosfady.github.io/vdc-academy` | `https://academy.baybimdesigns.com` |
| `NEXT_PUBLIC_BASE_PATH` | unset (the workflow defaults it to `/vdc-academy`) | `/` |

`next.config.ts` reads `NEXT_PUBLIC_BASE_PATH` for `basePath` and `assetPrefix`; asset URLs, links, the auth callback (`lib/supabase.ts` `siteUrl`), canonicals, Open Graph URLs, `sitemap.xml`, `robots.txt` and the JSON-LD (`config/site.ts` `SITE_URL`) follow `NEXT_PUBLIC_SITE_URL`. Nothing else in the code holds the address.

Do not add `public/CNAME` before the DNS is ready: GitHub Pages starts redirecting to the domain as soon as the file is deployed.

## Steps

1. **DNS** at the client's DNS host (they need to do this, or give access). For a subdomain:

   | Type | Name | Value |
   | --- | --- | --- |
   | CNAME | `academy` | `morcosfady.github.io` |

   For an apex domain instead (`baybimacademy.com`), four A records `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153` and four AAAA records `2606:50c0:8000::153`, `2606:50c0:8001::153`, `2606:50c0:8002::153`, `2606:50c0:8003::153`, plus a CNAME `www` to `morcosfady.github.io`.

2. **Verify the domain on GitHub** (protects against takeover): github.com > your profile Settings > Pages > Add a verified domain, add the TXT record it shows.

3. **Add the CNAME file**: create `public/CNAME` containing one line, `academy.baybimdesigns.com`. The export copies it to `out/CNAME`.

4. **Build values**: in the repo, Settings > Secrets and variables > Actions, set `NEXT_PUBLIC_SITE_URL=https://academy.baybimdesigns.com` and add a repository **variable** `NEXT_PUBLIC_BASE_PATH` with the value `/` (use `/`, not an empty value: GitHub treats an empty variable as unset, and unset means `/vdc-academy`). `.github/workflows/pages.yml` already passes it to the build.

5. **Repo Settings > Pages > Custom domain**: enter the domain, wait for the DNS check, then tick **Enforce HTTPS** (the certificate can take up to an hour).

6. Push, wait for the green check, open the domain. `https://morcosfady.github.io/vdc-academy/` now redirects to it.

7. Local check before pushing: `GITHUB_PAGES=true NEXT_PUBLIC_BASE_PATH= NEXT_PUBLIC_SITE_URL=https://academy.baybimdesigns.com pnpm build`, then `NEXT_PUBLIC_BASE_PATH= node scripts/serve-out.mjs 4173` serves `out/` at the root. The Playwright tests assume `/vdc-academy/`; run them with `BASE_URL=http://localhost:4173/` and expect only the URL assertions that name the base path to need updating.

## After the switch, update

- [ ] **Supabase** > Authentication > URL Configuration: Site URL to the new domain; add the redirect URLs `https://<domain>/auth/callback/`, `https://<domain>/account/reset-password/`, `https://<domain>/apply/` (keep the old ones for a week, then remove them).
- [ ] **Supabase** Edge Function secret `SITE_URL=https://<domain>` (the links in the emails).
- [ ] **Cloudflare Turnstile**: add the domain to the widget's hostnames.
- [ ] **Resend**: nothing to change for sending; if the academy domain is the new sending domain, verify it there too.
- [ ] **Google OAuth** (if on): add `https://<domain>` to Authorized JavaScript origins.
- [ ] **Search Console and Bing**: add the new domain as a property and submit `https://<domain>/sitemap.xml`. The Change of Address tool does not work from a github.io subpath property, so the move relies on the GitHub Pages redirect and the new canonicals (`docs/SEO.md`).
- [ ] **Analytics**: the website domain in Umami or Plausible (`docs/ANALYTICS.md`).
- [ ] `content/site.ts` `content.domain` with `approved: true`.

## Later: moving hosting to Vercel

GitHub Pages serves only static files, so the site is a static export: no server code, images are pre-optimized by scripts, and every account screen reads data in the browser through Supabase with Row Level Security. Moving to Vercel would change:

- **What you gain**: server actions and route handlers (for example submitting forms or sending emails from the site instead of Edge Functions), Next.js image optimization (`next/image` without `unoptimized`), real dynamic routes such as `/account/application/[id]/` instead of `?id=`, middleware for auth redirects before the page paints, preview deployments for every branch, real HTTP security headers instead of the CSP `<meta>`.
- **What changes in the code**: drop `output: "export"`, `basePath` and `images.unoptimized` from `next.config.ts` (the non-Pages branch already does this), move the CSP from the `<meta>` in `app/layout.tsx` to `headers()` in `next.config.ts`, optionally move Supabase auth to `@supabase/ssr` cookies.
- **What stays**: Supabase, the migrations, the Edge Functions, Resend, Turnstile, the env var names, the tests (`BASE_URL` pointing at the preview URL).
- **Cost**: the Hobby plan is free but for non-commercial use only; an academy that sells courses needs Pro (per seat per month).
- **DNS**: point the domain's CNAME at `cname.vercel-dns.com` instead of GitHub Pages, and remove `public/CNAME`.
