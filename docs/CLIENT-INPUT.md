# Client input: what we need from you

This is the list of everything the VDC Academy site still needs from Bay BIM Designs. Answer what you can, skip what you cannot yet, and send it back in one go (see "How to send it back" at the end).

Nothing on the site shows a placeholder. Until a value arrives, the site either hides that line or shows a studio draft that you need to confirm. The live checklist is the dev page `/content-status/`, read straight from the code.

Each table has three columns:
- **What we need**: the item and the format.
- **Where it goes**: the exact file and key in the code, for the person who drops it in.
- **Until it arrives**: what visitors see today.

---

## 1. Brand and logo

| What we need | Where it goes | Until it arrives |
|---|---|---|
| **Logo files.** SVG (preferred) and PNG, 2000 px wide, on a transparent background. One version for light backgrounds and one for dark. | `components/ui/Logo.tsx` (`Logo`, `LogoMark`) | A code-drawn stepped mark and the "VDC Academy" wordmark set in a stand-in font. |
| **Eurostile Extended font files, licensed for web use.** WOFF2 (or OTF to convert), plus a copy of the license that covers web embedding. | `app/layout.tsx` (the `logo` font, `--font-logo`), used only by `components/ui/Logo.tsx` | Michroma, a free look-alike, is used in the wordmark only. |
| **Brand rules, if any.** A brand guide PDF or a short note on colors, clear space and what not to do. | `docs/brand-reference.md` | The site follows the approved studio design. |

## 2. Domain

| What we need | Where it goes | Until it arrives |
|---|---|---|
| **The domain or subdomain** for the academy, for example `academy.baybimdesigns.com`, and who manages its DNS. | `content/site.ts` > `content.domain`, and the build variable `NEXT_PUBLIC_SITE_URL` (steps in `docs/CUSTOM-DOMAIN.md`) | The site lives at `morcosfady.github.io/vdc-academy`. Canonical links and the sitemap point there. |
| **DNS access or a contact** who can add one CNAME record. | DNS provider, not the code | Same as above. |

## 3. Programs

The site lists these 11 programs. For each one, please confirm or correct the title, level, one-line summary, outcomes and modules. You can mark up the program pages on the live site or reply in text.

| # | Title | Level |
|---|---|---|
| 1 | VDC Professional Bootcamp | All levels |
| 2 | BIM Fundamentals with Revit | Beginner |
| 3 | Revit Architecture | Intermediate |
| 4 | Revit Structure | Intermediate |
| 5 | Revit MEP | Intermediate |
| 6 | Low Voltage & Technology Systems BIM | Intermediate |
| 7 | Revit Family Creation | Advanced |
| 8 | Navisworks: Coordination & Clash Detection | Intermediate |
| 9 | 4D/5D Construction Simulation | Advanced |
| 10 | Dynamo for Revit (BIM Automation) | Advanced |
| 11 | BIM Management & ISO 19650 basics | Advanced |

| What we need | Where it goes | Until it arrives |
|---|---|---|
| **Program list.** Confirm the 11 titles, or tell us which to add, drop or rename. | `content/programs.ts` > `base[]`, `title` and `slug` | The 11 programs above are live with studio-written text. |
| **Level** per program: Beginner, Intermediate, Advanced or All levels. | `content/programs.ts` > `base[]`, `level` | Studio levels as in the table above. |
| **Summary** per program: one short sentence. | `content/programs.ts` > `base[]`, `summary` | Studio-written summaries. |
| **Outcomes** per program: 3 to 5 lines, each starting with a verb. | `content/programs.ts` > `base[]`, `outcomes` | Studio-written outcomes. |
| **Modules and lessons** per program: module titles, with 3 to 5 lessons each. | `content/programs.ts` > `base[]`, `modules` | A studio-written draft syllabus. |
| **Prerequisites, software and projects** per program. | `content/programs.ts` > `base[]`, `prerequisites`, `software`, `projects` | Studio-written lists. |
| **Certificate wording**, if different from "Certificate of completion from VDC Academy by Bay BIM Designs". | `content/programs.ts` > `p()` default `certificate` | That default wording. |

