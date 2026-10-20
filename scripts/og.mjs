// Renders the 1200x630 Open Graph images into public/og/<name>.png. No dev server and no build: each card is an
// inline HTML template opened with page.setContent(). Usage: node scripts/og.mjs
// Titles mirror the page copy; when a page title changes, update it here and run the script again.
import { chromium } from "playwright";
import sharp from "sharp";
import fs from "node:fs";

const OUT = "public/og";
const MAX = 150 * 1024;

// The white study model, cut out on transparent, embedded so the template needs no server.
const model = `data:image/webp;base64,${fs.readFileSync("assets/images/model-paper.webp").toString("base64")}`;

const cards = [
  { name: "home", sheet: "A-000 · HOME", title: "Learn BIM the way it's built on site.", line: "BIM and VDC training in Fort Worth, TX" },
  { name: "programs", sheet: "A-300 · PROGRAMS", title: "BIM and VDC programs", line: "Revit, Navisworks, 4D/5D, Dynamo, BIM management" },
  { name: "pricing", sheet: "A-500 · PRICING", title: "Pricing and discounts", line: "Fresh graduates get the biggest discount" },
  { name: "fresh-graduates", sheet: "FG-40 · FRESH GRADUATES", title: "Up to 40% off for fresh graduates", line: "Graduated in the last 24 months" },
  { name: "learning-path", sheet: "A-400 · LEARNING PATH", title: "From BIM trainee to VDC manager", line: "Five steps, one building" },
  { name: "for-companies", sheet: "A-801 · FOR COMPANIES", title: "BIM and VDC training for your team", line: "On site in Dallas Fort Worth or live online" },
  { name: "about", sheet: "A-800 · ABOUT", title: "The training academy of Bay BIM Designs", line: "Fort Worth, TX" },
  { name: "contact", sheet: "A-900 · CONTACT", title: "Talk to an advisor", line: "We reply within two working days" },
  { name: "faq", sheet: "A-901 · FAQ", title: "Questions and answers", line: "Programs, discounts, applying, equipment" },
  { name: "apply", sheet: "A-700 · APPLY", title: "Apply in five short steps", line: "You pay only after you are accepted" },
];

// Programs in catalog order, sheet numbers P-01 to P-11 as on the site.
const programs = [
  ["vdc-professional-bootcamp", "VDC Professional Bootcamp", "All levels"],
  ["bim-fundamentals-revit", "BIM Fundamentals with Revit", "Beginner"],
  ["revit-architecture", "Revit Architecture", "Intermediate"],
  ["revit-structure", "Revit Structure", "Intermediate"],
  ["revit-mep", "Revit MEP", "Intermediate"],
  ["low-voltage-bim", "Low Voltage & Technology Systems BIM", "Intermediate"],
  ["revit-family-creation", "Revit Family Creation", "Advanced"],
  ["navisworks-clash-detection", "Navisworks: Coordination & Clash Detection", "Intermediate"],
  ["4d-5d-simulation", "4D/5D Construction Simulation", "Advanced"],
  ["dynamo-for-revit", "Dynamo for Revit (BIM Automation)", "Advanced"],
  ["bim-management-iso-19650", "BIM Management & ISO 19650 basics", "Advanced"],
];
programs.forEach(([slug, title, level], i) => {
  cards.push({ name: `program-${slug}`, sheet: `P-${String(i + 1).padStart(2, "0")} · PROGRAM`, title, line: `${level} · VDC Academy program` });
});

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const html = (c) => `<!doctype html>
<html><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=Poppins:wght@500;600;700&display=block" rel="stylesheet">
<style>
  * { margin: 0; box-sizing: border-box; }
  html, body { width: 1200px; height: 630px; }
  body { background: #F6F4EF; color: #0A1D23; font-family: Poppins, "Segoe UI", Arial, sans-serif; position: relative; overflow: hidden; }
  .grid { position: absolute; inset: 0; background-image: linear-gradient(rgba(10,29,35,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(10,29,35,.05) 1px, transparent 1px); background-size: 60px 60px; }
  .frame { position: absolute; inset: 28px; border: 1px solid rgba(10,29,35,.18); }
  .sheet { position: absolute; top: 64px; left: 72px; font-family: "IBM Plex Mono", Consolas, monospace; font-size: 20px; letter-spacing: .12em; color: #0A1D23; }
  .sheet b { color: #2A63C4; font-weight: 500; }
  .title { position: absolute; left: 72px; top: 150px; width: 640px; font-weight: 700; font-size: ${c.title.length > 34 ? 56 : 64}px; line-height: 1.08; letter-spacing: -.02em; }
  .rule { position: absolute; left: 72px; bottom: 150px; width: 120px; height: 4px; background: #B8925A; }
  .line { position: absolute; left: 72px; bottom: 104px; font-size: 24px; font-weight: 500; color: #365B62; }
  .mark { position: absolute; left: 72px; bottom: 56px; font-family: "IBM Plex Mono", Consolas, monospace; font-size: 18px; letter-spacing: .06em; }
  .mark span { color: #2A63C4; }
  .model { position: absolute; right: 56px; top: 56px; width: 420px; height: 518px; object-fit: contain; mix-blend-mode: multiply; }
  .hair { position: absolute; right: 56px; top: 56px; width: 420px; border-top: 1px solid #2A63C4; opacity: .5; }
</style></head>
<body>
  <div class="grid"></div><div class="frame"></div>
  <div class="sheet"><b>${esc(c.sheet.split(" · ")[0])}</b> · ${esc(c.sheet.split(" · ")[1])}</div>
  <h1 class="title">${esc(c.title)}</h1>
  <div class="rule"></div>
  <div class="line">${esc(c.line)}</div>
  <div class="mark">VDC Academy <span>·</span> by Bay BIM Designs</div>
  <div class="hair"></div>
  <img class="model" src="${model}" alt="">
</body></html>`;

fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });

for (const c of cards) {
  // Offline the font link fails and the template falls back to system sans; never block on it.
  await page.setContent(html(c), { waitUntil: "load", timeout: 15000 }).catch(() => {});
  await page.evaluate(() => Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 5000))]));
  const png = await page.screenshot({ type: "png" });
  // Palette PNG keeps every card near 50 KB; fewer colors only if one still goes over the limit.
  let buf = await sharp(png).png({ palette: true, quality: 90, compressionLevel: 9 }).toBuffer();
  if (buf.length > MAX) buf = await sharp(png).png({ palette: true, colors: 96, compressionLevel: 9 }).toBuffer();
  fs.writeFileSync(`${OUT}/${c.name}.png`, buf);
  console.log(c.name.padEnd(36), `${(buf.length / 1024).toFixed(0)} KB`);
}

await browser.close();
