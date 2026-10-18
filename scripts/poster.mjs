// Renders the model stills (paper and night) from /poster into assets/images as transparent AVIF + WebP.
// Usage: node scripts/poster.mjs <baseUrl>   (the static export must be served, e.g. node scripts/serve-out.mjs 4173)
import { chromium } from "playwright";
import sharp from "sharp";
import fs from "node:fs";

const base = process.argv[2] ?? "http://localhost:4173/vdc-academy/";
const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });

for (const [name, q] of [
  ["model-paper", "mood=0"],
  ["model-night", "mood=1"],
]) {
  const ctx = await browser.newContext({ viewport: { width: 1000, height: 800 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.goto(`${base}poster/?${q}&gl=force`, { waitUntil: "load" });
  await page.waitForSelector("canvas", { timeout: 60000 });
  await page.waitForTimeout(9000);
  const png = await page.screenshot({ omitBackground: true, type: "png" });
  const img = sharp(png).trim({ threshold: 8 });
  await img.clone().avif({ quality: 55, effort: 6 }).toFile(`assets/images/${name}.avif`);
  await img.clone().webp({ quality: 80, alphaQuality: 80 }).toFile(`assets/images/${name}.webp`);
  const meta = await sharp(`assets/images/${name}.webp`).metadata();
  console.log(name, meta.width, meta.height, (fs.statSync(`assets/images/${name}.avif`).size / 1024) | 0, "KB avif");
  await ctx.close();
}
await browser.close();
