import { expect, test } from "@playwright/test";

// No empty visuals anywhere: every image loads with a real size, every picture or figure holds an image,
// and every count-up shows its final value within three seconds.
const routes = ["", "programs/", "programs/revit-mep/", "pricing/", "fresh-graduates/", "learning-path/", "about/", "for-companies/", "contact/", "faq/", "instructors/", "student-work/", "apply/?preview=1", "nothing-here/"];

for (const r of routes) {
  test(`no empty images and final count-up values on /${r}`, async ({ page }) => {
    await page.goto(r);
    // scroll through so lazy images load, then wait a little
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 500) {
        window.scrollTo(0, y);
        await new Promise((res) => setTimeout(res, 40));
      }
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(3000);
    const report = await page.evaluate(async () => {
      const imgs = [...document.querySelectorAll("img")];
      // WebKit may never start a lazy image that scrolled past quickly: ask for it now, and never wait forever.
      for (const i of imgs) if (!i.complete) i.loading = "eager";
      const loaded = (i: HTMLImageElement) => (i.complete ? Promise.resolve() : new Promise((res) => { i.onload = i.onerror = res; }));
      await Promise.race([Promise.all(imgs.map(loaded)), new Promise((res) => setTimeout(res, 15000))]);
      const broken = imgs.filter((i) => !(i.naturalWidth > 0)).map((i) => i.currentSrc || i.src || "(no src)");
      const emptyFrames = [...document.querySelectorAll("figure, picture")].filter((f) => !f.querySelector("img, svg, canvas")).map((f) => f.className.slice(0, 60));
      const counts = [...document.querySelectorAll("[data-countup]")].filter((e) => e.textContent?.trim() !== e.getAttribute("data-final")).map((e) => `${e.textContent} != ${e.getAttribute("data-final")}`);
      return { broken, emptyFrames, counts, total: imgs.length };
    });
    expect(report.broken, "broken images").toEqual([]);
    expect(report.emptyFrames, "empty image frames").toEqual([]);
    expect(report.counts, "count-ups not at their final value").toEqual([]);
  });
}
