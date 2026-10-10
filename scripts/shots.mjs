// Chapter screenshots. Usage: node scripts/shots.mjs <baseUrl> <outDir> [path] [width]
import { chromium } from "playwright";
import fs from "node:fs";

const base = process.argv[2] ?? "http://localhost:3000/";
const out = process.argv[3] ?? "docs/audit/v2";
const path = process.argv[4] ?? "";
const widths = process.argv[5] ? [Number(process.argv[5])] : [1440, 390];
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
for (const w of widths) {
  const h = w > 800 ? 900 : 844;
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  const page = await ctx.newPage();
  const errs = [];
  page.on("console", (m) => m.type() === "error" && errs.push(m.text().slice(0, 160)));
  page.on("pageerror", (e) => errs.push("PAGEERROR " + e.message.slice(0, 160)));
  await page.goto(base + path, { waitUntil: "load", timeout: 90000 });
  await page.waitForTimeout(9000);
  const ids = await page.evaluate(() => [...document.querySelectorAll("section[id^=ch-]")].map((s) => s.id));
  const name = (path.replace(/\W+/g, "-") || "home");
  await page.screenshot({ path: `${out}/${name}-${w}-top.png` });
  for (const id of ids.filter((i) => i !== "ch-1")) {
    await page.evaluate((i) => {
      const el = document.getElementById(i);
      window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY + (i === "ch-6" ? 40 : 0));
    }, id);
    await page.waitForTimeout(3500);
    await page.screenshot({ path: `${out}/${name}-${w}-${id}.png` });
  }
  console.log("w", w, "errors:", errs.slice(0, 6));
  await ctx.close();
}
await browser.close();
