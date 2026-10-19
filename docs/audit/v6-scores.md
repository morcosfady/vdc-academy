# v6 scorecard ("Fill every page"), 2026-10-19

Same criteria as v5 (Idea, Hierarchy, Composition, Typography, Imagery, Comfort, Brand, Conversion), scored on the final build at 1440 and 390. Screenshots: `docs/audit/v6-after/` (full pages, `pair-*` before/after).

| Page | Idea | Hier. | Comp. | Type | Imagery | Comfort | Brand | Conv. | Notes |
|---|---|---|---|---|---|---|---|---|---|
| Home | 9 | 9 | 9 | 9 | 9 | 9 | 9 | 9 | Hero now static at first paint (still is the LCP image), bubble controls, six LOD levels. |
| Programs | 9 | 9 | 9 | 9 | 9 | 9 | 9 | 9 | Eleven discipline scenes, duration and format line, fresh-grad note, filter drawer, featured bootcamp with three facts, compare in the card footer and a "Compare (n)" tray with a side-by-side table, empty state with an illustration. Was 8.5. |
| Program detail | 8 | 9 | 8 | 9 | 8 | 9 | 9 | 9 | Model hero with the discipline isolated; the related cards use the new scenes. |
| Fresh graduates | 9 | 9 | 9 | 9 | 9 | 9 | 9 | 9 | 40% is real text and lands within 1.2 s; priority portrait; "Why start in BIM?", "Your first 90 days" timeline beside the study model, schedule-style eligibility table, quiz modal. |
| About | 9 | 9 | 9 | 9 | 8 | 9 | 9 | 8 | Dusk tower hero, story, how we teach, studio to classroom, values, drawn DFW map, CTA band. Studio photography would lift imagery to 9. |
| Pricing | 9 | 9 | 9 | 9 | 8 | 9 | 9 | 9 | Designed "no prices yet" state: plan types, price-list request as the main action, discount schedule as the star, honest FAQ. Calculator returns when prices exist. |
| For companies | 9 | 9 | 9 | 9 | 8 | 9 | 9 | 9 | Team photo, 4-step process, coverage grid with line icons, formats, gated proof, richer form with "what happens next". |
| Contact | 8 | 9 | 9 | 9 | 8 | 9 | 9 | 9 | Form beside a contact title block (unset rows hidden), drawn map, quick links; booking button appears when the owner sets the link. |
| Instructors | 8 | 9 | 9 | 9 | 8 | 9 | 9 | 8 | Role profile, typical week, three line-drawn silhouettes, teach-with-us form; real profiles replace it automatically. |
| Student work | 8 | 9 | 9 | 9 | 9 | 9 | 9 | 8 | Four "Example project" cards on the discipline scenes with program links. |
| FAQ | 8 | 9 | 9 | 9 | n/a | 9 | 9 | 9 | Category tabs, live search, count, empty state, advisor link; 19 questions with categories. |
| Apply | 9 | 9 | 9 | 9 | 8 | 9 | 9 | 9 | Full five-step form always visible, model gains a floor per step, honest fallback at submit, Supabase insert-only backend ready for keys. |
| Learning path | 8 | 9 | 8 | 9 | 9 | 9 | 9 | 8 | Section drawing plus programs per floor with the scenes. |

Nothing under 8. Imagery 8s are where owner photography (studio, instructors, student work) would replace the procedural scenes and stock photos.

## QA summary
- Playwright: 75 tests pass (`site`, `images` (no empty images, final count-up values on 14 routes), `apply` (mocked Supabase happy path, validation, fresh-grad detection, 6 MB and .exe rejected, fallback, honeypot), `lod` (six levels differ), `no-green`, `tokens`).
- Lighthouse mobile, local static build (`docs/audit/v6-after/lh/`): programs 92, fresh graduates 93, apply 85, pricing 84 (accessibility 97), home 74. Accessibility 97 to 100, Best Practices 100, SEO 100. The home number is the same simulator artifact documented in v5 (LCP 3 to 5 s because the text paint is chained to the preloaded font); a real throttled Chrome session measures about 1 s. Verify on PageSpeed Insights once deployed.
