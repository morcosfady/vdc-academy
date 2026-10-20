# v8 cross-browser and device QA, 2026-10-20

## Engines and where they ran

| Engine | Where | Result |
| --- | --- | --- |
| Chromium | Windows, local, against the static export | 3 full runs in a row green: 149 passed, 3 skipped each (the `SHOTS=1` capture tests). Later runs with the new axe scans also green. |
| WebKit (Safari engine) | Windows, local | 130 passed, 1 failed (a test bug, fixed), 6 skipped. QA and admin specs rerun green after the fixes. |
| WebKit | GitHub Actions, Ubuntu (`.github/workflows/cross-browser.yml`) | Green: 144 passed, 7 skipped. Its earlier failures were real bugs (items 9 and 10 below) and a lazy-image wait in a test; all fixed. CI allows one retry and reports it as flaky. |
| Firefox | GitHub Actions, Ubuntu | Green: 146 passed, 6 skipped (all specs except the Chromium-only perf and lod). |
| Firefox | Windows, local | **Not run**: Windows refuses to execute the downloaded Playwright Firefox binary ("Permission denied", a security policy on this machine). Firefox is covered by CI instead. |

Chromium-only by design: `perf.spec.ts` (DevTools network throttling) and `lod.spec.ts` (forced software WebGL). The home pixel snapshots are recorded in Chromium only (`tests/site.spec.ts-snapshots/home-*-chromium-win32.png`).

Commands: `GITHUB_PAGES=true pnpm build`, then `pnpm exec playwright test --project=chromium` (or `webkit`, `firefox`). On GitHub: Actions > Cross-browser tests > Run workflow.

## What `tests/qa.spec.ts` covers (every engine)

- **Widths 1440, 1024, 390, 360**: no horizontal overflow and a visible h1 on home, programs, a program page, pricing, fresh graduates, apply preview, log in, sign up, demo.
- **The 40%**: the visible number is sampled 12 times while the page loads and scrolls, with and without reduced motion, on /fresh-graduates/ and the home. It only ever reads 40. No count-up element is left on the site.
- **Dialog**: the qualify quiz opens as a dialog, Tab stays inside, Escape closes it.
- **Inputs**: selects and the file input on the apply form (the discount proof upload).
- **Reduced motion and Comfort mode**: the class sticks across a reload and no endless animation runs.
- **Keyboard only**: log in (email, password, Enter submits, focus visible), sign up (every field, consent with Space), apply (Tab to Continue, Enter moves to step 2), dashboard and admin table (Tab to the row, Enter opens it).
- **JavaScript off**: 18 routes. Public pages are readable (h1 plus real text); every form shows "This form needs JavaScript" in place of its fields, so nothing can be submitted into the URL; apply and account explain why they are empty.
- **axe**: serious and critical = 0 on the 14 pages `site.spec.ts` does not scan (learning path, for companies, about, privacy, terms, accessibility, instructors, student work, apply success, 404, log in, sign up, demo, content status) and on the dashboard, profile, application, admin overview, table, detail and leads (through the demo). `site.spec.ts` scans the other nine public pages; `account.spec.ts` scans sign up, log in, dashboard and profile with the mock.

## Bugs QA found and fixed in v8

1. **Invisible keyboard focus on every form field.** An inline `border-color` beat the `focus:border-accent` class, so inputs and selects never showed focus (or the red error border). Moved to a class.
2. **Apply could show the wrong step.** Motion's features load after the first interaction; when a prefilled student's first action was Continue, the old step's exit never finished and step 1 stayed on screen under a "Step 2" stepper. Now a CSS entrance. This was also the cause of the flaky apply tests.
3. **Apply Continue before the draft loaded** validated empty fields. Continue now waits for the load.
4. **Featured program card**: the cover filled only part of its half (picture not full height).
5. **WebKit loaded no scripts on http://localhost** because of `upgrade-insecure-requests` in the CSP meta. Removed (GitHub Pages forces HTTPS anyway).
6. **CSP issue on every zod page** (Lighthouse Best Practices 96 on apply): zod's `new Function` probe. `lib/zod.ts` turns on jitless mode.
7. **Contrast**: the "Not this time" status badge and the admin error alerts used the clash red (3.9:1). Now the danger red.
8. Stray vertical scrollbar on the admin tab row; the demo banner text truncated on phones.
9. **WebKit lost a program selection**: after an uncheck then a check, React Hook Form read the checkbox group as empty, so Continue failed silently (the duplicate-guard path could not advance). The program checkboxes are now controlled.
10. **A sent application could come back as a draft**: an autosave timer fired after the draft was cleared on submit. Autosave stops once the application is sent.

## Not tested (and why)

- **Real iPhone and Android devices**: no devices on this machine. WebKit at 390 and 360 is the closest stand-in; iOS Safari's file picker, date inputs and the on-screen keyboard over fixed headers still need a check on a phone.
- **macOS Safari itself**: Playwright's WebKit is the same engine, not the same browser (no iCloud Keychain, no Safari extensions).
- **Link navigation with Tab in Safari**: Safari moves Tab between form controls only by default (links take Option+Tab), so that one keyboard test is skipped on WebKit.
- **Screen readers** (VoiceOver, NVDA): axe and the keyboard tests cover structure and names; a manual pass with a screen reader is still worth doing before launch.
- **The live backend**: every account and admin test runs against the in-memory mock or the demo. Supabase is not connected (docs/GO-LIVE.md, step 1 blocked).
- **Date inputs**: the site has none (graduation year is a select), so there is nothing to test there.
