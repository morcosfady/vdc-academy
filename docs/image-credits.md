# Image credits

Every photo is graded the same way by `scripts/make-images.mjs` (slightly desaturated, lifted blacks, cool shadows toward ink, warm highlights toward paper) so the set reads as one shoot. Originals are kept out of the repo in `assets/raw/` (gitignored); optimized AVIF and WebP live in `assets/images/` and are mapped in `content/media.ts`. Replace a photo by dropping a new original in `assets/raw/`, pointing the job at it in `scripts/make-images.mjs` and running `node scripts/make-images.mjs`.

## People on site (Pexels License: free for commercial use, no attribution required, credit given anyway)

| Used as | Photo | Photographer | Source |
|---|---|---|---|
| Home "Why" lead photo (4:5), `media.whySite` | Confident female engineer in a hard hat using a tablet at an outdoor construction site | Mikael Blomkvist | https://www.pexels.com/photo/8961008/ |
| Home "Why" landscape photo (16:9), `media.whyScreen` (stands in for a BIM screen close-up until one is supplied) | Engineers at a construction site reviewing plans with a city skyline | Mikael Blomkvist | https://www.pexels.com/photo/8961073/ |
| Fresh graduates portrait (4:5), `media.grad` | Female engineer checks her tablet on a construction site, crane behind | Mikael Blomkvist | https://www.pexels.com/photo/8960944/ |
| About and For companies, `media.team` | Engineers in hard hats reviewing plans on a laptop | Thirdman | https://www.pexels.com/photo/8470778/ |

## Architecture (Unsplash License: commercial use allowed, no permission needed)

| Used as | Photo | Photographer | Source |
|---|---|---|---|
| Program card covers, bootcamp cover | Glass facade of a modern office building | Fabian Kleiser (@fabiankleiser) | https://unsplash.com/photos/glass-facade-of-a-modern-office-building-V5vF94h52r0 |
| Program card covers | Gray metal building frame near tower crane | Jacek Dylag (@dylu) | https://unsplash.com/photos/nhCPOp4A2Xo |
| Program card covers | Modern building's facade with vertical lines at dusk | Roman (@rm_reins) | https://unsplash.com/photos/modern-buildings-facade-with-vertical-lines-at-dusk-l71vkYSEuyE |

## Our own renders
- `assets/images/model-paper.*` and `model-night.*`: stills of the procedural study model, rendered by `scripts/poster.mjs` from `/poster`. Used as the LCP image and as the no-WebGL and reduced-motion fallback.

## Checked and not used
- Pexels 6474459 and 6474476 (woman with tablet indoors): the tablet shows a fictional company page.
- Unsplash engineer-with-laptop results: Unsplash+ (paid) license.
- "Modern glass dome building with city skyline at dusk" (Kent Chin): shows other companies' logos.

## Still wanted from the owner
- A real BIM screen close-up (Revit or Navisworks on a monitor) for the home "Why" landscape slot.
- Photos of the instructors and of students at work, to replace the stock people photos.