## 4. Prices, durations and schedules

These are the studio drafts today. Please confirm or replace every cell. Prices are in USD before discounts.

| Program | Price | Weeks | Hours | Format | Schedule | Next cohort | Seats |
|---|---|---|---|---|---|---|---|
| VDC Professional Bootcamp | $6,900 | 16 | 160 | Online live | Mon, Wed, Thu evenings | January 12, 2027 | 16 |
| BIM Fundamentals with Revit | $1,200 | 4 | 32 | Online live | Tue and Thu evenings | January 12, 2027 | 20 |
| Revit Architecture | $1,800 | 6 | 48 | Online live | Mon and Wed evenings | February 9, 2027 | 16 |
| Revit Structure | $1,800 | 6 | 48 | Online live | Tue and Thu evenings | February 9, 2027 | 16 |
| Revit MEP | $1,900 | 6 | 48 | Online live | Mon and Wed evenings | February 9, 2027 | 16 |
| Low Voltage & Technology Systems BIM | $1,900 | 5 | 40 | Online live | Sat mornings | March 6, 2027 | 12 |
| Revit Family Creation | $900 | 3 | 24 | Online live | Sat mornings | March 6, 2027 | 16 |
| Navisworks: Coordination & Clash Detection | $1,600 | 5 | 40 | Online live | Mon and Wed evenings | March 23, 2027 | 16 |
| 4D/5D Construction Simulation | $1,900 | 5 | 40 | Online live | Tue and Thu evenings | April 13, 2027 | 12 |
| Dynamo for Revit (BIM Automation) | $1,100 | 4 | 32 | Online live | Tue and Thu evenings | March 23, 2027 | 16 |
| BIM Management & ISO 19650 basics | $2,200 | 6 | 48 | Online live | Sat mornings | April 13, 2027 | 12 |

| What we need | Where it goes | Until it arrives |
|---|---|---|
| **Price per program**, full price in USD. | `content/programs.ts` > `DRAFT[slug].priceFull`, then `content/site.ts` > `confirmed.prices = true` | "Price on request" on program pages, with "We send the price with your acceptance message." |
| **Plan prices**: Single course (draft $1,200), Track bundle (draft $3,900), VDC Bootcamp (draft $6,900). Also confirm the plan names, notes and feature lines. | `content/plans.ts` > `draft[]`, `price`, `name`, `note`, `feats` | /pricing says "Prices are being finalized" and offers the price list by email. |
| **Duration** per program, in weeks. | `content/programs.ts` > `DRAFT[slug].durationWeeks`, then `content/site.ts` > `confirmed.schedules = true` | The weeks fact is hidden on program pages and cards. |
| **Total hours** per program. | `content/programs.ts` > `DRAFT[slug].hours` | The hours fact is hidden. |
| **Format** per program: Online live, In-person or Hybrid. | `content/programs.ts` > `DRAFT[slug].format` | The format fact is hidden. |
| **Schedule** per program: days and time of day, with time zone. | `content/programs.ts` > `DRAFT[slug].schedule` | The schedule line in the price box is hidden. |
| **Next cohort start date** per program, written as "January 12, 2027". | `content/programs.ts` > `DRAFT[slug].nextCohortDate` | The cohort line in the price box is hidden. |
| **Seats** per cohort, per program. | `content/programs.ts` > `DRAFT[slug].seats` | The seats line in the price box is hidden. |
| **Academy-wide next cohort date**, if there is one headline date. | `content/site.ts` > `content.nextCohort` (draft "January 12, 2027", set `approved: true`) | Hidden. |

## 5. Discounts

