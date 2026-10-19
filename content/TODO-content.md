# Content the owner must provide

Nothing here shows as a placeholder on the site. Items marked DRAFT are shown with studio-written values so every page is complete; replace them with the real ones. Edit `content/site.ts`, `content/programs.ts`, `content/plans.ts`, `content/copy.ts` (home copy) and `content/copy-pages.ts` (inner pages).

## Replace the drafts
- [ ] DRAFT prices per program (`DRAFT` block at the bottom of `content/programs.ts`) and per plan (`content/plans.ts`)
- [ ] DRAFT durations, hours, formats, schedules, seats, cohort dates (same `DRAFT` block)
- [ ] DRAFT next cohort date (`content.nextCohort` in `content/site.ts`)
- [ ] Final discount percentages and rules (`config/discounts.ts`, defaults: fresh grad 40, student 25, group 15, early bird 10)
- [ ] Read all copy in `content/copy.ts` and `content/copy-pages.ts` once; it is written in the house tone but by the studio

## Still hidden until provided
- [ ] Academy email, phone, WhatsApp (`content.contact`)
- [ ] LinkedIn company URL (`content.social.linkedin`)
- [ ] Instructors: names, roles, photos, bios (`content.instructors`), then the Instructors page appears
- [ ] Student work images (`content.studentWork`), then the Student Work page appears
- [ ] Real stats if wanted (`content.stats`)
- [ ] Approval to reuse the Bay BIM client quote (`content.testimonials[0].approved = true`)

## Photography (see docs/image-credits.md)
- [ ] A real BIM screen close-up (Revit or Navisworks on a monitor) for the home "Why" landscape slot (`media.whyScreen`)
- [ ] Photos of instructors and students at work to replace the stock people photos (`content/media.ts`)
- [ ] Course project imagery for the eleven program cards (`covers` in `content/media.ts`)

## Other
- [ ] Payment, installment and refund policy (Terms page currently says terms are sent with acceptance)
- [ ] Domain (for example academy.baybimdesigns.com)
- [ ] Licensed Eurostile Extended font files for the logo (Michroma is the stand-in, used in the logo only)
- [ ] Confirm trademark use for software names (shown as text chips, no logos)
- [ ] Supabase, Resend, Turnstile keys (see docs/HANDOFF.md)

## From v6
- [ ] Office hours (`content.contact.hours`), shown in the contact title block when set
- [ ] Booking link for a 15-minute advisor call (`content.contact.bookingUrl`), shows the "Book a call" button on /contact
- [ ] Confirm the response time line "Within two working days" (`content.contact.responseTime`, approved by the studio for now)
- [ ] Email, phone and WhatsApp (`content.contact`): until set, /contact shows only the location, coordinates, response time and the map
- [ ] Installment options per cohort (the pricing FAQ says "We confirm payment options in your acceptance message")
- [ ] Refund terms (the pricing FAQ says "We confirm refund terms in your acceptance message")
- [ ] Confirm the three plan "best for" lines and the "Prices are being finalized" note on /pricing, then set real prices in `content/plans.ts`
- [ ] Confirm the team training process, coverage topics and formats on /for-companies (on site in DFW, live online, hybrid)
- [ ] Confirm the "Your first 90 days" typical path on /fresh-graduates (Week 1 Revit basics, Week 4 first coordinated model, Week 8 clash meeting, Week 12 portfolio review)
- [ ] Confirm the "From the studio to the classroom" client types and descriptions on /about (AE design firms, GCs and subcontractors, owners)
- [ ] Instructor names, roles and photos (`content.instructors`); until then /instructors shows the role profile and the teach-with-us form
- [ ] First cohort projects (`content.studentWork`); until then /student-work shows four example projects from the program covers
- [ ] FAQ: confirm the new answers in `content/faqs.ts` (software list, laptop check, group discount approval, on-site training)
