# Brand reference: baybimdesigns.com

Extracted 2026-10-10 from the live site (Elementor CSS, `post-7/8/41/204.css`). Logo: https://baybimdesigns.com/wp-content/uploads/2025/10/Logo.png (201x42 PNG, striped "B" mark + "BAY BIM DESIGNS").

## Colors (exact hex from the site CSS)

| Role | Hex | Notes |
|---|---|---|
| Primary (brand teal) | `#365B62` | Elementor `--e-global-color-primary`; used 63 times: buttons, headings, borders |
| Darkest / ink | `#0A1D23` | Dark sections, small headings |
| Near-black teal | `#000E12` | Deepest background |
| Muted teal-gray | `#83969A` | Secondary text |
| Light blue-gray | `#A3BEC7` | Soft accents |
| Pale blue | `#DEEFFD` | Light tint |
| Text | `#545454` | Body text on light |
| Secondary | `#54595F` | |
| Accent (Elementor default) | `#61CE70` | Elementor default green, barely visible on the live site |
| White | `#FFFFFF` | Button fill on dark, text on dark |

## Fonts

- Headings and buttons: **EurostileExtended** (custom self-hosted, commercial font), 700, headings 46 to 60px, line-height about 1.2, `capitalize` on some.
- Body: **Poppins**, 400.
- Elementor also loads Roboto and Roboto Slab, rarely used.
- The academy cannot ship EurostileExtended without a license. We use **Michroma** (Google Fonts, similar wide techno look) for headings until the owner supplies the licensed files. Swap in `app/layout.tsx`.

## Buttons and shapes

- Primary button: fill `#365B62`, white text, 1px solid `#365B62`, radius **4px**, padding 16px 24px, 16px EurostileExtended, capitalize.
- Inverse button (on dark): white fill, `#365B62` text.
- Cards: radius 16px (most common), some 24px and 22px.
- Small buttons on mobile: 12px, padding 10px 8px.

## Tone and copy

- "Bay BIM Designs partners with architects, contractors, and engineers to deliver top-quality BIM and VDC solutions that ensure project success before construction."
- Services line: "BIM Modeling, Consulting & Coordination, Clash Detection & VDC Services, Revit Family Creation & Virtual Construction Simulation. Fort Worth TX"
- Professional, engineering, results oriented. Testimonials from technology contractors and design firms.
- One testimonial confirms Bay BIM trained a Low Voltage Electrical design-build firm's team over about 6 months (owner approval needed before reuse).

## Navigation (main site)

About Bay BIM, BIM Solutions, BIM for AE Design Firms, BIM for GC + Subcontractors, BIM for Owners, Blog, "Connect with an Expert" (CTA).

## Academy design tokens (derived)

Dark first: background `#000E12`, elevated `#0A1D23`, surface `#102a31` (tint of `#0A1D23`/`#365B62`). Glow `#4f8c97` (lightened primary). Accent for CTAs and MEP highlights `#5fd0c4` (a cyan tint of the brand teal) so buttons pop on dark. Fresh-grad highlight uses a warm amber `#ffbc7d` (already present in the site CSS). Light mode: background `#f4f9fc` (tint of `#DEEFFD`), text `#0A1D23`. Final values live in `app/globals.css`.
