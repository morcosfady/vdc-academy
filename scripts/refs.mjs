// Reference shots for v5. Usage: node scripts/refs.mjs
import { chromium } from "playwright";
const refs = [
  ["likova", "https://likova.space/"],
  ["foster", "https://www.fosterandpartners.com/"],
  ["som", "https://www.som.com/"],
  ["linear", "https://linear.app/"],
  ["apple", "https://www.apple.com/macbook-pro/"],
  ["baybim", "https://baybimdesigns.com/"],
];
const browser = await chromium.launch();
for (const [name, url] of refs) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForTimeout(4000);
    await page.screenshot({ path: `docs/reference/v5/${name}-1.png` });
    await page.mouse.wheel(0, 1400);
    await page.waitForTimeout(2500);
    await page.screenshot({ path: `docs/reference/v5/${name}-2.png` });
    console.log("ok", name);
  } catch (e) {
    console.log("fail", name, String(e).slice(0, 80));
  }
  await ctx.close();
}
await browser.close();
