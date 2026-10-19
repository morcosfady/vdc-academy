# v6 audit (before), 2026-10-19

Full-page screenshots of every route at 1440x900 and 390x844: `docs/audit/v6-before/` (`scripts/pages-shots.mjs`). Hero and explorer shots at 1440, 1280 and 390 are in the same folder from the v5.1 round.

| # | Page | Owner's finding | Confirmed? | Cause and fix |
|---|---|---|---|---|
| 1 | /programs | First cards load blank or faded | Yes (partly). Cards start at opacity 0.02 and fan in with a stagger; on a slow machine the first row stays faded for up to a second. | No entrance animation for anything in the first viewport; images above the fold get `priority`. |
| 2 | /programs | Most card images are the same building | Yes. v5.1 renders are eleven angles of the whole model; only clash and family read as specific. | Eleven procedural discipline scenes (`components/three/DisciplineScene.tsx`), close-ups in one art style. |
| 3 | /programs | Low voltage image too dark | Yes (ink background render). | Light paper background for every scene. |
| 4 | /programs | "Price on request" on all 11 cards | Yes. | Cards show duration and format when set, else the level only. One note above the grid while prices are unset. |
| 5 | /programs | No fresh graduate message | Yes. | Brass-accented line under the intro linking to /fresh-graduates. |
| 6 | /fresh-graduates | Big number shows "5%", image is a grey box | Not reproducible headless: the HTML carries "40" and the photo loads. The number counts up from 0 over 1.8 s when it enters view, so a screenshot mid-count shows "5%"; the photo is lazy and below a tall hero on some sizes, so it can paint late as its paper-2 container. | Count-up shortened and guaranteed to land on the final value; hero images `priority` with explicit size and no transform animation. Test: visible text equals the final value after 3 s; no empty image on any page. |
| 7 | /about | Empty grey image box | Same cause as 6 (lazy image in a paper-2 box). | Priority image, plus the page is filled (story, how we teach, studio work, values, location map, CTA). |
| 8 | /pricing | Everything says "Price on request", calculator pointless | Yes. | Designed "no prices yet" state: how pricing works, request-the-price-list form, discounts schedule; calculator hidden until prices exist. |
| 9 | /for-companies | Text only, thin | Yes. | Hero visual, 4-step process, coverage grid, formats, proof behind approval, richer form. |
| 10 | /contact | Form only, coordinates panel | Yes. | Contact title block from `content/site.ts`, static SVG map, advisor call link, quick links. |
| 11 | /instructors, /student-work | One-liners | Yes. | Instructor profile with line-drawn silhouettes and a teach-with-us form; "What you will build" example projects. |
| 12 | /apply | Form not live, only name and email | Yes. Without Supabase keys the page short-circuits to the fallback. | Full 5-step form always; Supabase insert-only backend; honest fallback on submit when keys are missing; setup doc; mocked tests. |
| 13 | /faq | Plain accordions | Yes. | Category tabs, live search, advisor link. |

Section 7 of the brief (hero tilt and drag, bubble controls, visible LOD levels, explorer framing) shipped in v5.1 (`a084687`); re-verified in this round's QA.
