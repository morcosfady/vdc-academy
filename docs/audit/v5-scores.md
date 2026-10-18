# v5 self-critique scorecard

Scored on the final build (`docs/audit/v5-after/`), 1440 and 390, by the criteria in the brief. Anything under 8 was redesigned before moving on; the notes say what changed.

| Section | Idea | Hierarchy | Composition | Typography | Imagery / 3D | Comfort | Brand | Conversion | Notes |
|---|---|---|---|---|---|---|---|---|---|
| S1 Hero (paper) | 9 | 9 | 9 | 9 | 8 | 9 | 9 | 9 | First pass had the model cropped (camera fit to the whole canvas, not the slot) and the headline hidden until hydration (late LCP). Both fixed. The model is a white study model with grid bubbles and a dimension string; text and model never share columns. |
| S2 Explorer (ink) | 9 | 8 | 8 | 8 | 8 | 8 | 9 | 7 | Night mode, drawing-index list, one info panel, LOD centered under the model. The only text is the panel. Conversion is one link per discipline by design. First pass: model too small in its slot, fixed with `fit`. |
| S3 Why (paper, editorial) | 8 | 9 | 9 | 9 | 8 | 9 | 9 | 7 | Asymmetric rows: 4:5 portrait + headline, small text + 16:9 photo with a dimension string, 3x2 benefit list with hairlines. First pass cropped the second engineer; photo swapped. Stock people photos stand in for the owner's own. |
| S4 Programs (ink) | 8 | 8 | 8 | 8 | 7 | 8 | 8 | 9 | Drawing-sheet cards with sheet numbers and prices. First pass: featured card spanned two rows and ballooned; now a horizontal featured card plus four. Covers are three architectural crops reused; real program imagery would lift this to 8. |
| S5 Learning path (paper) | 9 | 8 | 8 | 8 | 8 | 9 | 9 | 7 | Section drawing drawn floor by floor on scroll. First pass read as five tables; redrawn as a stepped building with continuous slabs and stacked columns. Labels under each stage, nothing clipped. |
| S6 Fresh graduates (paper-2 panel) | 9 | 9 | 9 | 9 | 8 | 9 | 8 | 9 | Giant 40% with a brass underline, k/v lines, two actions, portrait at the right. The floating toast is gone. |
| S7 Final + footer (ink) | 8 | 9 | 8 | 9 | 8 | 8 | 9 | 9 | Centered headline, the night model below at 60% so it never sits behind text; title block footer. |
| /styleguide | 9 | 9 | 9 | 9 | 8 | 9 | 9 | n/a | Premium brand book: color pairs measured, type scale, grid, lines, devices, every component in both themes. |

## Still under 8 and why
- Programs imagery (7): three architectural crops carry eleven cards. Owner photos of real course projects (screens, models, site) are the fix. Noted in `content/TODO-content.md`.
- Explorer conversion (7) and Why conversion (7): by design these sections teach rather than sell; the hero, programs and the final section carry the actions.

## Mobile (390 and 360)
Headline first, full-width buttons, model square at 72% width, facts row; explorer with the model on top and a chip row; Why images at 4:5 capped at 70svh with text directly under; one-column cards; vertical learning path with a left rule. Header fits at 360 (icon-only menu below `md`). No horizontal overflow (tested).
