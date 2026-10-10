# 🏗️ Claude Code Prompt: VDC Academy Website (by Bay BIM Designs)

Copy everything below this line and paste it into Claude Code.

---

## 0. Your role and the mission

You are a senior full-stack engineer, creative developer, and 3D/motion designer. Build a complete, production-ready website for **VDC Academy**, the new training academy of **Bay BIM Designs** (Fort Worth, TX), a BIM and VDC services company whose current site is https://baybimdesigns.com/.

VDC Academy recruits students and graduates and trains them in **BIM (Building Information Modeling) and VDC (Virtual Design and Construction)**: Revit, Navisworks, clash detection and coordination, MEP and low-voltage modeling, Revit family creation, 4D/5D construction simulation, and BIM management.

The new site must:

1. **Feel like a sibling of baybimdesigns.com**: same brand colors, same style, same professional engineering tone, clearly part of the same family.
2. **Be much better**: far more modern, with rich **3D scenes, scroll-driven motion, micro-interactions, and smooth transitions**, while staying fast and accessible.
3. **Convert visitors into applicants** through a polished multi-step **Sign Up / Apply** flow that collects candidate information and stores it safely.
4. **Promote bigger discounts for fresh graduates** everywhere it makes sense.

Work in phases (section 14), commit after each phase, and keep a handoff file updated (section 15). Do not stop to ask small questions. Make strong, sensible decisions, write them down in the handoff, and only stop for things that truly need the owner (keys, real prices, real photos).

---

## 1. Step one: study the reference site before writing any code

1. Fetch https://baybimdesigns.com/ (HTML and its CSS files). If plain fetching is blocked, try a headless browser (Playwright). If both fail, stop and ask me for screenshots and the color codes.
2. Extract and save to `docs/brand-reference.md`:
   - The **exact brand colors** (hex codes) from the CSS: primary, secondary, accent, dark backgrounds, light backgrounds, text colors, button and hover colors, gradients.
   - The **fonts** (font-family names, weights, sizes for headings vs body).
   - **Logo** style (download the logo file if publicly available into `public/brand/` and note the URL).
   - **Button shapes** (radius, padding, uppercase or not), card styles, section spacing, icon style.
   - Tone of voice and taglines (for example: "Revolutionary BIM Solutions", "ensure project success before construction").
   - Navigation structure: About Bay BIM, BIM Solutions, BIM for AE Design Firms, BIM for GC + Subcontractors, BIM for Owners, Blog, "Connect with an Expert" CTA.
3. Turn that into **design tokens** (section 4). The academy must reuse the same palette and font family. You may add one or two tints/shades and a subtle glow/gradient derived from the brand colors, but never introduce an unrelated color scheme.
4. Use only facts we have. Do not copy the main site's copy word for word: rewrite it for an academy audience.

---

## 2. Tech stack (use these unless there is a strong reason not to)

| Need | Choice |
|---|---|
| Framework | **Next.js 15 (App Router) + TypeScript (strict)** |
| Styling | **Tailwind CSS v4** with CSS variables for tokens, `clsx` + `tailwind-merge` |
| UI primitives | **shadcn/ui** (Radix) for dialogs, selects, tabs, accordions, toasts |
| 3D | **three.js + @react-three/fiber + @react-three/drei** (+ `@react-three/postprocessing` for subtle bloom/SSAO) |
| Scroll motion | **GSAP + ScrollTrigger** (free, now fully free incl. plugins) |
| UI motion | **Motion (Framer Motion)** for component enter/exit, layout and hover animations |
| Smooth scroll | **Lenis**, synced with GSAP ticker |
| Forms | **React Hook Form + Zod** (shared schema client and server) |
| Database + storage | **Supabase** (Postgres + Storage for CV/certificate uploads + Auth for the admin area) |
| Emails | **Resend** + **React Email** templates |
| Spam protection | **Cloudflare Turnstile** + honeypot field + rate limiting |
| Analytics | **Vercel Analytics** + **Speed Insights** (privacy friendly) |
| Icons | **lucide-react** |
| Deploy | **Vercel** |
| Lint/format/test | ESLint, Prettier, **Playwright** (e2e), **Vitest** (unit), **axe-core** checks |

