# VDC Academy v1 audit

Date: 2026-10-10. Live site: https://morcosfady.github.io/vdc-academy/
Evidence: `docs/audit/v1/` (screenshots at 1440, 1024, 768, 390; dark and light for home; results.json; Lighthouse JSON). Scripts: `scripts/audit.mjs`.

## Scores
| | Mobile | Desktop |
|---|---|---|
| Lighthouse Performance (home) | **59** (LCP 4.2 s, TBT 1.4 s, CLS 0.06) | 100 |
| Accessibility | 97 | 97 |
| Best practices | 96 | 96 |
| SEO | 100 | 100 |

axe (home, dark, 1440): color-contrast (serious, 18 elements), region (moderate).
axe on program detail: definition-list structure (serious). Programs list: heading order. Apply page does not exist yet (404).

## Problems
### Bugs (confirmed)
1. **Hero H1 text has no spaces**: DOM and innerText both read `BecometheBIM&VDCExpertEveryProjectNeeds.` (inline-block word spans, no space nodes). Broken for screen readers and search engines. No aria-label.
2. **Fresh grad counter reads `0%`** in the rendered page (count-up does not reach 40 before/without scrolling into view in some cases). The number must be real text from the first paint.
3. Home links to `/apply`, `/contact`, `/about`, `/faq`, etc. that do not exist: 404 on prefetch (5 console errors on every page) and dead buttons. Apply is the main conversion path and 404s.
4. Program detail `<dl>` markup invalid (axe serious).
5. Learning path repeats "BIM Coordinator" (step 3 role and step 5 title).
6. Scroll story: only the active stage shows text, so steps 2 to 4 look empty in any static view. LOD slider default 500 with no explanation of what changes.

### Content
7. **52 visible placeholder strings on home**, 23 on /programs, 14 on a program page, 7 on pricing: `[XX]`, `[DATE]`, `[DURATION]`, `[FORMAT]`, `[PRICE]`, `[INSTRUCTOR NAME]`, `[ROLE]`, `[YEARS]`, `[SHORT BIO]`, `[LINK]`, `[STUDENT PROJECT n]`, `[approval pending]`. The site looks unfinished.
8. All 11 program cards carry the same "up to 40% off" line and the same placeholder pair: a wall of sameness.
9. A client testimonial marked "[approval pending]" is public.

### Visual design and layout
10. 13 stacked sections, home page is 15,400 px tall on desktop and 18,700 px on mobile (17 to 22 screens). Feels like a template, no one idea per screen.
11. Sheet-tag labels (A-101, B-201 ... L-1201) on every section, repeated and noisy.
12. Software marquee is a plain text list. Instructors and student work are empty grids.
13. Cards are generic bordered boxes. No hierarchy, no premium feel, no depth or parallax.
14. Announcement bar competes with the header. Header and hero feel cramped, headline is wide-tracked and heavy.

### 3D
15. The building is a flat-shaded box stack with opaque slabs: no glass, no refraction, no environment lighting, no clear signature object. Reads like a primitive model, not a hero.
16. Scenes mount separate WebGL canvases (hero, story, path, viewer, CTA): up to 5 contexts.
17. No pre-rendered poster, so LCP waits on JS and canvas.

### Motion
18. Reveals are generic fade-up. No stepped-panel motif, no parallax layers, no page transitions.

### Mobile
19. Home is very long. Pinned scroll story and carousels work but the portrait canvas shows a cropped building at some states.

### Accessibility
20. Contrast failures (18 elements) on home, 9 on apply page area. Missing landmark `region` on every page.

### Performance
21. Mobile TBT 1.4 s and LCP 4.2 s from heavy client JS (three, GSAP, Lenis, motion all hydrate at once) and 3D scenes starting immediately.

## What stays
Routes, `content/programs.ts`, discount config and pricing logic, reduce-motion toggle, WhenVisible/no-WebGL fallback idea, GitHub Pages deploy workflow.
