# SEO and sharing

Live site: https://morcosfady.github.io/vdc-academy/ (GitHub Pages, static export, base path `/vdc-academy`).

## How it is wired

- `config/site.ts` `SITE_URL` is the public origin plus base path. Canonicals, `og:url`, OG image URLs, the sitemap, robots and JSON-LD are all built from it. A custom domain needs only `NEXT_PUBLIC_SITE_URL` (and `NEXT_PUBLIC_BASE_PATH=""`, see below).
- `components/seo/meta.ts` `pageMeta()` gives every public page its title, description, `alternates.canonical`, Open Graph and Twitter tags. `app/layout.tsx` `metadata` sets `metadataBase`, the title template (`%s | VDC Academy`) and the default Open Graph image.
- `components/seo/JsonLd.tsx`: `orgLd` (EducationalOrganization, rendered on every page from the layout), `courseLd(program)`, `courseListLd(programs)` (ItemList on /programs), `faqLd(faqs)` (on /faq) and `breadcrumbLd(items)` (every inner public page).
  - `offers` appears on a Course only when `confirmed.prices` is true in `content/site.ts`; `hasCourseInstance` only when `confirmed.schedules` is true.
  - `sameAs` is added to the organization only when `content.social.linkedin` has a value and `approved: true`.
- Private screens (account, admin, login, signup, auth, apply/success, demo, styleguide, poster) carry `robots: noindex`, are listed in `PRIVATE_ROUTES` and are left out of the sitemap. `/instructors` and `/student-work` stay noindex until real profiles or projects are added in `content/site.ts`.
- Note for github.io: crawlers only read `robots.txt` at the host root (`morcosfady.github.io/robots.txt`), so `/vdc-academy/robots.txt` is ignored there. The noindex meta tags are what keep private pages out of Google until a custom domain is live. On a custom domain `robots.txt` works as written.
- Check: `tests/seo.spec.ts` (titles, descriptions, canonicals, OG image files, twitter card, JSON-LD types, no offers while prices are unconfirmed, noindex, robots and sitemap). Run after a build: `GITHUB_PAGES=true pnpm build` then `pnpm exec playwright test tests/seo.spec.ts`. If the build used `NEXT_PUBLIC_SITE_URL`, set the same value when running the test.

## Open Graph images

Branded 1200x630 PNGs in `public/og/` (one per main page, one per program as `program-<slug>.png`), about 40 to 45 KB each. They are rendered from an inline HTML template with Playwright and need no dev server and no build:

```
node scripts/og.mjs
```

Needs Chromium for Playwright (`pnpm exec playwright install chromium` once). The template loads Poppins and IBM Plex Mono from Google Fonts and falls back to system fonts offline. The card titles live in `scripts/og.mjs`; when a program or page title changes, edit it there and run the script again. Preview a card on a live URL with https://www.opengraph.xyz/ or the LinkedIn Post Inspector.

## Google Search Console

1. Open https://search.google.com/search-console and choose **Add property**.
2. Pick **URL prefix** (a Domain property needs DNS access, which github.io does not give) and enter `https://morcosfady.github.io/vdc-academy/` exactly, with the trailing slash.
3. Verify with one of these:
   - **HTML tag** (recommended): copy only the `content` value Google shows and add it to the `metadata` export in `app/layout.tsx`: `verification: { google: "THE-CODE" },`. Push, wait for the deploy, then click **Verify**.
   - **HTML file**: download the `google<code>.html` file Google offers, put it in `public/` (it is copied as-is into the export at `/vdc-academy/google<code>.html`), push, then click **Verify**.
4. Keep the tag or file in place after verifying; removing it unverifies the property.

### Submit the sitemap

1. In the property, open **Sitemaps**.
2. Enter `sitemap.xml` (the full URL is `https://morcosfady.github.io/vdc-academy/sitemap.xml`) and click **Submit**.
3. The status should turn to **Success** with the public page count (13 pages plus 11 programs today, more once instructors and student work are published).

### Request indexing of the key pages

1. Paste `https://morcosfady.github.io/vdc-academy/` into the URL inspection bar at the top.
2. Click **Test live URL**, check that the page is indexable and the canonical is the same URL, then click **Request indexing**.
3. Repeat for `https://morcosfady.github.io/vdc-academy/programs/` and, if wanted, `/fresh-graduates/` and the program pages. There is a daily quota, so start with home and programs.
4. Under **Enhancements**, watch Breadcrumbs and FAQ for errors after the first crawl.

