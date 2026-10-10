# VDC Academy

Website for VDC Academy by Bay BIM Designs. Next.js 15, TypeScript, Tailwind v4.

## Setup

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Open http://localhost:3000.

## Where things live

- `app/globals.css`: design tokens (colors from baybimdesigns.com, see `docs/brand-reference.md`)
- `config/site.ts`: site name, nav, headline numbers
- `components/`: layout and UI pieces
- `content/TODO-content.md`: what the owner still has to provide
- `docs/HANDOFF.md`: current project state

Later phases add `content/programs.ts`, `config/discounts.ts`, Supabase migrations and deploy notes.
