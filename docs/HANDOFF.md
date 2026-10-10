# VDC Academy handoff

Live: https://morcosfady.github.io/vdc-academy/ (GitHub Pages, static export, redeploys on every push to main)
Repo (public): https://github.com/morcosfady/vdc-academy
Folder: `F:\Projects\VDC Academy`. Spec for the redesign: `VDC-Academy-Claude-Code-Prompt.md` (v1) and the v2 Likova prompt.

## State (v2 redesign, 2026-10-10)

Everything below is built, tested locally against the static export, and pushed.

- **Audit and reference**: `docs/audit/v1-audit.md` (+ screenshots, Lighthouse), `docs/reference/likova-notes.md`. Likova frames are local only (gitignored). v2 screenshots in `docs/audit/v2/`.
- **Design system**: tokens in `app/globals.css` (Bay BIM palette, dark first, light theme, film grain tile, faint grid), fonts Michroma (stand-in for licensed EurostileExtended) + Poppins (2 families), display scale, `.label` technical labels, `.glass`, stepped-slab reveals (`Slab`, CSS only), `RiseLines` (CSS only), header hides on scroll, full-screen menu, floating fresh-grad pill, chapter indicator, giant footer wordmark.
- **Signature 3D object**: `components/three/SteppedBuilding.tsx`, 6 offset glass floors with edges, structure, ducts, pipes, trays and hangers visible inside, clash story (red to green), 4D growth, LOD 100 to 500, isolation by discipline. One shared WebGL canvas (`SceneHost`) with drei `View` per page region (`SceneSlot` > `SteppedView`). SVG poster (`SteppedPoster`) shows first and when 3D is unavailable.
- **Home**: 6 chapters: hero, explorer (rotate, isolate, clash, 4D scrubber, LOD), why (3 statements + benefits + software chips), finder (floors + filters), fresh grads (40% as real text + qualify quiz), journey (5 unique steps, building gains floors, pinned on desktop) + closing CTA + FAQ.
- **Inner pages**: programs (finder), program detail (3D with discipline isolated, outcomes, modules sheet index, price box), pricing, fresh-graduates, learning-path, for-companies, about, contact, faq, privacy, terms, accessibility, instructors and student-work ("coming soon", noindex, hidden from nav), 404 (clash), apply, apply/success.
- **Placeholders**: none visible. `content/site.ts` holds every owner value with `approved` flag; components render nothing when missing. Playwright test fails if any `[BRACKET]` text appears on any page.
- **Apply flow**: 5 steps, react-hook-form + zod, autosave + resume, fresh-grad detection banner, file upload (5 MB, type check), live estimate (shows "Price will be sent with your acceptance" when prices unknown), building gains a floor per step. Submission is isolated in `lib/submit.ts` (Supabase REST, insert only). Without Supabase keys the page shows "Applications open soon" + email capture (`?preview=1` shows the full form).
- **Supabase** (not connected yet): `supabase/migrations/0001_init.sql` (tables, RLS insert-only for public, admin policies, private bucket), `supabase/functions/notify/index.ts` (Turnstile check + Resend emails). Needs keys, see below.
- **Tests**: `pnpm exec playwright test` (35 tests: no placeholders, no em dashes, H1 text, 40% without JS and with reduced motion, apply validation and fresh-grad banner, no-WebGL fallback, reduced motion, axe serious/critical = 0 on 8 pages). Build first: `GITHUB_PAGES=true pnpm build`; the tests serve `out/` via `scripts/serve-out.mjs`.

## Performance (Lighthouse mobile, local static build with gzip)

Home 87, programs 87, program detail 86, pricing 86, apply 86, fresh grads 86, privacy 90. Accessibility 98 to 100, Best Practices 100, SEO 100 on all.
What made the difference: 3D bundle (about 900 KB) loads late (idle on desktop, first interaction or 8 s on phones) and not at all on software renderers (`useWebGL`, bypass with `?gl=force`), GSAP/Lenis/motion features load on first interaction (`lib/interaction.ts`), CSS-only reveals and headline, small pre-rendered grain PNG instead of an SVG filter, `font-display: optional` for body font, no link prefetch, `content-visibility` on below-fold chapters.

## Not done / needs the owner

- **Supabase, Resend, Turnstile keys.** Steps: create Supabase project, run the SQL, add yourself to `admin_emails`, create Database Webhooks (INSERT on applications, leads, contact_messages) calling the `notify` Edge Function, set function secrets (RESEND_API_KEY, EMAIL_FROM, ADMIN_NOTIFY_EMAIL, TURNSTILE_SECRET_KEY, WEBHOOK_SECRET, SITE_URL), then add GitHub repo variables `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY` (Settings > Secrets and variables > Actions > Variables) and push. Until then the apply page shows the honest fallback.
- **Admin dashboard** (`/admin`) is not built. RLS policies for admins exist. Needs Supabase Auth magic link in the browser; build after keys exist.
- Real content: see `content/TODO-content.md` (prices, durations, formats, dates, contact email/phone, instructors, student work, testimonial approval, domain, licensed font).
- No rendered hero poster WebP: an SVG poster is used instead (theme aware, tiny). A real render can replace `SteppedPoster` later.
- Blog/MDX, next-intl wiring, JSON-LD and dynamic OG images (SEO extras) not built yet. Metadata, sitemap and robots are partly missing: add `app/sitemap.ts` and `app/robots.ts` next.
- Not tested on a real iPhone Safari or Android device. Desktop and 390 px emulation only. Light theme 3D scenes not reviewed visually.
- Vercel MCP in the Claude session was refused (scope). If hosting moves to Vercel, replace `lib/submit.ts` with server actions.

## Gotchas

- GitHub Pages basePath is `/vdc-academy` (only when `GITHUB_PAGES=true`).
- 3D scenes use `drei View` (one canvas). Any element above a scene needs `z-index` above 5 and must not be inside an `isolate` ancestor.
- Do not import values (arrays) from a `"use client"` file into a server page: keep shared data in `content/*.ts`.
- `pnpm` prints "Ignored build scripts" after install: harmless.
- Quick local run: `pnpm dev` (3D needs a GPU browser, or add `?gl=force`).