Package manager: **pnpm**. Node 20+. Create `.env.example` with every variable and never commit real secrets.

---

## 3. Information architecture (pages and routes)

| Route | Page |
|---|---|
| `/` | Home (the 3D showcase, section 5) |
| `/programs` | All programs/courses with filters |
| `/programs/[slug]` | Program detail page |
| `/pricing` | Pricing + discounts (fresh grad highlight) |
| `/fresh-graduates` | Dedicated landing page for fresh grads (best discount) |
| `/learning-path` | Interactive 3D career roadmap (beginner to BIM coordinator to VDC manager) |
| `/about` | About VDC Academy + link to Bay BIM Designs |
| `/instructors` | Instructor profiles |
| `/student-work` | Gallery of student BIM models (3D viewer) |
| `/for-companies` | Corporate team training (Bay BIM already trains firm teams, testimonial proves it) |
| `/faq` | FAQ |
| `/blog` + `/blog/[slug]` | MDX blog (optional, phase 4) |
| `/contact` | Contact form + map + info |
| `/apply` | **Multi-step Sign Up / Apply** (section 7) |
| `/apply/success` | Thank you page with next steps |
| `/admin` | Protected dashboard to view and manage applicants (section 8) |
| `/privacy`, `/terms`, `/accessibility` | Legal pages |
| `not-found` | Custom 404 with a playful 3D "clash detected" scene |

