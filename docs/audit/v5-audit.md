# v5 audit (before)

Screenshots: `docs/audit/v5-before/` (home, 1440x900, 1024x768, 390x844, every chapter).
Owner verdict after round 4: "I don't like it. We can do much, much better."

## Root cause
The site has features but no design idea. It is dark sections stacked with a 3D toy in the middle.

## Issues, by area

### Composition
1. Hero: the 3D stack sits right behind the headline column; the callout pills (LOD 350, MEP, Clash) float over the model.
2. Explorer: a big canvas with a small text column. The info card and chips are the same weight as everything else.
3. Programs: the floor selector is clipped on the left (cards start at x=118 to 138, staggered by design, reads as a bug). A tiny 3D model sits between the list and the cards, overlapping both.
4. Fresh grads: a floating toast ("Fresh grads save 40%") overlaps the "Check if I qualify" button.
5. Learning path: cards clip at the left edge at 1440.
6. Why: on tablet each image fills a full screen with one line of text.

### Dead space
7. Dark to light bands are 300 to 600px of empty gradient (fresh grads top ~180px of nothing).
8. Ghost numbers ("9,000") and grid bubbles bleed through at 5 to 8 percent and read as dirt, not as intent.

### 3D
9. The model is stacked flat trays with white columns. It looks like a placeholder primitive, not architecture.
10. It is blue glass on blue ink, so it glares and competes with the text.

### Typography
11. No hierarchy system. Headline, eyebrow, body and card titles are all one weight class.
12. Tiny uppercase labels everywhere ("02 · THE MODEL", "FLOOR 6", "WHO"). Three type voices (Michroma, Poppins heading, Poppins body) with no rule.

### Rhythm
13. Every section is eyebrow, headline, paragraph, widget on the right. Monotonous.
14. Dark for 4 of 6 chapters; the light chapters are a pale blue wash, not paper.

### Navigation chrome
15. The chapter rail is still visible at 1440 (right edge ticks) and sits near content.

### Color
16. Gradients, glows and glass blur are used as decoration. Accent blue appears on buttons, tags, lines, glows and the model at once.

## Keep (plumbing that works)
Routing, `content/*.ts`, apply form logic and validation, discount config, Supabase insert layer, reduced-motion and comfort helpers, tests harness, deploy workflow.

## Redo
Layout, type system, section designs, 3D art, imagery grading, motion choreography.
