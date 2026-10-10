# Brand reference: baybimdesigns.com (re-checked Oct 10, 2026)

Method: opened https://baybimdesigns.com/ in a real browser and read the computed styles of every visible element (`scripts/brand-probe.mjs`), plus the Elementor CSS.

## Palette (confirmed)

| Role | Value | Seen on the brand site |
|---|---|---|
| Ink (main dark) | `#0A1D23` | text and dark sections (93 elements) |
| Deep | `#000E12` | darkest shade, footer and vignettes |
| Slate steel | `#365B62` | borders, buttons, icons (55 borders, 10 fills) |
| Pale blue | `#DEEFFD` | light tint |
| Charcoal text | `#333333` | body text (1,175 elements) |
| Grey text | `#69727D` | secondary text |
| White | `#FFFFFF` | |

### `#216FF3` and `#CC3366` are NOT brand colors
`rgb(33, 111, 243)` (`#216FF3`) and `rgb(204, 51, 102)` appear on the brand site only on the **Readabler accessibility widget** (`.mdp-readabler-*` elements). They are plugin colors, so they are not used.

## Fonts
- Headings and buttons on the brand site: **EurostileExtended** (156 elements), self-hosted and commercial.
- Body: **Poppins** (1,182 elements).
- Licensing: Eurostile Extended needs a web license. We do not redistribute the files. Until the owner supplies licensed files, **Michroma** (free, similar wide technical look) is used only for small uppercase labels. Headlines are Poppins SemiBold.

## VDC Academy v3 color system (no green)

Dark theme (default)
| Token | Value | Contrast |
|---|---|---|
| bg | `#0A1D23` fading to `#000E12` | |
| surface | `#10272F` | |
| border | `#365B62` at about 55% | |
| heading text | `#F2F7FB` | 16.0:1 on ink |
| body text | `#A9BCC4` | 8.8:1 on ink |
| accent (edges, links, focus) | `#7DB3E8` steel blue | 7.8:1 on ink |
| button | `#2F6FB0` with white text | 5.2:1 |
| brass (small doses) | `#C9A36A` | 7.4:1 on ink |
| clash red (clash animation only) | `#E5484D` | |

Light sections (pale blue to white): ink text `#0A1D23` (14.7:1), muted `#3D5359` (6.9:1), accent `#1F5C99` (5.9:1), brass text `#7A5A22` (5.4:1).

The steel blue and brass are derived from the brand pale blue and are a design choice, not measured brand values. A test (`tests/no-green.spec.ts`) fails if any green-hue color appears in the source.