Global layout:
- **Sticky header** with glass effect, logo (VDC Academy wordmark + "by Bay BIM Designs"), nav, and a glowing **"Apply Now"** button (always visible). Header shrinks and gains a backdrop blur after scrolling.
- **Top announcement bar** (dismissible): "🎓 Fresh graduates save up to 40%. Next cohort starts [DATE]." with a live countdown.
- **Mobile**: full-screen animated menu with staggered links; a **sticky bottom "Apply Now" bar** on mobile.
- **Footer**: academy info, programs, quick links, Bay BIM Designs link (https://baybimdesigns.com/), LinkedIn, newsletter signup, legal links, "© VDC Academy, a Bay BIM Designs company".

---

## 4. Design system

### 4.1 Tokens
- Put all colors in `app/globals.css` as CSS variables (`--brand-primary`, `--brand-secondary`, `--brand-accent`, `--bg`, `--bg-elevated`, `--surface`, `--text`, `--text-muted`, `--border`, `--glow`) using the hex codes you extracted in section 1.
- Support **dark mode first** (a deep "blueprint night" background built from the brand's darkest color) plus a light mode. Theme toggle in the header, remembers the choice.
- Typography: same font family as the main site (load with `next/font`). Fluid type scale with `clamp()`. Headings bold and tight, body readable (16 to 18px, line-height 1.6).
- Radius, shadow, and spacing scales consistent with the main site's buttons and cards.
- All text/background pairs must pass **WCAG AA contrast**.

### 4.2 Visual language (engineering, blueprint, construction)
- Subtle **blueprint grid** background (thin lines, slow parallax).
- Thin **technical lines and dimension markers** that draw themselves on scroll (SVG stroke animation).
- **Isometric / wireframe** accents that turn solid on hover.
- Section labels styled like drawing sheet tags (for example `A-101 · PROGRAMS`, `M-201 · PRICING`).
- Glassmorphism cards with soft brand-colored glow on hover.
- Real photography placeholders in `public/images/placeholders/` (clearly named so we can swap them later).

### 4.3 Components to build (reusable, typed, documented)
Button (primary, secondary, ghost, glow), Badge, Card, TiltCard (3D mouse tilt with glare), SectionHeader (sheet-tag + title + subtitle), Counter (animated numbers), Marquee (software logos), Accordion, Tabs, Modal, Toast, Stepper, ProgressBar, PriceCard, DiscountRibbon, CountdownTimer, TestimonialSlider, InstructorCard, ProgramCard, Timeline, FileUpload (drag and drop), ThemeToggle, CookieBanner, ScrollProgress (top bar), BackToTop, MagneticButton, CursorFollower (desktop only, subtle).

---

## 5. Home page (the showcase), section by section

### 5.1 Hero: "Build it digitally before you build it for real"
- Full-viewport **React Three Fiber scene**: a modern multi-story building that **assembles itself** on load: foundation, structure (columns/beams), slabs, then **MEP systems** (ducts in one color, pipes in another, cable trays/low-voltage in the brand accent), then the facade glass. Elements fly in and snap into place with easing.
- Starts as a **glowing wireframe**, transitions to **solid shaded** with soft studio lighting and a subtle bloom.
- Slow auto-rotation, **mouse parallax** (camera follows cursor gently), drag to orbit on desktop (limited angles).
- Build the model **procedurally from primitives** (boxes, cylinders, instanced meshes) so there is no heavy asset to download. Use `InstancedMesh` for repeated parts. Optionally support swapping in a real `.glb` later (Draco + KTX2 compressed) from `public/models/`.
- Headline (animated word-by-word reveal): **"Become the BIM & VDC Expert Every Project Needs."**
- Subheadline: "Hands-on training in Revit, Navisworks, clash detection, and virtual construction, taught by working professionals from Bay BIM Designs."
- CTAs: **"Apply Now"** (primary, magnetic, glowing) and **"Explore Programs"** (secondary).
- Small trust line: "Taught by the team behind Bay BIM Designs, Fort Worth, TX."
- Fresh grad pill under the CTAs: "🎓 Fresh grad? Get up to 40% off".
- Scroll indicator (animated mouse/line).

### 5.2 Animated stats band
Counters that count up when visible: Students trained, Hands-on projects, Hiring partners, Hours of practice. Use clear **placeholders** (for example `[XX]`) and list them in the handoff so the owner can provide real numbers. Never invent fake statistics in final copy.

### 5.3 "What is BIM & VDC?" scroll story (pinned section)
A **pinned GSAP ScrollTrigger** section where scrolling drives the 3D model through 4 stages, with text on the side changing per stage:
1. **Model**: 3D BIM model appears (LOD 100, simple masses).
2. **Coordinate**: model splits into disciplines (exploded view by floor and system).
3. **Detect clashes**: a duct and a beam collide, a **red pulsing clash marker** appears, then the duct reroutes and the marker turns green ✅.
4. **Simulate**: 4D construction sequence, a timeline bar fills while the building grows floor by floor.
Include a **"LOD slider"** (100 / 200 / 300 / 350 / 400 / 500) that changes the detail of the model in real time.

### 5.4 Why VDC Academy (feature grid)
6 TiltCards with animated icons:
- Learn from working BIM professionals (real projects, not just theory)
- Real project files (AE firms, GCs, subcontractors, technology/low-voltage)
- Software you will use on the job
- Portfolio you can show employers
- Career support (CV review, interview prep, LinkedIn tips)
- Certificate of completion from VDC Academy by Bay BIM Designs

### 5.5 Software marquee
Infinite logo marquee (pause on hover), monochrome logos turning brand-colored on hover: Autodesk Revit, Navisworks, AutoCAD, Autodesk Construction Cloud / BIM 360, Dynamo, Enscape or Twinmotion, Bluebeam, Microsoft Project or Primavera P6 (for 4D). Use text badges if official logos are not allowed, and add a note in the handoff to confirm trademark use.

### 5.6 Programs preview
Horizontal scroll (GSAP) of ProgramCards on desktop, swipe carousel on mobile. Each card: icon, title, level, duration, format (online/in-person/hybrid), "Fresh grad price" badge, and "View program" link. Cards lift and show a mini 3D/isometric illustration on hover.

### 5.7 Learning path (3D roadmap)
A winding 3D road/path with milestones: **BIM Fundamentals → Discipline Modeling (Arch/Struct/MEP) → Coordination & Clash Detection → 4D/5D Simulation → BIM Coordinator → VDC Manager**. A small camera flies along the path as the user scrolls. Each milestone shows skills and typical job titles.

### 5.8 Fresh graduate spotlight
Bold, colorful section: "🎓 Just graduated? This is your launchpad." Big animated discount number (up to 40% off), what they get, eligibility (graduated within the last 24 months), what to upload (graduation certificate or transcript), and a CTA to `/fresh-graduates`. Confetti burst (respecting reduced motion) when the CTA is hovered/clicked.

### 5.9 Student work gallery preview
Masonry grid of student project renders + one embedded **interactive 3D viewer** (orbit, zoom, toggle disciplines on/off, section-box slider). Placeholders until real work is provided.

### 5.10 Instructors preview
Cards with photo, name, role, years of experience, specialties; flip or tilt on hover to show a short bio and LinkedIn. Placeholders.

### 5.11 Testimonials
Slider with smooth transitions. Phase 1: use **trust quotes from Bay BIM Designs' clients about the company's training and expertise** only if the owner approves (one public testimonial on the main site says Bay BIM trained a firm's design team in BIM over 6 months). Mark them clearly as "From Bay BIM Designs clients". Leave space for future student testimonials. Never invent testimonials.

### 5.12 Pricing teaser
3 plan cards with a **"I'm a fresh graduate" toggle** that animates prices down (number roll animation, strikethrough on old price, discount ribbon).

### 5.13 FAQ preview (6 questions) + link to full FAQ

### 5.14 Final CTA
Full-width section with the building model in the background at night with glowing MEP lines: "Your BIM career starts here." + Apply Now + "Talk to an advisor" (opens contact modal / WhatsApp link placeholder).

---

## 6. Programs, pricing, and discounts (content model)

Store programs in a typed data file `content/programs.ts` (easy to edit, later movable to a CMS). Each program: `slug, title, shortDescription, level, durationWeeks, hours, format, schedule, prerequisites, outcomes[], modules[] (title + lessons[]), software[], projects[], certificate, priceFull, priceFreshGrad, priceStudent, nextCohortDate, seats, featured, icon`.

Suggested starter programs (all prices and dates are **placeholders** `[PRICE]` / `[DATE]` until the owner confirms):
1. **BIM Fundamentals with Revit** (beginner)
2. **Revit Architecture**
3. **Revit Structure**
4. **Revit MEP** (Mechanical, Electrical, Plumbing)
5. **Low Voltage & Technology Systems BIM** (data, security, AV, fire alarm: a Bay BIM specialty)
6. **Revit Family Creation** (custom parametric families)
7. **Navisworks: Coordination & Clash Detection**
8. **4D/5D Construction Simulation**
9. **Dynamo for Revit (BIM Automation)**
10. **BIM Management & ISO 19650 basics**
11. **VDC Professional Bootcamp** (flagship, combines the core tracks + capstone project + career support)

Program detail page: hero with 3D icon of the discipline, overview, "What you will learn", animated **module accordion**, software, projects, schedule, instructor, price box with fresh-grad toggle (sticky on desktop), FAQ, related programs, Apply CTA that pre-selects the program in the form (`/apply?program=slug`).

### Discount rules (placeholders, owner must confirm)
| Discount | Who | Default % | Proof |
|---|---|---|---|
| 🎓 **Fresh Graduate** (biggest) | Graduated in the last 24 months | **40%** | Graduation certificate or transcript upload |
| 📚 Current student | Enrolled in engineering/architecture/construction | 25% | Student ID upload |
| ⏰ Early bird | Applies 30+ days before cohort start | 10% | Automatic by date |
| 👥 Group / company | 3+ people from the same company | 15% | Admin approves |

Rules: discounts **do not stack** except Early Bird can stack with Fresh Graduate (configurable flag). Put all rules in `config/discounts.ts`. The UI must always show the final price and the saving. Discounts are "pending verification" until an admin approves the document.

Pricing page: comparison table of plans (Single Course, Track bundle, VDC Bootcamp), payment options note (pay in full or installments, placeholder), money-back/satisfaction policy placeholder, discount calculator widget (select program + status, see price instantly).

---

## 7. Sign Up / Apply flow (most important feature)

Route `/apply`. A **multi-step form** with an animated stepper (progress bar fills, steps slide horizontally, 3D building on the side gains one floor per completed step 🏗️, a fun touch). Autosave progress in `localStorage` (clearly try/catch) so users don't lose data. Fully keyboard accessible, clear errors, mobile friendly.

### Step 1: Personal info
- Full name *
- Email * (validated, check for duplicates on submit)
- Phone * (international input with country code)
- WhatsApp same as phone? (checkbox, else WhatsApp number)
- Country * and City *
- Date of birth (optional) or Age range
- Preferred language (English / Arabic / other)

### Step 2: Education & status
- Current status *: Fresh graduate / Current student / Working professional / Career changer / Other
- Degree *: Architecture, Civil, Mechanical, Electrical, Construction Management, Other engineering, Non-engineering
- University *
- Graduation year * (if graduated within 24 months, **auto-show the Fresh Graduate discount banner with animation** 🎉)
- GPA / grade (optional)
- Upload proof (graduation certificate or student ID) for discount verification (PDF/JPG/PNG, max 5 MB)

### Step 3: Experience & goals
- Years of experience (0, <1, 1–3, 3–5, 5+)
- Current job title / company (optional)
- Software experience: multi-select chips with skill level per tool (None / Beginner / Intermediate / Advanced): Revit, AutoCAD, Navisworks, Dynamo, ACC/BIM 360, Bluebeam
- Career goal: BIM Modeler, BIM Coordinator, VDC Engineer, BIM Manager, Other
- CV upload (optional, PDF/DOC, max 5 MB)
- LinkedIn URL (optional), portfolio URL (optional)

### Step 4: Program choice
- Program(s) of interest * (cards with checkboxes, pre-filled from `?program=`)
- Preferred format: Online live / In-person (Fort Worth, TX) / Hybrid
- Preferred schedule: Weekdays / Evenings / Weekends
- Preferred start: next cohort / later
- Has own laptop able to run Revit? (Yes / No / Not sure, with a tooltip of minimum specs)
- How did you hear about us? (LinkedIn, Google, Friend, University, Bay BIM Designs, Other)
- Live **price summary card** showing chosen program(s), base price, discount applied (pending verification), final estimate.

### Step 5: Review & submit
- Summary of all answers with "Edit" links per step
- Consent checkboxes: agree to Privacy Policy and Terms *; agree to be contacted by email/phone/WhatsApp *; optional newsletter opt-in
- Cloudflare Turnstile
- Submit button with loading state and success animation (building completes, lights turn on ✨)

### After submit
- Server Action / Route Handler validates with the **same Zod schema**, sanitizes input, enforces rate limit (for example 5 per hour per IP), checks honeypot and Turnstile.
- Uploads go to a **private Supabase Storage bucket** (`applications/`), stored with random file names, accessed only via signed URLs from the admin area.
- Insert into `applications` table (section 8).
- Send **confirmation email** to the candidate (React Email, branded, includes application ID, chosen program, discount status "pending verification", next steps, contact info).
- Send **notification email** to the academy admin address (`ADMIN_NOTIFY_EMAIL` env var) with a summary and a link to the record in `/admin`.
- Redirect to `/apply/success` with a friendly next-steps timeline (We review in 1–2 business days → Advisor call → Enroll & pay → Start learning).
- Fire an analytics event `application_submitted` (no personal data in analytics).

### Also add
- **Quick interest form** (name, email, phone, program) in a modal for people not ready for the full application ("Get the brochure / Notify me about the next cohort"), saved to a `leads` table.
- **Contact form** on `/contact` saved to `contact_messages` table with email notification.

---

## 8. Database and admin dashboard

### 8.1 Supabase schema (write SQL migrations in `supabase/migrations/`)
- `applications`: id (uuid), created_at, status (`new | contacted | interview | accepted | enrolled | rejected | waitlist`), full_name, email, phone, whatsapp, country, city, dob_or_age, language, current_status, degree, university, graduation_year, gpa, experience_years, job_title, company, software_skills (jsonb), career_goal, linkedin_url, portfolio_url, programs (text[]), format, schedule, start_pref, has_laptop, source, discount_type, discount_percent, discount_verified (bool), proof_file_path, cv_file_path, consent_privacy (bool), consent_contact (bool), newsletter (bool), notes (text, admin only), utm_source, utm_medium, utm_campaign, ip_hash.
- `leads`, `contact_messages`, `newsletter_subscribers`.
- **Row Level Security ON** for every table: public can only insert (through the server using the service role on the server side only, never exposed to the browser); only authenticated admins can read/update.
- Indexes on email, status, created_at.

### 8.2 Admin dashboard `/admin`
- Supabase Auth (email magic link), only emails in an `ADMIN_EMAILS` allowlist can enter.
- Table of applicants with search, filters (status, program, discount type, date range, country), sorting, pagination.
- Applicant detail drawer: all fields, signed links to view CV and proof, verify discount toggle, change status, internal notes, quick actions (email, WhatsApp link, copy phone).
- KPI cards at the top: total applications, this week, fresh grads %, by program (small chart), conversion by status.
- **CSV export** of filtered results.
- Activity log of status changes.

---

## 9. Motion and 3D rules (make it stunning, but smooth)

- Page transitions: smooth fade + slight slide/clip-path wipe between routes (View Transitions API where supported, Motion fallback).
- Scroll reveals: headings split into words/lines (GSAP SplitText) with staggered rise; images unmask with clip-path; technical SVG lines draw in.
- Micro-interactions: magnetic buttons, button ripple, hover glow, tilt cards with glare, animated underlines on links, icon morphs.
- Custom cursor (desktop only): small ring that grows over links and shows "View" over cards. Turn off on touch devices.
- Loading: short branded preloader (logo outline drawing + building wireframe), max 1.5 s, skipped on repeat visits.
- **3D performance**:
  - Lazy-load every Canvas with `next/dynamic` and IntersectionObserver; only render 3D when on screen (`frameloop="demand"` when idle).
  - Cap device pixel ratio at 1.5 to 2, use `PerformanceMonitor` from drei to lower quality on weak devices.
  - Use instancing, merged geometries, baked lighting where possible; compress any GLB with Draco/Meshopt and KTX2 textures.
  - On low-end mobile or if WebGL is unavailable, show a beautiful static image/video fallback.
- **Accessibility of motion**: respect `prefers-reduced-motion` everywhere (disable smooth scroll, parallax, auto-rotation, confetti; show static versions). Add a visible "Reduce motion" toggle in the footer. No flashing faster than 3 times per second.

Targets: **Lighthouse 90+** on Performance, Accessibility, Best Practices, SEO (mobile). LCP < 2.5 s, CLS < 0.1, INP < 200 ms. Initial JS for the home page as small as possible; 3D chunks loaded after first paint.

---

## 10. Accessibility (required, the client's main site already promotes WCAG 2.1 AA)

- WCAG 2.1 AA: semantic HTML, landmarks, one H1 per page, skip-to-content link, visible focus rings in brand color, full keyboard navigation (menus, sliders, form steps, modals with focus trap), ARIA labels on icon buttons, alt text on all images, captions for videos, form errors announced with `aria-live`.
- 3D canvases get `aria-hidden` plus a text description nearby; interactive 3D viewers have keyboard controls and buttons as alternatives to dragging.
- Run axe-core in Playwright tests on every page; zero serious/critical violations.
- Accessibility statement page at `/accessibility`.

---

## 11. SEO, content, and marketing

- Metadata API for every page (title, description, Open Graph, Twitter card). **Dynamic OG images** with `next/og` using brand colors and the building illustration.
- `sitemap.xml`, `robots.txt`, canonical URLs.
- JSON-LD: `EducationalOrganization` (academy, parent organization Bay BIM Designs, Fort Worth TX), `Course` for every program (with `offers` price when known), `FAQPage`, `BreadcrumbList`.
- Target keywords: BIM training, VDC training, Revit course, Navisworks clash detection course, BIM coordinator training, Revit MEP course, BIM course for fresh graduates, BIM academy Texas / online.
- Clean URLs, fast pages, internal links between programs.
- UTM capture: store utm params from the first visit (cookie/localStorage, try/catch) and attach them to applications.
- Cookie consent banner (analytics only after consent where required).
- Optional newsletter signup in footer (stored in Supabase).
- WhatsApp floating button (placeholder number via env var `NEXT_PUBLIC_WHATSAPP`), hidden if not set.

---

## 12. Internationalization

- Build **English first**, but structure all UI strings in `messages/en.json` (next-intl) so we can add **Arabic (RTL)** later without refactoring. Use logical CSS properties (`ms-`, `me-`, `ps-`, `pe-`) so RTL works.
- If I confirm Arabic, add `messages/ar.json`, a language switcher, and an Arabic-friendly font that pairs with the brand font.

---

## 13. Security and privacy

- Never expose the Supabase service role key to the client. All writes go through server actions/route handlers.
- Validate and sanitize everything on the server (Zod), limit file types by MIME and extension, scan size, rename files.
- Rate limit form endpoints (Upstash Redis or Vercel KV if available; otherwise a Supabase-based limiter).
- Security headers via `next.config` / middleware: CSP (allow only needed domains: Supabase, Turnstile, Vercel analytics, fonts), HSTS, X-Frame-Options, Referrer-Policy, Permissions-Policy.
- Hash IPs before storing. Store only what is needed.
- Privacy policy covers what we collect in the application, why, retention, and how to request deletion. Terms cover enrollment, refunds (placeholder), and discount verification.

---

## 14. Build phases (commit after each, keep the site runnable)

1. **Phase 1: Foundation**: study the reference site (section 1), set up project, tokens, fonts, layout (header, footer, announcement bar), theme toggle, base components, `.env.example`, README.
2. **Phase 2: Home page**: all sections in section 5 with real motion and the procedural 3D building, fallbacks, reduced-motion mode.
3. **Phase 3: Programs & pricing**: content model, programs list/detail, pricing page, discount config and calculator, fresh graduates landing page.
4. **Phase 4: Apply flow**: multi-step form, Supabase schema + migrations, storage, emails, Turnstile, rate limiting, success page, quick interest form, contact form.
5. **Phase 5: Admin dashboard**: auth, table, filters, detail drawer, status changes, CSV export, KPIs.
6. **Phase 6: Remaining pages**: about, instructors, student work (3D viewer), for companies, FAQ, learning path, legal pages, 404, blog (MDX).
7. **Phase 7: Polish & QA**: SEO + JSON-LD + OG images, accessibility audit, Lighthouse tuning, Playwright e2e (apply flow happy path + validation errors + upload + admin login), cross-browser and mobile checks (iPhone Safari, Android Chrome), deploy to Vercel preview.

---

## 15. Handoff file (required)

Maintain `docs/HANDOFF.md` and update it **after every phase** with: what was done, files touched, what is live vs not tested, open items, gotchas, and the list of placeholders that still need real content. Never write secrets, keys, or applicant personal data into it. After updating, commit **only that file by name** (never `git add -A` for the handoff commit) with the message `Handoff: <what changed>` and push to the current branch. If push fails, do not force; say so.

---

## 16. Placeholders I must provide later (list them clearly in the handoff and in `content/TODO-content.md`)

- Official logo files and exact brand hex codes (if you could not extract them)
- Real program list, prices, durations, cohort dates, seats
- Final discount percentages and eligibility rules
- Instructor names, photos, bios, LinkedIn
- Real stats (students, projects, partners)
- Student work images / models
- Academy email, phone, WhatsApp, address (Fort Worth, TX for in-person)
- Payment / installment policy and refund policy
- Domain name (for example a subdomain like academy.baybimdesigns.com or a separate domain)
- Approval to reuse Bay BIM Designs client testimonials
- Supabase, Resend, Turnstile keys

Use clear visible placeholders like `[PRICE]`, `[DATE]`, `[INSTRUCTOR NAME]` in the UI (styled subtly) so nothing fake looks real.

---

## 17. Definition of done (check every item before saying it is finished)

- [ ] Brand colors and fonts match baybimdesigns.com, documented in `docs/brand-reference.md`
- [ ] Home page 3D hero, scroll story (clash detection + 4D + LOD slider), learning path, and all sections work on desktop and mobile
- [ ] Reduced-motion and no-WebGL fallbacks look good
- [ ] Apply flow: 5 steps, validation, autosave, uploads, fresh-grad auto-banner, price summary, Turnstile, DB insert, both emails, success page
- [ ] Discounts configurable in one file, fresh grad clearly the biggest and highlighted site-wide
- [ ] Admin dashboard: login, filters, detail, signed file links, status updates, CSV export
- [ ] RLS enabled and tested; no secret in client bundle
- [ ] Lighthouse mobile 90+ on all four scores for Home, Programs, Apply
- [ ] axe-core: zero serious/critical issues
- [ ] Playwright e2e tests pass
- [ ] SEO: metadata, sitemap, robots, JSON-LD, OG images
- [ ] README explains setup, env vars, Supabase migrations, deploy steps, and how to edit programs/discounts
- [ ] `docs/HANDOFF.md` updated and pushed

Start now with Phase 1. Show me the extracted brand palette and fonts before moving to Phase 2.
