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

## Phase 2: Home page (done 2026-10-10)

- Procedural 3D building (`components/three/Building.tsx`): instanced boxes, no model files. Assembles on load (structure, then ducts/pipes/cable trays, then glass), wireframe turns solid. Shared mutable state in `lib/modelState.ts`.
- Scenes: `HeroScene` (hero and final CTA, auto-rotate, mouse tilt, drag orbit), `StoryScene`, `PathScene`, `ViewerScene`. All lazy-loaded with `next/dynamic` and mounted only when near the viewport (`WhenVisible`), frameloop stops off screen, DPR drops via PerformanceMonitor, aspect-aware camera (`FitCamera`), SVG fallback when WebGL is missing.
- Home sections in `components/home/`: Hero, Stats, ScrollStory (pinned GSAP scrub: model, exploded view, clash turns green, 4D floor-by-floor, LOD slider 100 to 500), Features (TiltCard), software marquee, programs carousel, learning path (3D road, camera follows scroll), fresh grad spotlight (count-up, confetti), gallery with interactive viewer (discipline toggles + section slider), instructors flip cards, testimonial, pricing teaser with fresh grad switch, FAQ preview, final CTA.
- Lenis smooth scroll synced with GSAP. Footer "Reduce motion" toggle (also honors the OS setting): disables smooth scroll, auto-rotate, confetti, marquee; story gets stage buttons instead of scroll pinning.
- Verified in the browser (desktop width): hero assembles, story stages 1 to 4 work, clash marker red then green, viewer toggles, pricing switch. `pnpm build` passes. Home first-load JS 245 kB; 3D code loads after.

## Decisions and deviations

- Programs preview is a CSS scroll-snap carousel with arrows, not a GSAP pinned horizontal scroll (simpler, works on touch).
- No bloom post-processing (skipped for performance).
- Preloader (logo drawing) not built yet.
- Cursor follower and magnetic button not built yet.
- Testimonial uses a Bay BIM client quote from baybimdesigns.com, shown with an "[approval pending]" chip.
- Stats show `[XX]` placeholders (a `Counter` component is ready for real numbers).
- Software names are plain text badges, not logos (confirm trademark use first).

## Not done / not tested

- Not checked on a real phone or in Safari. Lighthouse not run (Phase 7).
- Announcement bar countdown not built (date is a `[DATE]` placeholder).
- next-intl not wired into routing yet (strings still inline).
- Playwright, Vitest, axe not set up yet (Phase 7).
- Light mode visuals of the 3D scenes not reviewed.
- Linked pages (`/programs`, `/apply`, etc.) do not exist yet and 404 until later phases.

## Gotchas

- EurostileExtended is a licensed font. Michroma is a stand-in in `app/layout.tsx`.
- pnpm 12 prints "Ignored build scripts" after install; harmless so far (`pnpm approve-builds` if something breaks).
- First 3D load in `pnpm dev` takes several seconds (dev compile). Production is much faster.
- Hot reload can briefly show a stale "X is not defined" error right after multi-file edits; reload fixes it.

## Placeholders still needed

See `content/TODO-content.md`.
