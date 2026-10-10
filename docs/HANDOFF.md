# VDC Academy handoff

Live: https://morcosfady.github.io/vdc-academy/ (GitHub Pages, static export, redeploys on every push to main)
Repo (public): https://github.com/morcosfady/vdc-academy
Folder: `F:\Projects\VDC Academy`. Spec for the redesign: `VDC-Academy-Claude-Code-Prompt.md` (v1) and the v2 Likova prompt.

## v4: clean, comfortable, cinematic (2026-10-10)

Owner feedback: "cleaner, easier on the eyes, add real motion graphics". Audit and fixes: `docs/audit/v4-audit.md`, before/after in `docs/audit/v4-before/` and `v4-after/`.

- **Critical fixes**: the round chapter indicator is now a slim 6-tick rail in the right margin, shown only at 1400px and wider (never over content). The empty stretch between chapters 3 and 4 came from stacked padding plus headings that stayed hidden until well inside the viewport: reveals now start 18% before the block enters, a 3.5s safety net shows anything still hidden, `content-visibility` is gone, the canvas clear color is forced transparent.
- **Comfort**: no pure white or black (headings #EAF2F7, body #B4C6CE, dim #8BA2AB, darkest #06141A, light sections #EEF5FB), text-wrap balance/pretty, 14px minimum (eyebrows 12.5px, floating field labels and tags 13px), Eurostile (Michroma) only for logo, eyebrows and section numbers (`.label`), everything else Poppins (`.meta` = 14px secondary text), chips and buttons at least 44px, aligned "Why" cards (middle card exactly 64px), smooth gradient bands between dark and light chapters (`.band-both`), softer 3D (gray-blue columns, tinted glass, lower env light, contact shadow and fading grid), header without a duplicate desktop menu, site follows the OS theme by default.
- **Comfort mode** (footer checkbox, remembered): calm static version, no grain/glow/motion, text one step larger.
- **Motion language**: tokens and helpers in `lib/motion.ts` and `hooks/useReveal.ts`, CSS in `app/motion.css`. Hero intro (about 2.2s, once per visit, skipped on repeat via sessionStorage + inline script and with reduced motion): photo fades and settles, blueprint lines draw, floors drop, systems switch on in order, headline lines rise, sub line, buttons, trust row, then tags pop with drawn leader lines. Scroll: hero hands the building off to the explorer (turns 25 degrees, floors lift apart and rejoin). Explorer: ghosting fades smoothly, selected system pulses once, panel slides in, clash has a pulsing red ring and a dashed reroute path with the duct travelling along it, 4D floors flash as they appear. Why: stepped slab entrances, parallax photos (CSS scroll-driven, Chromium and Safari 26+), icons draw once and on hover. Programs fan in; cards draw an accent border, covers zoom 1.04. Fresh grads: brass underline draws, light sweep crosses once. Path: drawn line with glowing marker. Closing: windows light floor by floor, Apply pulses once. Micro: button lift and press, link underlines draw, accordion height animates with plus turning to minus, odometer numbers, strikethrough draws, route changes sweep three ink bars (`PageTransition`).
- **Tiny loops**: animated clash-to-resolved icon and Gantt icon on two program cards (paused off screen), 6 benefit icons.
- **UX fix found by tests**: form error messages are absolutely positioned so removing one on blur can no longer shift the button and swallow the click.
- **QA (v4)**: 108 scan frames at 1440, 1024 and 390 in dark and light, none empty, lowest pixel variation 25 (was near-empty before). Lighthouse mobile, local static build: home 83 to 88 (noisy), programs 93, program detail 92, pricing 89, fresh grads 89, apply 85; accessibility 98 to 100, best practices 100, SEO 100. 36 tests pass. Scroll video (40 MB) is kept local (gitignored), regenerate with `node scripts/record.mjs <url> <out.webm>`. Light theme: the header sits on a dark hero, so it uses dark tokens until you scroll.
- **Not done**: no Lottie/Rive files (small SVG + CSS animations are used instead, each under 1 KB); View Transitions API is not used (bars overlay instead); no real people photography (see `docs/image-credits.md`).

## v3 visual overhaul (2026-10-10), supersedes the v2 look

Owner feedback: "basic, blank background, nasty green, not professional". Done:

- **Brand re-check** (`docs/brand-reference.md`, `scripts/brand-probe.mjs`): ink #0A1D23, deep #000E12, slate #365B62, pale #DEEFFD, Poppins + Eurostile Extended. `#216FF3` (and the pink) are the Readabler accessibility plugin, NOT brand, so they are not used.
- **Color system**: dark ink theme, steel blue accent (#7DB3E8 on dark, #1F5C99 on light), button #2F6FB0 with white text (5.2:1), brass #C9A36A in tiny doses (40%, clash resolved, tags). No green anywhere: `tests/no-green.spec.ts` scans all source for green/teal hues and fails the build. Tokens in `app/globals.css`. `.theme-light` and `.theme-dark` classes flip a whole chapter regardless of the site theme.
- **Type**: headlines Poppins SemiBold (max 84px), small uppercase labels in Michroma (stand-in for Eurostile Extended), body Poppins. Headline and body fonts use `display: optional` for speed (first-ever visit may show the system font).
- **Depth everywhere**: graded architectural photos (duotone ink to steel blue, `scripts/make-images.mjs`, credits in `docs/image-credits.md`), SVG blueprint layer (column bubbles, dimensions, section marker, stepped elevation) in `components/ui/BlueprintLayer.tsx`, soft blue glow behind the model, grain tile, Ken Burns on the hero photo.
- **Hero**: photo + lit 3D building (clear glass, systems visible) on the right, callout tags with leader lines (LOD 350, MEP Ducts, Clash resolved), headline "Train on real BIM projects. Build a real career." in 3 lines, two 52px buttons, trust facts row, trust strip.
- **Rhythm**: hero dark, explorer dark, why LIGHT with 3 tall photo panels, programs dark, fresh grads LIGHT with crane photo and brass underline, path dark, closing dark with photo, footer deep.
- **Cards**: ink surface, steel hairline, 16px radius, inner highlight. Program cards have a photo cover per program (own crop and focus), glyph, level tag, software chips, "View program".
- **Header** 72px, 15px links, hides on scroll. Buttons 52px, 10px radius. Inputs, chips 8 to 10px.
- **Lighthouse mobile (local static build)**: home 90, programs 94, program detail 91, fresh grads 89, pricing 85, apply 87 (CLS fixed). A11y 98 to 100, Best Practices 100, SEO 100. 36 tests pass (adds the no-green test).
- Before/after screenshots: `docs/audit/v3-before/` and `docs/audit/v3-after/`.

Still open from v3: no photography of people (no free-licensed match, see image-credits), no MEP ceiling photo (own 3D renders used). Supabase keys and the admin dashboard are still pending (see below).

## State (v2 redesign, 2026-10-10)

Everything below is built, tested locally against the static export, and pushed.

- **Audit and reference**: `docs/audit/v1-audit.md` (+ screenshots, Lighthouse), `docs/reference/likova-notes.md`. Likova frames are local only (gitignored). v2 screenshots in `docs/audit/v2/`.
- **Design system** (see v3 above for the current palette and type), display scale, `.label` technical labels, `.glass`, stepped-slab reveals (`Slab`, CSS only), `RiseLines` (CSS only), header hides on scroll, full-screen menu, floating fresh-grad pill, chapter indicator, giant footer wordmark.
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
