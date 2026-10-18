// Styleguide screenshots, one per block. Usage: node scripts/sg.mjs <baseUrl> <outDir> [width]
import { chromium } from "playwright";
import fs from "node:fs";

const base = process.argv[2] ?? "http://localhost:4173/vdc-academy/";
const out = process.argv[3] ?? "docs/audit/v5-styleguide";
const widths = process.argv[4] ? [Number(process.argv[4])] : [1440, 390];
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch();
for (const w of widths) {
  const ctx = await browser.newContext({ viewport: { width: w, height: w > 800 ? 900 : 844 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on("console", (m) => m.type() === "error" && errs.push(m.text().slice(0, 160)));
  page.on("pageerror", (e) => errs.push("PAGEERROR " + e.message.slice(0, 160)));
  await page.goto(base + "styleguide/", { waitUntil: "load" });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${out}/sg-${w}-top.png` });
  const ids = await page.evaluate(() => [...document.querySelectorAll("main section[id]")].map((s) => s.id));
  for (const id of ids) {
    const el = page.locator(`main section#${id}`);
    await el.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await el.screenshot({ path: `${out}/sg-${w}-${id}.png` });
  }
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${out}/sg-${w}-footer.png` });
  console.log("w", w, "errors", errs.slice(0, 5));
  await ctx.close();
}
await browser.close();
