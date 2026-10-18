// Screenshots of every home section. Usage: node scripts/sections.mjs <baseUrl> <outDir> [width]
import { chromium } from "playwright";
import fs from "node:fs";
const [base = "http://localhost:4173/vdc-academy/", out = "docs/audit/v5-wip", wArg] = process.argv.slice(2);
const widths = wArg ? [Number(wArg)] : [1440, 390];
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
for (const w of widths) {
  const ctx = await browser.newContext({ viewport: { width: w, height: w > 800 ? 900 : 844 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on("console", (m) => m.type() === "error" && errs.push(m.text().slice(0, 140)));
  page.on("pageerror", (e) => errs.push("PAGEERROR " + e.message.slice(0, 140)));
  await page.goto(base + "?gl=force", { waitUntil: "load", timeout: 90000 });
  await page.waitForTimeout(7000);
  await page.screenshot({ path: `${out}/home-${w}-hero.png` });
  const ids = await page.evaluate(() => [...document.querySelectorAll("main section[id]")].map((s) => s.id).filter((i) => i !== "hero"));
  for (const id of ids) {
    await page.evaluate((i) => window.scrollTo(0, document.getElementById(i).getBoundingClientRect().top + window.scrollY - 8), id);
    await page.waitForTimeout(2600);
    await page.screenshot({ path: `${out}/home-${w}-${id}.png` });
  }
  const over = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  console.log("w", w, "overflow:", over, "errors:", errs.slice(0, 4));
  await ctx.close();
}
await browser.close();
