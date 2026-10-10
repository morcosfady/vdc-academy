# v4 audit (before), 2026-10-10

Evidence: `docs/audit/v4-before/` (home at 1440x900, 1024x768, 390x844, dark and light, scrolled in 80% steps, 110 frames) and `scan.json` (automatic checks per frame). Script: `scripts/audit4.mjs`.

## Critical
1. **Chapter indicator overlaps content in 20 of 110 frames.** It is a round, translucent disc fixed at the right edge. It sits on the 3D model, the "certificate" card, the programs cards and the explorer controls.
2. **Empty screen between chapter 3 and 4.** The bottom of the light "Why" chapter (about 140px of padding) meets the top of the dark programs chapter (another 140px) and its heading is a `Slab` that stays invisible until it is 8% inside the viewport. For a full viewport the visitor sees only faint blueprint circles on dark. Contributing causes: `content-visibility: auto` on chapters (skipped rendering with a guessed 900px height), reveal blocks that wait for the scroll observer, and huge section padding. The automatic empty-frame detector did not flag it (the frame is not uniform, just nearly empty), so a new check also measures visible text per frame.

## Eye comfort
3. Pure white text (`#FFFFFF`, `#F2F7FB`) and near black (`#000E12`) are used in many places.
4. The 3D glass volumes and slabs are bright pale blue and glare against the dark page. Edges and columns are very light.
5. Hard jumps dark to light (explorer to "Why") and light to dark (fresh grads to path): a flat edge, so it flashes.
6. Light chapters use stark pale blue `#DEEFFD`, not a calmer tint.
7. In light OS mode the site still opens dark (system theme is ignored), and the light theme was never polished for hero and chapters.

## Typography
8. Many tiny Eurostile-style labels: callout tags (10px), LOD title, chips, indicator numbers (10 to 11px), tab labels, table headers, form labels, footer headings. About 40 uses of `.label` at 10.9px or less.
9. Eurostile (Michroma) is used for more than logo, eyebrows and numbers (price card titles, form field labels, table headers).
10. No `text-wrap: balance` on headings, no `pretty` on paragraphs.

## Layout
11. "Why" cards sit at random heights (0, 48px, 96px offsets).
12. Chips and LOD buttons are 32 to 36px tall with 13px text: crowded, small hit area, low contrast selected state.
13. Section padding is uneven (96 to 176px) and not on the spacing scale.
14. Header shows both a theme toggle and a "Menu" button on desktop.
15. Decorative noise: blueprint circles and dimension text show through card edges and light sections.

## Motion
16. Motion is limited to fade/rise reveals and the 3D build. No hero intro sequence, no drawn lines, no stepped entrances beyond one clip-path, no parallax, no micro-interactions on links and toggles, no page transitions, no animated icons.
17. Hero scroll handoff exists but is not paced (the floors separate and do not rejoin).

## Mobile
18. Chip rows wrap into 3 lines and push the 3D model down. Explorer controls need a swipe row.

## What works (keep)
Brand palette and fonts from v3, graded photography, the building model, apply flow, tests, performance work (late 3D load, lazy GSAP and motion).
