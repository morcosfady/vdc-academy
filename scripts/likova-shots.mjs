// Reference study only: viewport frames of likova.space while scrolling. Saved to docs/reference/likova/.
import { chromium } from "playwright";
import fs from "node:fs";

const out = "docs/reference/likova";
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });

for (const [label, vw, vh] of [["desktop", 1440, 900], ["mobile", 390, 844]]) {
  const ctx = await browser.newContext({ viewport: { width: vw, height: vh } });
  const page = await ctx.newPage();
  await page.goto("https://likova.space/", { waitUntil: "domcontentloaded", timeout: 60000 }).catch((e) => console.log("goto", e.message));
  await page.waitForTimeout(9000);
  for (let i = 0; i < 12; i++) {
    await page.screenshot({ path: `${out}/${label}-${String(i).padStart(2, "0")}.png` });
    await page.mouse.wheel(0, vh * 0.9);
    await page.waitForTimeout(1800);
  }
  await ctx.close();
  console.log("done", label);
}
await browser.close();
