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
  await expect(page.locator('[data-testid="demo-card"]')).toHaveCount(13);
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

test("card 04 opens the admin with twenty-four sample applications, nothing leaves the browser", async ({ page }) => {
  const leaks = await noNetworkToSupabase(page);
  await page.goto("demo/");
  await page.getByRole("button", { name: "Open the admin" }).click();
  await page.waitForURL(/\/admin\/$/);
  await expect(page.getByTestId("stat-total")).toContainText("24");
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

test("register card 02 opens the instructor sign-up and no recruiter card is offered", async ({ page }) => {
  const leaks = await noNetworkToSupabase(page);
  await page.goto("demo/");
  await expect(page.getByRole("button", { name: "Register as a recruiter" })).toHaveCount(0);
  await page.getByRole("button", { name: "Register as an instructor" }).click();
  await page.waitForURL(/\/signup\/\?as=instructor/);
  expect(leaks).toEqual([]);
});

test("card 06 shows the instructor dashboard pending, and the approved view", async ({ page }) => {
  const leaks = await noNetworkToSupabase(page);
  await page.goto("demo/");
  await page.getByRole("button", { name: "Open the instructor dashboard" }).click();
  await page.waitForURL(/\/account\/$/);
  await expect(page.getByText("I-100", { exact: true })).toBeVisible();
  await expect(page.getByTestId("verification-banner")).toHaveAttribute("data-status", "pending");
  await expect(page.getByTestId("teaching-card")).toContainText("Sample Instructor 01");
  await expect(page.getByTestId("cohorts")).toContainText("Coming soon");
  await page.goto("demo/");
  await page.getByRole("button", { name: "Approved view" }).click();
  await page.waitForURL(/\/account\/$/);
  await expect(page.getByTestId("verification-banner")).toHaveAttribute("data-status", "approved");
  await expect(page.getByTestId("teaching-card")).toContainText("Sample Instructor 02");
  expect(leaks).toEqual([]);
});

test("register card 01: Fill sample data creates a student, confirmed at once", async ({ page }) => {
  const leaks = await noNetworkToSupabase(page);
  for (const [card, role] of [["Register as a student", "student"]] as const) {
    await page.goto("demo/");
    await page.getByRole("button", { name: card }).click();
    await page.waitForURL(/\/signup\/\?as=/);
    await expect(page.locator(`input[name="account_type"][value="${role}"]`)).toBeChecked();
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByTestId("fill-sample").click();
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByTestId("review")).toContainText(role === "student" ? "Sample Student" : "Sample Company C");
    await page.getByRole("button", { name: "Create account" }).click();
    await page.waitForURL(/\/account\/$/);
    const created = await page.evaluate(() => {
      const st = JSON.parse(localStorage.getItem("vdc-demo-state") ?? "{}");
      const u = st.users[st.users.length - 1];
      return st.tables.profiles.find((p: { id: string }) => p.id === u.id);
    });
    expect(created).toMatchObject({ account_type: role, role, onboarding_complete: true });
    expect(created.email).toMatch(/@example\.com$/);
  }
  expect(leaks).toEqual([]);
});

test("the demo super admin has the badge and the same admin screens", async ({ page }) => {
  await page.goto("demo/");
  await page.getByRole("button", { name: "Open as super admin" }).click();
  await page.waitForURL(/\/admin\/recruiters\//);
  await page.getByRole("button", { name: "Account menu" }).click();
  await expect(page.getByTestId("super-admin-badge")).toBeVisible();
  const email = await page.evaluate(() => JSON.parse(localStorage.getItem("vdc-demo-state") ?? "{}").roleGrants?.[0]?.email);
  expect(email).toBe("owner@example.com");
});

// The instructor sample sign-up in the demo: Fill sample data creates a confirmed instructor and the dashboard opens, with no
// call to a real Supabase.
test("demo: Fill sample data signs up an instructor and the pending dashboard opens", async ({ page }) => {
  const leaks = await noNetworkToSupabase(page);
  await page.goto("demo/");
  await page.getByRole("button", { name: "Register as an instructor" }).click();
  await page.waitForURL(/\/signup\/\?as=instructor/);
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByTestId("fill-sample").click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.locator('input[name="consent_terms"]').check();
  await page.locator('input[name="consent_contact"]').check();
  await page.locator('input[name="authorised_confirmed"]').check();
  await page.getByRole("button", { name: "Create account" }).click();
  await page.waitForURL(/\/account\/$/, { timeout: 15000 });
  await expect(page.getByTestId("verification-banner")).toHaveAttribute("data-status", "pending");
  expect(leaks).toEqual([]);
});

// The academy team has no application: /account/ sends a super admin to /admin/, the header shows Admin (not Apply or
// a student dashboard) and the account menu has no Dashboard entry.
test("super admin: /account/ goes to /admin/, header and menu show Admin, no student application", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("demo/");
  await page.getByRole("button", { name: "Open as super admin" }).click();
  await page.waitForURL(/\/admin\//);
  await page.goto("account/");
  await page.waitForURL(/\/admin\/$/);
  await expect(page.getByText("Start your application")).toHaveCount(0);
  await expect(page.locator("header").getByRole("link", { name: "Admin", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Account menu" }).click();
  await expect(page.getByRole("menuitem")).toHaveText([/Admin/, /Profile/, /Sign out/]);
});
