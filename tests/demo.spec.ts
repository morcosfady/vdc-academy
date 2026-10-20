import { expect, test, type Page } from "@playwright/test";

// The client demo (/demo/): the in-memory Supabase runs inside the page (lib/demo/browser.ts). No page.route here on
// purpose: if anything tried to leave the browser it would fail, and the test watches for that.

async function noNetworkToSupabase(page: Page) {
  const leaks: string[] = [];
  await page.route("**/*supabase*/**", (route) => {
    leaks.push(route.request().url());
    route.abort();
  });
  await page.route("**/demo-api/**", (route) => {
    leaks.push(route.request().url());
    route.abort();
  });
  return leaks;
}

test("the tour page turns the demo on, the banner shows everywhere, exit turns it off", async ({ page }) => {
  const leaks = await noNetworkToSupabase(page);
  await page.goto("demo/");
  await expect(page.getByRole("heading", { name: /full experience/ })).toBeVisible();
  await expect(page.locator('[data-testid="demo-card"]')).toHaveCount(5);
  await expect(page.getByText("Demo is off")).toBeVisible();
  await page.getByTestId("demo-start").click();
  await page.waitForLoadState("networkidle");
  await expect(page.getByTestId("demo-banner")).toContainText("Demo mode · sample data, nothing is saved");
  await expect(page.getByText("Demo is on")).toBeVisible();
  // the header moved down by the banner height
  expect(await page.getByRole("banner").evaluate((h) => getComputedStyle(h).top)).toBe("40px");
  // the banner follows to another page
  await page.goto("pricing/");
  await expect(page.getByTestId("demo-banner")).toBeVisible();
  await expect(page.getByRole("link", { name: "Log in" })).toBeVisible();
  await page.getByTestId("demo-exit").click();
  await page.waitForLoadState("networkidle");
  await expect(page).toHaveURL(/\/vdc-academy\/$/);
  await expect(page.getByTestId("demo-banner")).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem("vdc-demo"))).toBeNull();
  expect(leaks).toEqual([]);
});

test("card 04 opens the admin with sixteen sample applications, nothing leaves the browser", async ({ page }) => {
  const leaks = await noNetworkToSupabase(page);
  await page.goto("demo/");
  await page.getByRole("button", { name: "Open the admin" }).click();
  await page.waitForURL(/\/admin\/$/);
  await expect(page.getByTestId("stat-total")).toContainText("16");
  await expect(page.getByTestId("demo-banner")).toBeVisible();
  await page.goto("admin/applications/");
  await expect(page.locator('[data-testid="app-row"]').first()).toBeVisible();
  const text = await page.locator("main").innerText();
  expect(text).toContain("Sample Student");
  expect(text).not.toMatch(/\b(Sara|Omar|Ahmed)\b/);
  expect(leaks).toEqual([]);
});

test("card 02 shows the student dashboard at Under review with a pending discount; admin changes update it", async ({ page }) => {
  const leaks = await noNetworkToSupabase(page);
  await page.goto("demo/");
  await page.getByRole("button", { name: "Open the dashboard" }).click();
  await page.waitForURL(/\/account\/$/);
  await expect(page.getByRole("heading", { name: "Welcome back, Sample." })).toBeVisible();
  await expect(page.locator("main")).toContainText("Under review");
  await expect(page.locator("main")).toContainText("Pending check");

  // the admin verifies the discount
  await page.goto("demo/");
  await page.getByRole("button", { name: "Open the application" }).click();
  await page.waitForURL(/\/admin\/application\//);
  await expect(page.locator('[data-testid="documents"]')).toBeVisible();
  await page.getByRole("button", { name: /^Verify/ }).first().click();
  await expect(page.getByText("Verified").first()).toBeVisible();

  // the student sees it after a reload of their dashboard (state persisted in localStorage)
  await page.goto("demo/");
  await page.getByRole("button", { name: "Open the dashboard" }).click();
  await page.waitForURL(/\/account\/$/);
  await expect(page.locator("main")).toContainText("Verified");

  // reset brings the pending check back
  await page.getByTestId("demo-banner").getByRole("button", { name: "Reset demo data" }).click();
  await page.goto("demo/");
  await page.getByRole("button", { name: "Open the dashboard" }).click();
  await page.waitForURL(/\/account\/$/);
  await expect(page.locator("main")).toContainText("Pending check");
  expect(leaks).toEqual([]);
});

test("card 01: a new sign-up is confirmed at once and lands in the apply steps", async ({ page }) => {
  await page.goto("demo/");
  await page.getByRole("button", { name: "Open the apply gate" }).click();
  await page.waitForURL(/\/apply\/$/);
  await page.locator('input[name="name"]').fill("Sample Applicant");
  await page.locator('input[name="email"]').fill("applicant99@example.com");
  await page.locator('input[name="password"]').fill("demo-password-9");
  await page.locator('select[name="status"]').selectOption({ index: 1 });
  await page.locator('input[name="consent"]').check();
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText("STEP 01 / 05")).toBeVisible();
});
