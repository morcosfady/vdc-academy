// Screenshot set for the v7 leftovers and the v8 delivery, at 1440 and 390, driven through the client demo
// (/demo/, sample data, no network). Usage: node scripts/v8-shots.mjs [baseUrl] [outDir]
// Writes <outDir>/<name>-<width>.png (full page). Default out: docs/audit/v7-after.
import { chromium } from "playwright";
import fs from "node:fs";

const [base = "http://localhost:4173/vdc-academy/", out = "docs/audit/v7-after"] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });

const APP = "aaaaaaaa-0000-4000-8000-000000000001";
const settle = async (page, ms = 1200) => {
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(ms);
};
// open a tour card by its button label; the card sets the session and navigates
async function card(page, label, wait) {
  await page.goto(`${base}demo/`);
  await settle(page, 400);
  await page.getByRole("button", { name: label }).click();
  await page.waitForURL(wait);
  await settle(page);
}

const shots = [
  ["demo-landing", async (p) => { await p.goto(`${base}demo/`); await settle(p); }],
  ["login", async (p) => { await card(p, "Open the apply gate", /apply/); await p.goto(`${base}login/`); await settle(p); }],
  ["signup", async (p) => { await p.goto(`${base}signup/`); await settle(p); }],
  ["apply-gate", async (p) => { await card(p, "Open the apply gate", /apply\/$/); }],
  ["dashboard-empty", async (p) => {
    await card(p, "Open the apply gate", /apply\/$/);
    await p.goto(`${base}signup/`);
    await settle(p, 600);
    await p.locator('input[name="name"]').fill("Sample Student 50");
    await p.locator('input[name="email"]').fill(`student50-${Date.now()}@example.com`);
    await p.locator('input[name="password"]').fill("demo-password-1");
    await p.locator('select[name="status"]').selectOption({ index: 1 });
    await p.locator('input[name="consent"]').check();
    await p.getByRole("button", { name: "Create account" }).click();
    await p.waitForURL(/account\/$/);
    await settle(p);
  }],
  ["dashboard-application", async (p) => { await card(p, "Open the dashboard", /account\/$/); }],
  ["profile", async (p) => { await card(p, "Open the profile", /profile/); }],
  ["application-detail", async (p) => { await card(p, "Open the dashboard", /account\/$/); await p.goto(`${base}account/application/?id=${APP}`); await settle(p); }],
  ["admin-overview", async (p) => { await card(p, "Open the admin", /admin\/$/); }],
  ["admin-table", async (p) => { await card(p, "Open the admin", /admin\/$/); await p.goto(`${base}admin/applications/`); await settle(p); }],
  ["admin-detail", async (p) => { await card(p, "Open the application", /admin\/application\//); }],
  ["fresh-grads", async (p) => {
    await p.goto(base);
    await p.evaluate(() => { try { localStorage.removeItem("vdc-demo"); localStorage.removeItem("vdc-mock"); } catch {} });
    await p.goto(`${base}fresh-graduates/`);
    await settle(p, 2500);
  }],
  ["content-status", async (p) => { await p.goto(`${base}content-status/`); await settle(p); }],
];

const only = process.env.ONLY ? process.env.ONLY.split(",") : null;
const browser = await chromium.launch();
for (const w of [1440, 390]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: w > 800 ? 900 : 844 }, reducedMotion: "reduce" });
  const page = await ctx.newPage();
  for (const [name, go] of shots) {
    if (only && !only.includes(name)) continue;
    try {
      await go(page);
      await page.screenshot({ path: `${out}/${name}-${w}.png`, fullPage: true });
      console.log("ok", name, w);
    } catch (e) {
      console.log("FAILED", name, w, String(e).split("\n")[0]);
    }
  }
  await ctx.close();
}
await browser.close();
