import { expect, test } from "@playwright/test";

// On a fast 3G profile every visible image must have loaded within 2.5 s and the page must not shift (CLS < 0.1).
const routes = ["", "programs/", "fresh-graduates/", "about/", "pricing/", "for-companies/", "contact/"];

for (const r of routes) {
  for (const w of [390, 1440]) {
    test(`fast 3G: images within 2.5 s and CLS < 0.1 on /${r} at ${w}`, async ({ browser }) => {
      const ctx = await browser.newContext({ viewport: { width: w, height: w > 800 ? 900 : 844 }, baseURL: process.env.BASE_URL ?? "http://localhost:4173/vdc-academy/" });
      const page = await ctx.newPage();
      const cdp = await ctx.newCDPSession(page);
      await cdp.send("Network.enable");
      await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 });
      await page.addInitScript(() => {
        (window as unknown as { __cls: number }).__cls = 0;
        new PerformanceObserver((l) => {
          for (const e of l.getEntries() as (PerformanceEntry & { hadRecentInput: boolean; value: number })[]) if (!e.hadRecentInput) (window as unknown as { __cls: number }).__cls += e.value;
        }).observe({ type: "layout-shift", buffered: true });
      });
      await page.goto(r, { waitUntil: "load" });
      await page.waitForTimeout(2600);
      const result = await page.evaluate(() => {
        const vh = window.innerHeight;
        const visible = [...document.querySelectorAll("img")].filter((i) => {
          const b = i.getBoundingClientRect();
          return b.bottom > 0 && b.top < vh && b.width > 0;
        });
        const slow = visible.filter((i) => !i.complete || i.naturalWidth === 0).map((i) => i.currentSrc || i.src);
        const res = performance.getEntriesByType("resource") as PerformanceResourceTiming[];
        const late = visible
          .map((i) => res.find((e) => e.name === i.currentSrc))
          .filter((e): e is PerformanceResourceTiming => !!e && e.responseEnd > 2500)
          .map((e) => `${e.name.split("/").pop()} ${Math.round(e.responseEnd)}ms`);
        return { slow, late, cls: (window as unknown as { __cls: number }).__cls, n: visible.length };
      });
      expect(result.slow, "visible images not loaded").toEqual([]);
      expect(result.late, "visible images loaded after 2.5 s").toEqual([]);
      expect(result.cls, "cumulative layout shift").toBeLessThan(0.1);
      await ctx.close();
    });
  }
}
