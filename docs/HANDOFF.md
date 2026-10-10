# VDC Academy handoff

Project: VDC Academy website (Bay BIM Designs training academy). Spec: `VDC-Academy-Claude-Code-Prompt.md`.
Folder: `F:\Projects\VDC Academy` (separate from the Pharaoh's Bites repo).

## Phase 1: Foundation (done 2026-10-10)

- Scaffolded Next.js 15 (App Router, TypeScript, Tailwind v4, pnpm). Installed motion, gsap, lenis, three + R3F + drei, react-hook-form, zod, next-intl, next-themes, lucide-react.
- Brand extracted from baybimdesigns.com into `docs/brand-reference.md`: primary `#365B62`, ink `#0A1D23`, deepest `#000E12`, muted `#83969A`, light `#A3BEC7`, pale `#DEEFFD`; fonts EurostileExtended (headings) + Poppins (body).
- Tokens in `app/globals.css` (dark first, light mode supported, WCAG-minded pairs).
- Layout: skip link, dismissible announcement bar, sticky glass header, mobile menu, sticky mobile Apply bar, footer, theme toggle.
- Base components: Button, Badge, SectionHeader. Placeholder home page.
- `.env.example`, `content/TODO-content.md`.

## Not done / not tested

- Not yet built: TiltCard, Counter, Marquee etc. (come with the sections that use them in Phase 2+).
- Reduce-motion footer toggle (CSS class `.reduce-motion` exists, toggle not wired yet).
- next-intl not wired into routing yet (strings still inline).
- Playwright, Vitest, axe not set up yet (Phase 7).

## Gotchas

- EurostileExtended is a licensed font. Michroma is a stand-in in `app/layout.tsx`.
- pnpm 12 prints "Ignored build scripts" after install; harmless so far (`pnpm approve-builds` if something breaks).
- Announcement bar countdown is not built yet; date is a `[DATE]` placeholder.

## Placeholders still needed

See `content/TODO-content.md`.
