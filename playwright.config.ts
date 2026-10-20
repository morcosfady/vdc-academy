import { defineConfig } from "@playwright/test";

// Tests run against the static export served exactly like GitHub Pages. Build first: GITHUB_PAGES=true pnpm build
// Three engines: Chromium (default), Firefox and WebKit (the Safari engine). Run one with --project=webkit.
// Chromium-only specs: perf (DevTools network throttling), lod (forced software WebGL); the home pixel snapshots
// skip themselves outside Chromium (tests/site.spec.ts).
const chromiumOnly = [/perf\.spec\.ts/, /lod\.spec\.ts/];

export default defineConfig({
  testDir: "tests",
  timeout: 90_000,
  // CI runners are slower and shared: one retry there, reported as "flaky" in the summary (never locally).
  retries: process.env.CI ? 1 : 0,
  workers: 2,
  use: {
    baseURL: process.env.BASE_URL ?? "http://localhost:4173/vdc-academy/",
    trace: process.env.CI ? "retain-on-failure" : "off",
  },
  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium", launchOptions: { args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] } },
    },
    { name: "firefox", use: { browserName: "firefox" }, testIgnore: chromiumOnly },
    { name: "webkit", use: { browserName: "webkit" }, testIgnore: chromiumOnly },
  ],
  webServer: process.env.BASE_URL ? undefined : { command: "node scripts/serve-out.mjs 4173", url: "http://localhost:4173/vdc-academy/", reuseExistingServer: true },
});
