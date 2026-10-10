// Logs LCP entries (element + time) for a URL. Usage: node scripts/lcp.mjs <url>
import { chromium } from "playwright";

const url = process.argv[2] ?? "http://localhost:4173/vdc-academy/privacy/";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 412, height: 823 } });
await page.addInitScript(() => {
  window.__lcp = [];
  new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__lcp.push([Math.round(e.startTime), e.element?.tagName + "." + (e.element?.className || "").toString().slice(0, 40), e.size, e.url || ""]))).observe({ type: "largest-contentful-paint", buffered: true });
  new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__fcp = Math.round(e.startTime))).observe({ type: "paint", buffered: true });
});
await page.goto(url, { waitUntil: "load" });
await page.waitForTimeout(3000);
console.log(JSON.stringify(await page.evaluate(() => ({ lcp: window.__lcp, fcp: window.__fcp })), null, 1));
await browser.close();
