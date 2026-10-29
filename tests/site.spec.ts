import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const BASE = process.env.BASE_URL ?? "http://localhost:4173/vdc-academy/";

const routes = [
  "", "programs/", "programs/revit-mep/", "programs/vdc-professional-bootcamp/", "pricing/", "fresh-graduates/", "learning-path/",
  "for-companies/", "calendar/", "about/", "contact/", "faq/", "privacy/", "terms/", "accessibility/", "instructors/", "student-work/", "apply/", "apply/?preview=1", "apply/success/", "nothing-here/", "styleguide/",
];

// Bracket placeholders like [PRICE] or [XX] must never reach a visitor.
const PLACEHOLDER = /\[[A-Z][A-Z0-9 \/]{1,40}\]|\[approval pending\]/;

for (const r of routes) {
  test(`no placeholder text on /${r}`, async ({ page }) => {
    await page.goto(r);
    await page.waitForTimeout(1500);
    const text = await page.locator("body").innerText();
    expect(text).not.toMatch(PLACEHOLDER);
    expect(text).not.toContain("—"); // no em dashes in copy
  });
}

test("hero heading reads correctly with spaces", async ({ page }) => {
  await page.goto("");
  const h1 = page.locator("h1").first();
  await expect(h1).toHaveAttribute("aria-label", "Learn BIM the way it's built on site.");
  const text = (await h1.textContent()) ?? "";
  expect(text).toContain("Learn BIM the way it's built on site.");
});

test("fresh grad number is real text (no JS needed)", async ({ browser }) => {
  const ctx = await browser.newContext({ javaScriptEnabled: false, baseURL: BASE });
  const page = await ctx.newPage();
  await page.goto("fresh-graduates/");
  expect(await page.content()).toContain(">40<");
  await ctx.close();
});

test("fresh grad number shows 40% with reduced motion", async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: "reduce", baseURL: BASE });
  const page = await ctx.newPage();
  await page.goto("fresh-graduates/");
  await page.getByText("our biggest discount").first().scrollIntoViewIfNeeded();
  await expect(page.locator("#ch-5")).toContainText("40%");
  await ctx.close();
});

test("apply: validation, fresh grad detection", async ({ page }) => {
  await page.goto("apply/?preview=1");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1500); // let the page hydrate before the first click
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText("Please enter your full name.")).toBeVisible();
  await page.getByLabel(/Full name/).fill("Test Student");
  await page.getByLabel(/^Email/).fill("test@example.com");
  await page.getByLabel(/Phone/).fill("+1 555 123 4567");
  await page.getByLabel(/^Country/).fill("USA");
  await page.getByLabel(/^City/).fill("Dallas");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText("Your education.")).toBeVisible();
  await page.getByLabel(/Graduation year/).selectOption(String(new Date().getFullYear()));
  await expect(page.getByText(/qualify for the fresh graduate discount/)).toBeVisible();
});

test("apply without keys shows the honest fallback", async ({ page }) => {
  // Without Supabase keys (and without the test mock) the apply page says the truth up front and captures an email.
  await page.goto("apply/");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1500);
  await expect(page.getByRole("heading", { name: "Applications open soon." })).toBeVisible();
  await expect(page.getByRole("button", { name: "Notify me" })).toBeVisible();
});

test("explorer works without WebGL", async ({ browser }) => {
  const ctx = await browser.newContext({ baseURL: BASE });
  await ctx.addInitScript(() => {
    const orig = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...a: unknown[]) {
      return /webgl/.test(type) ? null : (orig as (...x: unknown[]) => unknown).call(this, type, ...a);
    } as typeof orig;
  });
  const page = await ctx.newPage();
  await page.goto("");
  await page.waitForTimeout(1500);
  await expect(page.locator("canvas")).toHaveCount(0);
  // the poster still is visible instead
  await expect(page.locator("#hero picture img").first()).toBeVisible();
  await page.getByRole("button", { name: "Clash detection" }).click();
  await expect(page.getByText("CLASH #0147")).toBeVisible();
  await ctx.close();
});

test("reduced motion: no smooth scroll", async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: "reduce", baseURL: BASE });
  const page = await ctx.newPage();
  await page.goto("");
  await page.waitForTimeout(1500);
  expect(await page.evaluate(() => document.documentElement.classList.contains("lenis"))).toBe(false);
  await ctx.close();
});

// Composition: the headline and the model never share space, nothing overflows the viewport.
for (const w of [1440, 1024, 390, 360]) {
  test(`home: headline and model do not overlap, no horizontal overflow at ${w}`, async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: w, height: w > 800 ? 900 : 844 }, baseURL: BASE });
    const page = await ctx.newPage();
    await page.goto("");
    await page.waitForTimeout(1500);
    const h1 = await page.locator("h1").first().boundingBox();
    const model = await page.locator("#hero [role=img]").first().boundingBox();
    expect(h1 && model).toBeTruthy();
    const overlap = !(h1!.x + h1!.width <= model!.x || model!.x + model!.width <= h1!.x || h1!.y + h1!.height <= model!.y || model!.y + model!.height <= h1!.y);
    expect(overlap).toBe(false);
    for (const id of ["explorer", "why", "programs", "path", "fresh-grads", "final"]) {
      await page.evaluate((i) => document.getElementById(i)?.scrollIntoView(), id);
      await page.waitForTimeout(400);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
    await ctx.close();
  });
}

for (const r of ["programs/", "pricing/", "apply/?preview=1", "fresh-graduates/"]) {
  test(`no horizontal overflow at 360 on /${r}`, async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 360, height: 780 }, baseURL: BASE });
    const page = await ctx.newPage();
    await page.goto(r);
    await page.waitForTimeout(1200);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
    await ctx.close();
  });
}

// Visual regression: the static states (reduced motion, no WebGL, so the stills show) at three widths.
for (const w of [1440, 1024, 390]) {
  test(`visual: home at ${w}`, async ({ browser, browserName }) => {
    test.skip(browserName !== "chromium", "pixel snapshots are recorded in Chromium only");
    const ctx = await browser.newContext({ viewport: { width: w, height: w > 800 ? 900 : 844 }, reducedMotion: "reduce", baseURL: BASE });
    await ctx.addInitScript(() => {
      const orig = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...a: unknown[]) {
        return /webgl/.test(type) ? null : (orig as (...x: unknown[]) => unknown).call(this, type, ...a);
      } as typeof orig;
    });
    const page = await ctx.newPage();
    await page.goto("");
    // load every lazy image first so the full-page capture is stable
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 600) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 60));
      }
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(2500);
    await expect(page).toHaveScreenshot(`home-${w}.png`, { fullPage: true, maxDiffPixelRatio: 0.03, timeout: 20000 });
    await ctx.close();
  });
}

for (const r of ["", "programs/", "programs/revit-mep/", "pricing/", "fresh-graduates/", "apply/?preview=1", "contact/", "faq/", "styleguide/"]) {
  test(`axe: no serious or critical issues on /${r}`, async ({ page }) => {
    await page.goto(r);
    await page.waitForTimeout(3000);
    const res = await new AxeBuilder({ page }).analyze();
    const bad = res.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(bad.map((v) => `${v.id} (${v.nodes.length})`)).toEqual([]);
  });
}
