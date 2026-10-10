// Records a short video: the hero intro, then one full scroll of the home page.
// Usage: node scripts/record.mjs <baseUrl> <outFile.webm>
import { chromium } from "playwright";
import fs from "node:fs";

const [base, out] = process.argv.slice(2);
const dir = "docs/audit/.video-tmp";
fs.mkdirSync(dir, { recursive: true });

const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, recordVideo: { dir, size: { width: 1280, height: 720 } }, colorScheme: "dark" });
await ctx.addInitScript(() => { try { localStorage.setItem("theme", "dark"); sessionStorage.removeItem("vdc-intro"); } catch {} });
const page = await ctx.newPage();
await page.goto(base + "?gl=force", { waitUntil: "load" });
await page.waitForTimeout(6500); // hero intro
const total = await page.evaluate(() => document.documentElement.scrollHeight);
for (let y = 0; y < total; y += 140) {
  await page.mouse.wheel(0, 140);
  await page.waitForTimeout(110);
}
await page.waitForTimeout(1500);
const video = page.video();
await ctx.close();
const src = await video.path();
fs.mkdirSync(out.replace(/[^/\\]+$/, ""), { recursive: true });
fs.copyFileSync(src, out);
fs.rmSync(dir, { recursive: true, force: true });
await browser.close();
console.log("saved", out, (fs.statSync(out).size / 1e6).toFixed(1), "MB");
