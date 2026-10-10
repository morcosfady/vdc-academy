// Audit script: screenshots + checks of the live site. Usage: node scripts/audit.mjs <baseUrl> <outDir>
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import fs from "node:fs";

const base = process.argv[2] ?? "https://morcosfady.github.io/vdc-academy/";
const out = process.argv[3] ?? "docs/audit/v1";
fs.mkdirSync(out, { recursive: true });

const sizes = { "1440": [1440, 900], "1024": [1024, 768], "768": [768, 1024], "390": [390, 844] };
const pages = ["", "programs/", "programs/revit-mep/", "pricing/", "fresh-graduates/", "apply/"];
const results = [];

const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });

async function shoot(page, file) {
  // scroll through so lazy content mounts, then back to top
  const h = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < h; y += 700) {
    await page.evaluate((v) => window.scrollTo(0, v), y);
    await page.waitForTimeout(120);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(800);
  await page.screenshot({ path: file, fullPage: true });
}

for (const slug of pages) {
  const name = slug.replace(/\/$/, "").replace(/\//g, "-") || "home";
  for (const theme of ["dark", "light"]) {
    for (const [w, [vw, vh]] of Object.entries(sizes)) {
      const isHome = slug === "";
      if (!isHome && (w === "1024" || w === "768" || theme === "light")) continue;
      const ctx = await browser.newContext({ viewport: { width: vw, height: vh }, deviceScaleFactor: 1 });
      await ctx.addInitScript((t) => { try { localStorage.setItem("theme", t); } catch {} }, theme);
      const page = await ctx.newPage();
      const errors = [];
      page.on("console", (m) => m.type() === "error" && errors.push(m.text().slice(0, 200)));
      const res = await page.goto(base + slug, { waitUntil: "networkidle", timeout: 60000 }).catch((e) => ({ status: () => "ERR " + e.message }));
      await page.waitForTimeout(6000);
      const status = res.status();
      const info = await page.evaluate(() => {
        const h1 = document.querySelector("h1");
        const body = document.body.innerText;
        return {
          h1Text: h1?.textContent ?? null,
          h1Inner: h1?.innerText ?? null,
          h1Aria: h1?.getAttribute("aria-label"),
          placeholders: (body.match(/\[[A-Za-z0-9 \/]{2,40}\]/g) ?? []).slice(0, 80),
          overflowX: document.documentElement.scrollWidth > window.innerWidth + 1,
          scrollHeight: document.documentElement.scrollHeight,
          sections: document.querySelectorAll("main > section").length,
          offText: [...document.querySelectorAll("div")].filter((d) => /off, up to/.test(d.parentElement?.textContent ?? "") && /%$/.test(d.textContent?.trim() ?? "")).map((d) => d.textContent.trim()).slice(0, 3),
        };
      });
      let axe = null;
      if (w === "1440" && theme === "dark") {
        const r = await new AxeBuilder({ page }).analyze();
        axe = r.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length, help: v.help }));
      }
      await shoot(page, `${out}/${name}-${theme}-${w}.png`);
      results.push({ page: name, theme, width: w, status, ...info, axe, errors: errors.slice(0, 5) });
      await ctx.close();
      console.log("done", name, theme, w, status);
    }
  }
}
await browser.close();
fs.writeFileSync(`${out}/results.json`, JSON.stringify(results, null, 2));
