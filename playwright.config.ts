import { defineConfig } from "@playwright/test";

// Tests run against the static export served exactly like GitHub Pages. Build first: GITHUB_PAGES=true pnpm build
export default defineConfig({
  testDir: "tests",
  timeout: 90_000,
  workers: 2,
  use: {
    baseURL: process.env.BASE_URL ?? "http://localhost:4173/vdc-academy/",
    launchOptions: { args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] },
  },
  webServer: process.env.BASE_URL ? undefined : { command: "node scripts/serve-out.mjs 4173", url: "http://localhost:4173/vdc-academy/", reuseExistingServer: true },
});