| What we need | Where it goes | Until it arrives |
|---|---|---|
| **Fresh graduate discount**: confirm 40%, and the rule "graduated within the last 24 months", proof by graduation certificate or transcript. | `config/discounts.ts` > `discounts.freshGrad.percent`, `freshGradMonths`, `discounts.freshGrad.proof` | The site shows 40% and the 24-month rule as defaults. |
| **Student discount**: confirm 25% for students enrolled in engineering, architecture or construction, proof by student ID. | `config/discounts.ts` > `discounts.student` | The site shows 25% as a default. |
| **Group discount**: confirm 15% for 3 or more people from one company, approved by an admin. | `config/discounts.ts` > `discounts.group` | The site shows 15% as a default. |
| **Early bird**: confirm 10% when applying 30 or more days before the cohort starts. | `config/discounts.ts` > `earlyBird.percent`, `earlyBird.daysBeforeStart` | The site shows 10% and 30 days as defaults. |
| **Stacking rule**: confirm that early bird stacks with the fresh graduate discount and every other combination takes the single best discount. | `config/discounts.ts` > `earlyBirdStacksWithFreshGrad` | The site applies that rule. |

## 6. Payment, installments and refunds

| What we need | Where it goes | Until it arrives |
|---|---|---|
| **Payment methods** you accept (card, bank transfer, company invoice) and when payment is due. | `content/copy-pages.ts` > `pages.terms`, and the pricing FAQ in `content/faqs.ts` | Terms and FAQ say payment options are confirmed in the acceptance message. |
| **Installment options**: number of payments, schedule, any fee. | `content/faqs.ts` (pricing answers), `content/copy-pages.ts` > `pages.terms` | "We confirm payment options in your acceptance message." |
| **Refund policy**: deadlines, amounts, what happens if a cohort is moved or cancelled. A short paragraph is enough. | `content/copy-pages.ts` > `pages.terms`, `content/faqs.ts` | "We confirm refund terms in your acceptance message." |

## 7. Instructors

Send this for each instructor.

| What we need | Where it goes | Until it arrives |
|---|---|---|
| **Name** as it should appear. | `content/site.ts` > `content.instructors[].name` | /instructors shows a role profile and the teach-with-us form, is not indexed, and the footer has no Instructors link. |
| **Role**, for example "Senior BIM Coordinator". | `content/site.ts` > `content.instructors[].role` | Same as above. |
| **Years of experience**, a number. | `content/site.ts` > `content.instructors[].years` | Same as above. |
| **Short bio**: 2 or 3 plain sentences, no more than 60 words. | `content/site.ts` > `content.instructors[].bio` | Same as above. |
| **Photo**: JPG, square, at least 1200 x 1200 px, face and shoulders, plain background. File name `instructor-firstname-lastname.jpg`. | `assets/raw/`, then `content/site.ts` > `content.instructors[].photo` | Same as above. |
| **LinkedIn profile URL** (optional). | `content/site.ts` > `content.instructors[].linkedin` | Same as above. |

## 8. Contact

| What we need | Where it goes | Until it arrives |
|---|---|---|
| **Academy email address** for questions and applications. | `content/site.ts` > `content.contact.email` | The footer, menu, contact page and form fallbacks hide the email line. |
| **Phone number** with area code. | `content/site.ts` > `content.contact.phone` | /contact hides the phone line. |
| **WhatsApp number**, digits only with country code, for example `18175550100`. | `content/site.ts` > `content.contact.whatsapp`, and the build variable `NEXT_PUBLIC_WHATSAPP` for the floating button | No WhatsApp line and no floating button. |
| **Office hours**, for example "Mon to Fri, 9 to 5 CT". | `content/site.ts` > `content.contact.hours` | Hidden from the contact title block. |
| **Response time**: confirm "Within two working days". | `content/site.ts` > `content.contact.responseTime` | Shown as written by the studio. |
| **Address**: confirm "Fort Worth, TX", or give a street address if you want one shown. | `content/site.ts` > `content.contact.address` | "Fort Worth, TX" is shown. |
| **Booking link** for a 15-minute advisor call (Calendly, Microsoft Bookings or similar). | `content/site.ts` > `content.contact.bookingUrl` | No "Book a call" button on /contact. |

## 9. Photos

