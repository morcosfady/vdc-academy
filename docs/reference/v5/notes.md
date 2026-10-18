# v5 reference notes

Screenshots in this folder (`<name>-1.png` top of page, `-2.png` after one scroll). Captured 2026-10-18 at 1440x900 by `scripts/refs.mjs`.
Note: the Foster + Partners capture landed on their 404 page (the root URL redirected in the headless browser), so the Foster notes come from the 404/header chrome and from prior knowledge of their project pages.

| Reference | Borrow (3) | Do not borrow (1) |
|---|---|---|
| likova.space | 1. One idea per screen, pacing with silence. 2. 3D used with purpose, never as wallpaper. 3. Scroll-led camera moves. | Full dark page, top to bottom. |
| fosterandpartners.com | 1. White page, near-black type, hairline header, no ornament. 2. Pill buttons in a quiet grey. 3. Huge whitespace around a single image. | Almost no motion; we need some to teach the model. |
| som.com | 1. Thin-weight type at large size, confident. 2. Edge-to-edge architectural drawings as imagery (white line on black). 3. Strict left margin alignment for every text block. | Black cookie bar dominating the first screen; we use no heavy overlays. |
| linear.app | 1. Mono micro-labels (`FIG 0.1`, uppercase) as a technical voice. 2. Thin-line isometric figures with hairline column dividers. 3. Large two-tone headline (white then grey) for hierarchy without color. | Pure black page; our dark is ink `#0A1D23`, and dark is only 3 of 7 sections. |
| apple.com | 1. One product, one sentence, one screen. 2. Scroll-scrubbed camera on a single object. 3. Generous vertical rhythm, consistent section padding. | Long sticky pinned sequences (heavy on mobile and on battery). |
| baybimdesigns.com | 1. Palette: ink `#0A1D23`, slate `#365B62`, pale `#DEEFFD`. 2. Poppins as the working typeface. 3. Straight, practical tone about BIM and VDC. | Its Readabler plugin colors (`#216FF3`, pink); they are the accessibility widget, not brand. |

## Decisions from the notes
- Mono micro-labels (Linear) become our "drawing set" voice: sheet numbers, coordinates, LOD values.
- Foster and SOM give the paper sections: white or warm paper, ink type, hairlines, no boxes.
- Likova and Apple give the single dark explorer: one object, one camera, scroll-led, one screen and a half.
