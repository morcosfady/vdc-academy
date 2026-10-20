// Lighthouse mobile on the v8 page set, local static build. The account page is measured signed in through the
// client demo (localStorage kept, so Lighthouse sees the dashboard, not the login redirect).
// Usage: node scripts/lh-v8.mjs [baseUrl] [outDir]   (serve out/ first: node scripts/serve-out.mjs 4180)
import { chromium } from "playwright";
import lighthouse from "lighthouse";
import fs from "node:fs";

const [base = "http://localhost:4180/vdc-academy/", out = "docs/audit/v8/lh"] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const port = 9333;
const browser = await chromium.launch({ args: [`--remote-debugging-port=${port}`] });
const ctx = browser.contexts()[0] ?? (await browser.newContext());

const pages = [
  ["home", ""],
  ["programs", "programs/"],
  ["pricing", "pricing/"],
  ["fresh-graduates", "fresh-graduates/"],
  ["apply", "apply/"],
  ["login", "login/"],
  ["account-demo", "account/", true],
];

const rows = [];
for (const [name, path, signedIn] of pages) {
  if (signedIn) {
    const p = await ctx.newPage();
    await p.goto(`${base}demo/`);
    await p.getByRole("button", { name: "Open the dashboard" }).click();
    await p.waitForURL(/account\/$/);
    await p.close();
  }
  const r = await lighthouse(`${base}${path}`, { port, output: "json", logLevel: "error", onlyCategories: ["performance", "accessibility", "best-practices", "seo"], formFactor: "mobile", disableStorageReset: Boolean(signedIn) });
  fs.writeFileSync(`${out}/lh-${name}.json`, r.report);
  const c = r.lhr.categories;
  const a = r.lhr.audits;
  const row = { name, perf: Math.round(c.performance.score * 100), a11y: Math.round(c.accessibility.score * 100), bp: Math.round(c["best-practices"].score * 100), seo: Math.round(c.seo.score * 100), lcp: a["largest-contentful-paint"].displayValue, tbt: a["total-blocking-time"].displayValue, cls: a["cumulative-layout-shift"].displayValue };
  rows.push(row);
  console.log(Object.values(row).join("  "));
}
fs.writeFileSync(`${out}/summary.json`, JSON.stringify(rows, null, 2));
await browser.close();