Send originals, not screenshots: JPG or PNG, the largest size you have (at least 2400 px on the long side), no logos of other companies, and permission from anyone who can be recognized. They are graded and optimized by `scripts/make-images.mjs` (see `docs/image-credits.md`).

| What we need | Where it goes | Until it arrives |
|---|---|---|
| **BIM screen close-up**: Revit or Navisworks on a monitor, landscape 16:9. File `photo-why-screen.jpg`. | `assets/raw/`, then `content/media.ts` > `media.whyScreen` | A stock photo of engineers reviewing drawings on site. |
| **Someone using the model on site**: portrait 4:5. File `photo-why-site.jpg`. | `content/media.ts` > `media.whySite` | A stock photo of an engineer with a tablet on site. |
| **A recent graduate or junior engineer at work**: portrait 4:5. File `photo-grad.jpg`. | `content/media.ts` > `media.grad` (fresh graduates page) | A stock photo of a young engineer on site. |
| **The team at work**: landscape. File `photo-team.jpg`. | `content/media.ts` > `media.team` (About and For companies) | A stock photo of three engineers at a laptop. |
| **About page lead photo**: a building or project you delivered, landscape. File `photo-about-hero.jpg`. | `assets/images/index.ts` > `photos.hero` (used on /about) | A stock photo of a glass facade. |
| **Program cover images** (optional): one model view per program, 16:10, 1600 x 1000 px or larger. File `cover-<slug>.jpg`, slug from `content/programs.ts`. | `assets/images/covers.ts`, mapped in `content/media.ts` > `covers` | Our own renders of the study model, one per program. |

## 10. Testimonials and proof

| What we need | Where it goes | Until it arrives |
|---|---|---|
| **Written approval** to reuse the client quote that begins "We spent about 6 months working with Bay BIM Designs to kick start our BIM practice". A reply email from the client saying yes is enough. Also confirm the attribution "COO at a Technology Design Firm". | `content/site.ts` > `content.testimonials[0].approved = true`, and `.who` | The quote is hidden on /for-companies. |
| **More quotes** (optional): the exact words, the person's role and company type, and their written approval. | `content/site.ts` > `content.testimonials[]` | Nothing extra is shown. |
| **Student work** (optional): project images (JPG, 16:10, 1600 px wide), a title and the program. Files `work-<slug>-1.jpg`. | `content/site.ts` > `content.studentWork[]` | /student-work shows four example projects built from the program covers and is not indexed. |
| **Real numbers** (optional): for example graduates trained or years in practice, with what each number counts. | `content/site.ts` > `content.stats[]` | No stats row. |

## 11. Social links

| What we need | Where it goes | Until it arrives |
|---|---|---|
| **LinkedIn company page URL.** | `content/site.ts` > `content.social.linkedin` | The footer and the search structured data leave LinkedIn out. |
| **Other networks** (YouTube, Instagram), if you want them shown. | Needs a small code change in `content/site.ts` > `content.social` and the footer | Not shown. |

## 12. Legal review

The privacy policy and terms live in `content/copy-pages.ts` (`pages.privacy`, `pages.terms`). The studio wrote them. A lawyer needs to confirm these lines before launch.

