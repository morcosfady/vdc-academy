// Full-page screenshots of inner pages. Usage: node scripts/pages.mjs <baseUrl> <outDir> <width> route1 route2 ...
import { chromium } from "playwright";
import fs from "node:fs";

const [base, out, width, ...routes] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const w = Number(width);
const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
for (const r of routes) {
  const page = await browser.newPage({ viewport: { width: w, height: w > 800 ? 900 : 844 } });
  await page.goto(base + r + (r.includes("?") ? "&" : "?") + "gl=force", { waitUntil: "load" });
  await page.waitForTimeout(4000);
  const h = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < h; y += 500) {
    await page.evaluate((v) => window.scrollTo(0, v), y);
    await page.waitForTimeout(250);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${out}/${r.replace(/\W+/g, "-") || "home"}-${w}-full.png`, fullPage: true });
  console.log("ok", r, h);
  await page.close();
}
await browser.close();
