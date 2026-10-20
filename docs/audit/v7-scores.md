# v7 + v8 scorecard (accounts, admin, demo), 2026-10-20

Same criteria as v5 and v6 (Idea, Hierarchy, Composition, Typography, Imagery, Comfort, Brand, Conversion), scored on the v8 build at 1440 and 390. Screenshots: `docs/audit/v7-after/` (full pages, both widths, captured through the client demo with `node scripts/v8-shots.mjs`). The public pages scored in `v6-scores.md` did not change design in v7 or v8.

| Screen | Idea | Hier. | Comp. | Type | Imagery | Comfort | Brand | Conv. | Notes |
|---|---|---|---|---|---|---|---|---|---|
| Log in | 9 | 9 | 9 | 9 | 9 | 9 | 9 | 9 | Form left, the white study model still on paper-2 right (pre-rendered, never WebGL, never a grey box), faint drawn grid marks. Focus borders now visible. |
| Sign up | 9 | 9 | 9 | 9 | 9 | 9 | 9 | 9 | Same split; the fresh-graduate pill appears with the status choice. |
| Apply gate | 9 | 9 | 9 | 9 | 8 | 9 | 9 | 9 | Sign up or log in without leaving /apply; guest draft survives. |
| Dashboard, empty | 8 | 9 | 9 | 9 | 8 | 9 | 9 | 9 | Drawn floor-plate empty state, next steps, completeness meter, recommended programs. |
| Dashboard, with application | 9 | 9 | 9 | 9 | 8 | 9 | 9 | 9 | Construction-schedule timeline at Under review, pending discount check, documents panel. |
| Profile | 8 | 9 | 9 | 9 | n/a | 9 | 9 | 8 | Plain paper form; avatar upload; deletion request. |
| Application detail (student) | 8 | 9 | 9 | 9 | n/a | 9 | 9 | 8 | Timeline, notes visible to the student, documents with signed links. |
| Admin overview | 8 | 9 | 9 | 9 | n/a | 9 | 9 | 9 | Four stat cards, status breakdown, inbox counts. |
| Admin table | 8 | 9 | 9 | 9 | n/a | 9 | 9 | 9 | Search, status chips, filters drawer, sort, paging, CSV; cards on phones. |
| Admin detail | 8 | 9 | 9 | 9 | n/a | 9 | 9 | 9 | Status change, discount verify or reject, notes, documents. The rejected badge now meets AA. |
| Fresh graduates | 9 | 9 | 9 | 9 | 9 | 9 | 9 | 9 | The 40% is static from first paint; only the brass rule draws. |
| Client demo (/demo/) | 8 | 9 | 9 | 9 | n/a | 9 | 9 | 9 | Five tour cards, credentials table, five-minute script, banner on every page. |

Nothing under 8. The account and admin screens are tools, so Idea and Imagery stay at 8 by design: no decoration competes with the data.

## Lighthouse (mobile)

PageSpeed Insights on the live site, after v8 (the numbers the brief asks for):

| Page | Before v8 | After v8 | LCP | TBT | CLS |
|---|---|---|---|---|---|
| Home | 84 | **98** | 2.3 s | 0 ms | 0 |
| Programs | n/a | **99** | 2.3 s | 30 ms | 0 |
| Apply | n/a | **93** | 3.2 s | 40 ms | 0 |

Apply was 94 with Best Practices 96 in the first run (zod's eval probe under the CSP). After `lib/zod.ts`: Best Practices 100, Accessibility 100, SEO 100.

Local static build, this machine (`docs/audit/v8/lh/`, `node scripts/lh-v8.mjs`; noisy, see v5):

| Page | Perf | A11y | BP | SEO | LCP | TBT | CLS |
|---|---|---|---|---|---|---|---|
| Home | 92 | 100 | 100 | 100 | 3.3 s | 80 ms | 0 |
| Programs | 95 | 99 | 100 | 100 | 2.9 s | 90 ms | 0 |
| Pricing | 95 | 100 | 100 | 100 | 2.7 s | 100 ms | 0 |
| Fresh graduates | 91 | 100 | 100 | 100 | 3.4 s | 80 ms | 0 |
| Apply | 87 | 100 | 100 | 100 | 3.7 s | 180 ms | 0.022 |
| Log in | 90 | 100 | 100 | 60 | 3.3 s | 160 ms | 0.002 |
| Account (demo, signed in) | 76 | 100 | 100 | 60 | 4.8 s | 300 ms | 0 |

SEO 60 on log in and account is the noindex penalty, on purpose. The account number includes the in-browser demo backend.

What moved home from 84 to 98: three.js was in the home page's first-load bundle (the hero imported one constant from the 3D model file, 240 KB gzipped), supabase-js loaded on every page although the site has no keys (64 KB), and the mono font was preloaded. Inline CSS was measured and rejected (HTML 18 KB to 77 KB gzipped).
