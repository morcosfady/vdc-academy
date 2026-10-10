# Content the owner must provide

Nothing here shows as a placeholder on the site. Each item stays hidden until you provide it and it is approved. Edit `content/site.ts`, `content/programs.ts` and `content/plans.ts`.

- [ ] Academy email, phone, WhatsApp (`content.contact`)
- [ ] LinkedIn company URL (`content.social.linkedin`)
- [ ] Next cohort date (`content.nextCohort`), then set `approved: true`
- [ ] Prices per plan (`content/plans.ts`) and per program (`priceFull` in `content/programs.ts`)
- [ ] Durations, hours, formats, schedules, seats per program
- [ ] Final discount percentages and rules (`config/discounts.ts`, defaults: fresh grad 40, student 25, group 15, early bird 10)
- [ ] Instructors: names, roles, photos, bios (`content.instructors`), then the Instructors page appears
- [ ] Student work images (`content.studentWork`), then the Student Work page appears
- [ ] Real stats if wanted (`content.stats`)
- [ ] Approval to reuse the Bay BIM client quote (`content.testimonials[0].approved = true`)
- [ ] Payment, installment and refund policy (Terms page currently says terms are sent with acceptance)
- [ ] Domain (for example academy.baybimdesigns.com)
- [ ] Licensed EurostileExtended font files (Michroma is the stand-in)
- [ ] Confirm trademark use for software names (shown as text chips, no logos)
- [ ] Supabase, Resend, Turnstile keys (see docs/HANDOFF.md)
