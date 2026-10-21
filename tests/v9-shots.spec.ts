import { test, type Page } from "@playwright/test";
import fs from "node:fs";
import { mockSupabase } from "./helpers/mockSupabase";
import { chooseRole, consent, fillAccount, fillRecruiter, fillStudent, next } from "./helpers/register";

// v9 screenshot set for the handoff: SHOTS=1 writes docs/audit/v9/<name>-<width>.png (full page, reduced motion).
// Registration screens use the Playwright mock (so "Check your email" shows); the dashboards use the demo data.
const OUT = "docs/audit/v9";
test.skip(!process.env.SHOTS, "set SHOTS=1 to capture");
test.describe.configure({ mode: "serial" });

const shot = async (page: Page, name: string, w: number) => {
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/${name}-${w}.png`, fullPage: true });
};

for (const w of [1440, 390]) {
  test(`registration screens at ${w}`, async ({ browser }) => {
    fs.mkdirSync(OUT, { recursive: true });
    const ctx = await browser.newContext({ viewport: { width: w, height: w > 800 ? 900 : 844 }, reducedMotion: "reduce", baseURL: process.env.BASE_URL });
    const page = await ctx.newPage();
    await mockSupabase(page);
    await page.goto("signup/?mock=1");
    await page.waitForLoadState("networkidle");
    await shot(page, "01-role-choice", w);
    await chooseRole(page, "student");
    await fillAccount(page, "student91@example.com");
    await fillStudent(page);
    await shot(page, "02-student-details", w);
    await next(page);
    await consent(page);
    await shot(page, "04-review", w);
    await page.getByRole("button", { name: "Create account" }).click();
    await page.getByTestId("check-email").waitFor();
    await shot(page, "05-verify-email", w);
    // recruiter details with the error summary, then filled
    await page.evaluate(() => localStorage.removeItem("vdc-signup-draft"));
    await page.goto("signup/?mock=1&as=recruiter");
    await page.waitForLoadState("networkidle");
    await next(page);
    await fillAccount(page, "recruiter91@example.com");
    await next(page);
    await shot(page, "03b-recruiter-errors", w);
    await fillRecruiter(page);
    await shot(page, "03-recruiter-details", w);
    await ctx.close();
  });

  test(`dashboards and admin at ${w}`, async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: w, height: w > 800 ? 900 : 844 }, reducedMotion: "reduce", baseURL: process.env.BASE_URL });
    const page = await ctx.newPage();
    const card = async (label: string, url: RegExp) => {
      await page.goto("demo/");
      await page.getByRole("button", { name: label }).click();
      await page.waitForURL(url);
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(800);
    };
    await page.goto("demo/");
    await page.evaluate(() => localStorage.removeItem("vdc-demo-state"));
    await card("Open the recruiter dashboard", /account\/$/);
    await shot(page, "06-recruiter-dashboard-pending", w);
    await card("Open as super admin", /admin\/recruiters\//);
    await shot(page, "08-admin-recruiter-approval", w);
    await page.goto("admin/users/");
    await page.locator('[data-testid="user-row"]').first().waitFor();
    await shot(page, "07-admin-users", w);
    await page.goto("admin/");
    await page.getByRole("button", { name: "Account menu" }).click();
    await page.getByTestId("super-admin-badge").waitFor();
    await page.screenshot({ path: `${OUT}/09-super-admin-badge-${w}.png`, clip: { x: 0, y: 0, width: w, height: w > 800 ? 520 : 700 } });
    await ctx.close();
  });
}