## Bing Webmaster Tools

1. Open https://www.bing.com/webmasters and sign in.
2. Choose **Import from Google Search Console**, allow access and pick the VDC Academy property. Bing copies the verified site and its sitemap.
3. If import is not possible, add the site by URL and verify with the `BingSiteAuth.xml` file in `public/` or `metadata.verification.other: { "msvalidate.01": "THE-CODE" }` in `app/layout.tsx`, then submit `sitemap.xml` under **Sitemaps**.

## After a custom domain

1. Follow `docs/CUSTOM-DOMAIN.md`: set `NEXT_PUBLIC_SITE_URL=https://the-domain` (no trailing slash) and `NEXT_PUBLIC_BASE_PATH=""` in the deploy, add the domain in the repo Pages settings, rebuild and push.
2. Canonicals, OG image URLs, the sitemap, robots and JSON-LD switch automatically. The PNGs do not need regenerating (they contain no URL).
3. In Search Console add a new property for the domain (a **Domain** property verified by DNS TXT record is best now), submit the new `sitemap.xml` and request indexing of home and programs again. Keep the old github.io property for a few months to watch the move. The Change of Address tool only accepts root-level properties, so it cannot be used from `morcosfady.github.io/vdc-academy/`; the move relies on the GitHub Pages redirect (old URL to the domain, set up by `docs/CUSTOM-DOMAIN.md`) plus the new canonicals.
4. Add the domain to Bing the same way.
5. Set `content.domain` in `content/site.ts` if the site shows it, and run `tests/seo.spec.ts` with the new `NEXT_PUBLIC_SITE_URL`.

## Target keywords

Only phrases the site already uses. Each has one main page so pages do not compete.

| Keyword | Main page | Supporting pages |
|---|---|---|
| BIM training | `/` (title "BIM and VDC Training in Fort Worth, TX") | `/faq/`, `/about/` |
| VDC training | `/` | `/programs/vdc-professional-bootcamp/`, `/for-companies/` |
| Revit course | `/programs/bim-fundamentals-revit/` | `/programs/revit-architecture/`, `/programs/revit-structure/`, `/programs/revit-mep/`, `/programs/revit-family-creation/`, `/programs/` |
| Navisworks clash detection course | `/programs/navisworks-clash-detection/` | `/programs/` |
| BIM course for fresh graduates | `/fresh-graduates/` | `/pricing/` |
| BIM academy Texas | `/about/` (Fort Worth, TX) | `/` (description says "in Texas"), `/contact/` |

## Titles and descriptions

Limits: title 60 characters or fewer including the ` | VDC Academy` suffix, description 50 to 155 characters. Set in each page's `pageMeta()` call; program pages read the `seo` map in `app/programs/[slug]/page.tsx`.

