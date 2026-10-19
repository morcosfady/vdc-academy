// Full-page screenshots of every route at 1440 and 390. Usage: node scripts/pages-shots.mjs <baseUrl> <outDir>
import { chromium } from "playwright";
import fs from "node:fs";
const [base = "http://localhost:4173/vdc-academy/", out = "docs/audit/v6-before"] = process.argv.slice(2);
const routes = ["", "programs/", "programs/revit-mep/", "pricing/", "fresh-graduates/", "learning-path/", "about/", "for-companies/", "contact/", "faq/", "instructors/", "student-work/", "apply/", "apply/?preview=1", "privacy/", "nothing-here/"];
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
for (const w of [1440, 390]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: w > 800 ? 900 : 844 } });
  const page = await ctx.newPage();
  for (const r of routes) {
    const name = (r.replace(/[^a-z0-9]+/g, "-").replace(/-$/, "") || "home") + "-" + w;
    await page.goto(base + r, { waitUntil: "load" });
    await page.waitForTimeout(1200);
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 500) {
        window.scrollTo(0, y);
        await new Promise((res) => setTimeout(res, 40));
      }
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${out}/${name}.png`, fullPage: true });
  }
  await ctx.close();
}
await browser.close();
console.log("done", out);
