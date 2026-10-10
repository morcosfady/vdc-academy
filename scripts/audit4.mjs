// v4 audit: viewport screenshots while scrolling a page in steps, at three sizes and two themes, plus an
// automatic "empty screen" detector (a frame with almost no pixel variation = nothing rendered).
// Usage: node scripts/audit4.mjs <baseUrl> <outDir> [path] [--quick]
import { chromium } from "playwright";
import sharp from "sharp";
import fs from "node:fs";

const [base, out, path = ""] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const quick = process.argv.includes("--quick");
fs.mkdirSync(out, { recursive: true });

const sizes = quick ? [[1440, 900]] : [[1440, 900], [1024, 768], [390, 844]];
const themes = quick ? ["dark"] : ["dark", "light"];
const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const report = [];

for (const theme of themes) {
  for (const [w, h] of sizes) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, colorScheme: theme });
    await ctx.addInitScript((t) => { try { localStorage.setItem("theme", t); } catch {} }, theme);
    const page = await ctx.newPage();
    await page.goto(base + path + (path.includes("?") ? "&" : "?") + "gl=force", { waitUntil: "load", timeout: 90000 });
    await page.waitForTimeout(7000);
    const total = await page.evaluate(() => document.documentElement.scrollHeight);
    const step = Math.round(h * 0.8);
    let i = 0;
    for (let y = 0; y < total; y += step, i++) {
      await page.evaluate((v) => window.scrollTo(0, v), y);
      await page.waitForTimeout(1600);
      const file = `${out}/${path.replace(/\W+/g, "-") || "home"}-${theme}-${w}-${String(i).padStart(2, "0")}.png`;
      const buf = await page.screenshot({ path: file });
      const { channels } = await sharp(buf).stats();
      const std = channels.slice(0, 3).reduce((s, c) => s + c.stdev, 0) / 3;
      const mean = channels.slice(0, 3).reduce((s, c) => s + c.mean, 0) / 3;
      const overlap = await page.evaluate(() => {
        // does the chapter indicator overlap any text block?
        const nav = document.querySelector('nav[aria-label="Chapters"]');
        if (!nav || getComputedStyle(nav).display === "none") return false;
        const r = nav.getBoundingClientRect();
        return [...document.querySelectorAll("h1,h2,h3,p,button,a,figure,li")].some((el) => {
          if (nav.contains(el) || el.closest("[aria-hidden=true]")) return false;
          const b = el.getBoundingClientRect();
          return b.width > 0 && b.height > 0 && b.left < r.right && b.right > r.left && b.top < r.bottom && b.bottom > r.top && getComputedStyle(el).visibility !== "hidden";
        });
      });
      report.push({ theme, w, i, y, std: Math.round(std * 10) / 10, mean: Math.round(mean), empty: std < 6, indicatorOverlap: overlap });
    }
    await ctx.close();
    console.log("done", theme, w);
  }
}
await browser.close();
fs.writeFileSync(`${out}/scan.json`, JSON.stringify(report, null, 1));
const empty = report.filter((r) => r.empty);
console.log("frames", report.length, "empty", empty.length, JSON.stringify(empty.map((e) => `${e.theme}-${e.w}-#${e.i}@${e.y}`)));
console.log("indicator overlaps", report.filter((r) => r.indicatorOverlap).length);