| What we need | Where it goes | Until it arrives |
|---|---|---|
| **Retention periods** (privacy, "How long we keep it"): documents 12 months after a decision, account records while the account exists, messages and leads 24 months. | `content/copy-pages.ts` > `pages.privacy` | Shown as written by the studio. |
| **Deletion handling time**: "within 30 days" after the profile page button (privacy, "Your choices"). | `content/copy-pages.ts` > `pages.privacy` | Shown as written by the studio. |
| **Governing law**: "the laws of the State of Texas" (terms, "Changes and liability"). | `content/copy-pages.ts` > `pages.terms` | Shown as written by the studio. |
| **Legal entity name and address** in "Who we are" (currently "Bay BIM Designs in Fort Worth, Texas"). | `content/copy-pages.ts` > `pages.privacy`, `pages.terms` | Shown as written by the studio. |
| **Minimum age** for an account (terms, "Your account": 16). | `content/copy-pages.ts` > `pages.terms` | Shown as written by the studio. |
| **Refund terms and payment or installment policy** (see section 6). | `content/copy-pages.ts` > `pages.terms` | The terms say they are sent with the acceptance message. |
| **Data location and processors**: Supabase in the United States (us-east-1), Resend, Cloudflare Turnstile, GitHub Pages; add Google if Google sign-in is turned on. | `content/copy-pages.ts` > `pages.privacy` | Shown as written by the studio. |
| **Marketing consent wording** (opt-in checkbox) and the unsubscribe route (profile page or reply). | `content/copy-pages.ts` > `pages.privacy`, and the form copy | Shown as written by the studio. |
| **State and US privacy notices**: whether a Texas or US-wide notice needs extra disclosures (for example a "do not sell" statement) for the expected audience. | `content/copy-pages.ts` > `pages.privacy` | No extra disclosures. |
| **Software trademarks**: confirm that showing names like Revit and Navisworks as plain text chips (no logos) is fine. | `content/programs.ts` > `base[]`, `software` | Names are shown as text chips. |

## 13. Analytics and Search Console

| What we need | Where it goes | Until it arrives |
|---|---|---|
| **Analytics choice and access**: Umami or Plausible, the script URL and the website ID or domain. Cookieless, no personal data. | Build variables `NEXT_PUBLIC_ANALYTICS_PROVIDER`, `NEXT_PUBLIC_ANALYTICS_SCRIPT`, `NEXT_PUBLIC_ANALYTICS_WEBSITE_ID` or `NEXT_PUBLIC_ANALYTICS_DOMAIN` (read in `lib/analytics.ts`) | No analytics script loads. |
| **Google Search Console and Bing Webmaster access**: add us as a user on the domain property, or let us verify it by DNS. | Outside the code; the sitemap is `/sitemap.xml` | No search data. |

## 14. Service accounts (the owner's, for reference)

Supabase (database and sign-in), Resend (email) and Cloudflare Turnstile (spam check) run under the owner's accounts, not the client's. They are listed here so nothing is forgotten. Keys go in `.env.local` as listed in `.env.example`; setup is in `docs/SETUP-SUPABASE.md` and `docs/HANDOFF.md`. Nothing is needed from the client here unless you want the accounts in your own name.

## 15. Copy to read once

The site text is written in the house tone by the studio. Please read it once and mark anything that is wrong for you: home (`content/copy.ts`), inner pages (`content/copy-pages.ts`) and FAQ (`content/faqs.ts`). In particular: the team training process on /for-companies, the "Your first 90 days" path on /fresh-graduates, the client types on /about, and the three plan "best for" lines on /pricing.

---

## How to send it back

1. Reply to this email with your answers typed under each section number. Short answers are fine.
2. Put files in one shared folder (Google Drive, OneDrive or Dropbox) with these subfolders: `logo`, `font`, `photos`, `instructors`, `student-work`, `legal`.
3. Name files as listed above, for example `photo-why-screen.jpg`, `instructor-jane-doe.jpg`, `cover-revit-mep.jpg`.
4. For the font, include the license file next to the font files.
5. For the testimonial, forward the client's approval email as it is.

## Priority

**Blocks launch** (the site should not go public without these):
1. Prices and plan prices confirmed (section 4).
2. Durations, hours, formats, schedules, cohort dates and seats confirmed (section 4).
3. Academy contact email (section 8).
4. Legal review of the privacy policy and terms, including payment and refund terms (sections 6 and 12).
5. Licensed logo font, or a decision to keep the stand-in (section 1).
6. Domain (section 2).

**Needed soon after** (the site works without them, but looks thinner):
- Logo files, discount confirmation, phone and WhatsApp, office hours, booking link.
- Instructor profiles and photos.
- Testimonial approval.

**Nice to have**:
- Real photos and program covers, student work, stats, LinkedIn and other social links, analytics and Search Console access, a copy read-through.
