// Reads computed colors and fonts from baybimdesigns.com to confirm the brand palette.
import { chromium } from "playwright";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto("https://baybimdesigns.com/", { waitUntil: "networkidle", timeout: 90000 });
await page.waitForTimeout(3000);
const res = await page.evaluate(() => {
  const colors = {};
  const fonts = {};
  const where = {};
  for (const el of document.querySelectorAll("body *")) {
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden") continue;
    for (const p of ["color", "backgroundColor", "borderTopColor"]) {
      const v = cs[p];
      if (!v || v === "rgba(0, 0, 0, 0)" || v === "transparent") continue;
      colors[`${p}:${v}`] = (colors[`${p}:${v}`] || 0) + 1;
      if (/33, 111, 243/.test(v)) (where[v] ||= []).push(`${el.tagName}.${(el.className || "").toString().slice(0, 50)} ${p}`);
    }
    const f = cs.fontFamily.split(",")[0].trim();
    fonts[f] = (fonts[f] || 0) + 1;
  }
  const top = Object.entries(colors).sort((a, b) => b[1] - a[1]).slice(0, 22);
  return { top, fonts: Object.entries(fonts).sort((a, b) => b[1] - a[1]).slice(0, 6), where: Object.entries(where).map(([k, v]) => [k, v.slice(0, 4)]) };
});
console.log(JSON.stringify(res, null, 1));
await page.screenshot({ path: "docs/reference/baybim-home.png" });
await browser.close();
