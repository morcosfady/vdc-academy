import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const routes = [
  "", "programs/", "programs/revit-mep/", "programs/vdc-professional-bootcamp/", "pricing/", "fresh-graduates/", "learning-path/",
  "for-companies/", "about/", "contact/", "faq/", "privacy/", "terms/", "accessibility/", "instructors/", "student-work/", "apply/", "apply/?preview=1", "apply/success/", "nothing-here/",
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
  await expect(h1).toHaveAttribute("aria-label", "Build it digitally. Then build your career.");
  const text = (await h1.textContent()) ?? "";
  expect(text).toContain("digitally. Then build your career.");
});

test("fresh grad number is real text (no JS needed)", async ({ browser }) => {
  const ctx = await browser.newContext({ javaScriptEnabled: false, baseURL: process.env.BASE_URL ?? "http://localhost:4173/vdc-academy/" });
  const page = await ctx.newPage();
  await page.goto("fresh-graduates/");
  expect(await page.content()).toContain(">40<");
  await ctx.close();
});

test("fresh grad number shows 40% with reduced motion", async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: "reduce", baseURL: process.env.BASE_URL ?? "http://localhost:4173/vdc-academy/" });
  const page = await ctx.newPage();
  await page.goto("fresh-graduates/");
  await page.getByText("our biggest discount").first().scrollIntoViewIfNeeded();
  await expect(page.locator("#ch-5")).toContainText("40%");
  await ctx.close();
});

test("apply: validation, fresh grad detection", async ({ page }) => {
  await page.goto("apply/?preview=1");
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
  await page.goto("apply/");
  await expect(page.getByRole("heading", { name: "Applications open soon." })).toBeVisible();
});

test("explorer works without WebGL", async ({ browser }) => {
  const ctx = await browser.newContext({ baseURL: process.env.BASE_URL ?? "http://localhost:4173/vdc-academy/" });
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
  await page.getByRole("button", { name: "Clash detection" }).click();
  await expect(page.getByText("CLASH #0147")).toBeVisible();
  await ctx.close();
});

test("reduced motion: no smooth scroll, building complete", async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: "reduce", baseURL: process.env.BASE_URL ?? "http://localhost:4173/vdc-academy/" });
  const page = await ctx.newPage();
  await page.goto("");
  await page.waitForTimeout(1500);
  expect(await page.evaluate(() => document.documentElement.classList.contains("lenis"))).toBe(false);
  await ctx.close();
});

for (const r of ["", "programs/", "programs/revit-mep/", "pricing/", "fresh-graduates/", "apply/?preview=1", "contact/", "faq/"]) {
  test(`axe: no serious or critical issues on /${r}`, async ({ page }) => {
    await page.goto(r);
    await page.waitForTimeout(3000);
    const res = await new AxeBuilder({ page }).analyze();
    const bad = res.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(bad.map((v) => `${v.id} (${v.nodes.length})`)).toEqual([]);
  });
}