| Path | Title | Chars | Description | Chars |
|---|---|---|---|---|
| `/` | BIM and VDC Training in Fort Worth, TX | VDC Academy | 52 | Hands-on BIM and VDC training in Revit, Navisworks, clash detection and 4D simulation, taught by working professionals from Bay BIM Designs in Texas. | 149 |
| `/programs/` | BIM Courses: Revit, Navisworks and VDC | VDC Academy | 52 | Eleven BIM and VDC programs: Revit, Navisworks clash detection, 4D/5D simulation, Dynamo and BIM management, from beginner to advanced. | 135 |
| `/pricing/` | Pricing and Discounts for BIM Courses | VDC Academy | 51 | VDC Academy plans and discounts for BIM and VDC training: up to 40% off for fresh graduates, 25% for students and 15% for company groups. | 137 |
| `/fresh-graduates/` | BIM Course for Fresh Graduates: Up to 40% Off | VDC Academy | 59 | Graduated in the last 24 months? Save up to 40% on BIM and VDC training at VDC Academy: Revit, Navisworks, clash detection and more. | 132 |
| `/learning-path/` | BIM Career Path: Trainee to VDC Manager | VDC Academy | 53 | From BIM trainee to VDC manager in five steps. See which VDC Academy BIM and VDC program fits each level of your career. | 120 |
| `/for-companies/` | BIM and VDC Team Training for Companies | VDC Academy | 53 | Train your team in Revit, Navisworks and VDC workflows with Bay BIM Designs: on site in Dallas Fort Worth, live online or both. | 127 |
| `/about/` | About VDC Academy by Bay BIM Designs | VDC Academy | 50 | VDC Academy is the BIM and VDC training academy of Bay BIM Designs in Fort Worth, TX, taught by working BIM and VDC professionals. | 130 |
| `/contact/` | Contact a VDC Academy Advisor | VDC Academy | 43 | Questions about BIM and VDC training at VDC Academy? Send a message to an advisor in Fort Worth, TX. We reply within two working days. | 134 |
| `/faq/` | BIM Training FAQ: Programs, Pricing, Applying | VDC Academy | 59 | Answers about VDC Academy BIM and VDC programs, fresh graduate and student discounts, applying, the laptop you need for Revit and team training. | 144 |
| `/apply/` | Apply to a BIM and VDC Program | VDC Academy | 44 | Apply to a VDC Academy BIM and VDC program in five short steps. We review applications within 1 to 2 business days, and you pay after acceptance. | 145 |
| `/privacy/` | Privacy Policy | VDC Academy | 28 | How VDC Academy by Bay BIM Designs handles the personal data you share on this site when you visit, create an account or apply to a program. | 140 |
| `/terms/` | Terms of Use | VDC Academy | 26 | The terms for using the VDC Academy website, creating a student account and applying to BIM and VDC programs run by Bay BIM Designs. | 132 |
| `/accessibility/` | Accessibility Statement | VDC Academy | 37 | VDC Academy aims for WCAG 2.1 level AA on every page: keyboard use, visible focus, AA contrast and reduced motion. Tell us about any problem. | 141 |
| `/instructors/` | BIM and VDC Instructors | VDC Academy | 37 | VDC Academy instructors are working BIM coordinators and VDC engineers from Bay BIM Designs. They teach what they did on real jobs that week. | 141 |
| `/student-work/` | Student Work: BIM and VDC Projects | VDC Academy | 48 | The projects VDC Academy students build: coordinated Revit models, Navisworks clash reports, family libraries and 4D construction simulations. | 142 |
| `/programs/vdc-professional-bootcamp/` | VDC Professional Bootcamp: BIM Training | VDC Academy | 53 | The flagship VDC training path: Revit modeling, Navisworks clash detection, 4D simulation, a capstone project and career support. | 129 |
| `/programs/bim-fundamentals-revit/` | BIM Fundamentals with Revit: Beginner Course | VDC Academy | 58 | A beginner BIM course in Autodesk Revit. Start from zero, learn BIM and LOD basics, and build your first model with views, schedules and sheets. | 144 |
| `/programs/revit-architecture/` | Revit Architecture Course | VDC Academy | 39 | An intermediate Revit course for architectural modeling: curtain walls, stairs, roofs, detailed drawing sets, worksets and design options. | 138 |
| `/programs/revit-structure/` | Revit Structure Course | VDC Academy | 36 | An intermediate Revit course for structural framing, foundations and slabs, with structural documentation and coordination with architecture. | 141 |
| `/programs/revit-mep/` | Revit MEP Course: Ducts, Pipes and Electrical | VDC Academy | 59 | An intermediate Revit MEP course: model ducts, pipes and electrical systems, size and tag them, and coordinate above ceilings on a commercial floor. | 148 |
| `/programs/low-voltage-bim/` | Low Voltage and Technology Systems BIM | VDC Academy | 52 | Model data, security, AV and fire alarm systems in Revit, with custom device families, device schedules and clash checks against MEP. | 133 |
| `/programs/revit-family-creation/` | Revit Family Creation Course | VDC Academy | 42 | An advanced Revit course on parametric families: reference planes, parameters and formulas, type catalogs, nested families and MEP connectors. | 142 |
| `/programs/navisworks-clash-detection/` | Navisworks Clash Detection Course | VDC Academy | 47 | A Navisworks clash detection course: federate multi-discipline models, set up clash tests and rules, and write and track clash reports. | 135 |
| `/programs/4d-5d-simulation/` | 4D/5D Construction Simulation Course | VDC Academy | 50 | An advanced VDC course: link a model to the schedule in Navisworks, build a 4D construction simulation and extract quantities for 5D cost. | 138 |
| `/programs/dynamo-for-revit/` | Dynamo for Revit Course: BIM Automation | VDC Academy | 53 | An advanced Dynamo course for Revit users: build visual scripts, read and write Revit data, exchange with Excel and automate checks and tagging. | 144 |
| `/programs/bim-management-iso-19650/` | BIM Management and ISO 19650 Course | VDC Academy | 49 | An advanced BIM management course: ISO 19650 concepts, BIM execution plans, a common data environment, model audits and handover data. | 134 |
