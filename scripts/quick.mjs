// Quick full-page-by-frames shots. Usage: node scripts/quick.mjs <url> <outPrefix> [width] [frames]
import { chromium } from "playwright";
const [url, out, w = "1440", frames = "4"] = process.argv.slice(2);
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: +w, height: +w > 800 ? 900 : 844 } });
const p = await ctx.newPage();
await p.goto(url, { waitUntil: "load" });
await p.waitForTimeout(2500);
for (let i = 0; i < +frames; i++) {
  await p.screenshot({ path: `${out}-${i}.png` });
  await p.evaluate((h) => window.scrollBy(0, h), +w > 800 ? 900 : 844);
  await p.waitForTimeout(1200);
}
await b.close();
