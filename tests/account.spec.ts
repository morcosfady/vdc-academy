import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import fs from "node:fs";
import { emptyState, loginAs, mockSupabase, seedUser, type MockState } from "./helpers/mockSupabase";

// Student accounts against the static export. `?mock=1` points lib/supabase.ts at https://mock.supabase.local,
// which tests/helpers/mockSupabase.ts answers in memory (auth, rest, storage). RLS is not modelled here.

const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");
const PDF = Buffer.from("%PDF-1.4\n1 0 obj << /Type /Catalog >> endobj\ntrailer << /Root 1 0 R >>\n%%EOF\n");

async function open(page: Page, path: string) {
  await page.goto(`${path}${path.includes("?") ? "&" : "?"}mock=1`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(600);
}

// A confirmed student with one submitted application that still waits for its graduation proof.
function seededStudent() {
  const state = emptyState();
  const userId = seedUser(state, "sara@example.com", "Str0ng-pass!", { full_name: "Sara Ahmed", current_status: "fresh_grad" });
  const appId = "00000000-0000-4000-8000-00000000aaaa";
  state.tables.applications.push({
    id: appId,
    user_id: userId,
    status: "submitted",
    created_at: "2026-10-01T10:00:00Z",
    updated_at: "2026-10-02T10:00:00Z",
    submitted_at: "2026-10-02T10:00:00Z",
    full_name: "Sara Ahmed",
    email: "sara@example.com",
    phone: "+1 555 123 4567",
    whatsapp: null,
    country: "USA",
    city: "Dallas",
    dob_or_age: "22 to 25",
    language: "English",
    current_status: "Fresh graduate",
    degree: "Architecture",
    university: "UT Arlington",
    graduation_year: 2026,
    gpa: null,
    experience_years: "None",
    job_title: null,
    company: null,
    software_skills: { Revit: "Beginner", AutoCAD: "Intermediate" },
    career_goal: "BIM Coordinator",
    linkedin_url: null,
    portfolio_url: null,
    programs: ["revit-mep"],
    format: "Online live",
    schedule: "Evenings",
    start_pref: "Next cohort",
    has_laptop: "Yes",
    source: "LinkedIn",
    discount_type: "fresh_grad",
    discount_percent: 40,
    discount_status: "pending",
    discount_verified: false,
    proof_file_path: null,
    cv_file_path: null,
    consent_privacy: true,
    consent_contact: true,
    newsletter: false,
    notes: null,
    utm: null,
  });
  state.tables.application_events.push({ id: "00000000-0000-4000-8000-00000000eeee", application_id: appId, actor_id: userId, type: "status_change", from_status: "draft", to_status: "submitted", note: null, visible_to_student: true, created_at: "2026-10-02T10:00:00Z" });
  return { state, userId, appId };
}

test("sign up shows Check your email, then confirmed login lands on the empty dashboard", async ({ page }) => {
  const state = await mockSupabase(page);
  await open(page, "signup/");
  await page.locator('input[name="name"]').fill("Test Student");
  await page.locator('input[name="email"]').fill("new@example.com");
  await page.locator('input[name="password"]').fill("Str0ng-pass!");
  await expect(page.getByText("Strong password.")).toBeVisible();
  await page.getByRole("button", { name: "Show password" }).click();
  await expect(page.locator('input[name="password"]')).toHaveAttribute("type", "text");
  await page.locator('select[name="status"]').selectOption("Fresh graduate");
  await expect(page.getByText("You may qualify for 40% off")).toBeVisible();
  // consent missing: inline error, nothing sent
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText("Please agree to continue.")).toBeVisible();
  expect(state.users).toHaveLength(0);
  await page.locator('input[name="consent"]').check();
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByRole("heading", { name: "Check your email." })).toBeVisible();
  await expect(page.getByText("new@example.com")).toBeVisible();
  expect(state.users).toHaveLength(1);
  expect(state.users[0].meta).toMatchObject({ full_name: "Test Student", current_status: "fresh_grad", marketing_opt_in: false });
  expect(state.tables.profiles[0].current_status).toBe("fresh_grad");
  await page.getByRole("button", { name: "Resend the email" }).click();
  await expect(page.getByText("Sent again.")).toBeVisible();

  // Unconfirmed: the login error says what to do.
  await open(page, "login/");
  await page.locator('input[name="email"]').fill("new@example.com");
  await page.locator('input[name="password"]').fill("Str0ng-pass!");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.getByText("Your email is not confirmed yet.")).toBeVisible();

  // Confirm through the mock (the email link), then log in.
  state.users[0].confirmed = true;
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/account\/$/);
  await expect(page.getByRole("heading", { name: "Welcome back, Test." })).toBeVisible();
  await expect(page.getByRole("heading", { name: "No application yet." })).toBeVisible();
  await expect(page.getByRole("link", { name: "Start your application" })).toBeVisible();
  await expect(page.getByText("Programs for you")).toBeVisible();
});

test("magic link and forgot password show their sent messages", async ({ page }) => {
  const state = await mockSupabase(page);
  await open(page, "login/");
  await page.getByRole("tab", { name: "Email me a link" }).click();
  await page.locator('input[name="email"]').fill("sara@example.com");
  await page.getByRole("button", { name: "Send me a link" }).click();
  await expect(page.getByText("We sent a login link to sara@example.com.")).toBeVisible();
  expect(state.requests.some((r) => r.method === "POST" && r.path.endsWith("/auth/v1/otp"))).toBe(true);

  await open(page, "login/");
  await page.getByRole("button", { name: "Forgot password?" }).click();
  await page.locator('input[name="reset-email"]').fill("sara@example.com");
  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(page.getByText("a reset link is on its way")).toBeVisible();
  const recover = state.requests.find((r) => r.method === "POST" && r.path.endsWith("/auth/v1/recover"));
  expect(recover).toBeTruthy();
  expect(JSON.stringify(recover!.body)).toContain("sara@example.com");
});

test("reset page saves a new password", async ({ page }) => {
  const { state, userId } = seededStudent();
  await mockSupabase(page, state);
  await loginAs(page, state, userId);
  await open(page, "account/reset-password/");
  await page.locator('input[name="password"]').fill("short");
  await page.locator('input[name="confirm"]').fill("other");
  await page.getByRole("button", { name: "Save password" }).click();
  await expect(page.getByText("Please use at least 8 characters.")).toBeVisible();
  await expect(page.getByText("The two passwords do not match.")).toBeVisible();
  await page.locator('input[name="password"]').fill("N3w-pass-word!");
  await page.locator('input[name="confirm"]').fill("N3w-pass-word!");
  await page.getByRole("button", { name: "Save password" }).click();
  await expect(page.getByText("Password saved.")).toBeVisible();
  const put = state.requests.find((r) => r.method === "PUT" && r.path.endsWith("/auth/v1/user"));
  expect(put).toBeTruthy();
  expect((put!.body as { password: string }).password).toBe("N3w-pass-word!");
  expect(state.users[0].password).toBe("N3w-pass-word!");
  await expect(page).toHaveURL(/\/account\/$/);
});

test("profile edit saves and avatar upload hits storage", async ({ page }) => {
  const { state, userId } = seededStudent();
  await mockSupabase(page, state);
  await loginAs(page, state, userId);
  await open(page, "account/profile/");
  await expect(page.getByRole("heading", { name: "Your profile." })).toBeVisible();
  await expect(page.locator('input[name="full_name"]')).toHaveValue("Sara Ahmed");
  await page.locator('input[name="city"]').fill("Dallas");
  await page.locator('input[name="country"]').fill("USA");
  await page.locator('input[name="graduation_year"]').fill("2026");
  await page.locator('input[name="linkedin_url"]').fill("not a link");
  await page.getByRole("button", { name: "Save profile" }).click();
  await expect(page.getByText("Please enter a full link starting with https://")).toBeVisible();
  await page.locator('input[name="linkedin_url"]').fill("https://www.linkedin.com/in/sara");
  await page.getByRole("button", { name: "Save profile" }).click();
  await expect(page.getByText("Profile saved.")).toBeVisible();
  const patch = state.requests.find((r) => r.method === "PATCH" && r.path.startsWith("/rest/v1/profiles"));
  expect(patch).toBeTruthy();
  expect(patch!.body).toMatchObject({ city: "Dallas", country: "USA", graduation_year: 2026, linkedin_url: "https://www.linkedin.com/in/sara" });
  expect(patch!.body).not.toHaveProperty("role");
  expect(state.tables.profiles[0].city).toBe("Dallas");

  await page.locator('input[type="file"][accept^="image"]').setInputFiles({ name: "me.png", mimeType: "image/png", buffer: PNG });
  await expect
    .poll(() => Object.keys(state.files).find((k) => k.startsWith(`avatars/${userId}/`)))
    .toMatch(/^avatars\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.png$/);
  await expect.poll(() => state.tables.profiles[0].avatar_path).toMatch(/^[0-9a-f-]{36}\/[0-9a-f-]{36}\.png$/);
});

test("logged-out visit to /account/ goes to the login page with next", async ({ page }) => {
  await mockSupabase(page);
  await open(page, "account/");
  await expect(page).toHaveURL(/\/login\/\?next=%2Faccount%2F/);
  await expect(page.getByRole("heading", { name: "Welcome back." })).toBeVisible();
});

test("seeded student sees the timeline with a dated Submitted step, documents and the application page by id", async ({ page }) => {
  const { state, userId, appId } = seededStudent();
  await mockSupabase(page, state);
  await loginAs(page, state, userId);
  await open(page, "account/");
  await expect(page.getByRole("heading", { name: "Welcome back, Sara." })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Revit MEP" })).toBeVisible();
  const timeline = page.getByRole("list", { name: "Application status" });
  const submitted = timeline.locator("li").first();
  await expect(submitted).toHaveAttribute("aria-current", "step");
  await expect(submitted).toContainText("Submitted");
  await expect(submitted).toContainText("Oct 2, 2026");
  await expect(page.getByText("Upload your graduation proof")).toBeVisible();

  // A proof upload while submitted is not offered (locked), but an upload on a draft saves the path.
  await expect(page.getByText("Documents are locked once an application is submitted.")).toBeVisible();

  await page.getByRole("link", { name: "View" }).click();
  await expect(page).toHaveURL(new RegExp(`account/application/\\?id=${appId}`));
  await expect(page.getByRole("heading", { name: "Your application." })).toBeVisible();
  await expect(page.getByText("APP-00000000")).toBeVisible();
  await expect(page.getByText("UT Arlington")).toBeVisible();
  await expect(page.getByText("Revit (Beginner), AutoCAD (Intermediate)")).toBeVisible();
  await expect(page.getByText("Status changed")).toBeVisible();

  // Someone else's id (or a bad one) is a calm not-found state.
  await open(page, "account/application/?id=00000000-0000-4000-8000-00000000bbbb");
  await expect(page.getByRole("heading", { name: "We cannot find that application." })).toBeVisible();
});

test("draft application: documents upload saves the path on the row", async ({ page }) => {
  const { state, userId, appId } = seededStudent();
  Object.assign(state.tables.applications[0], { status: "draft", submitted_at: null });
  state.tables.application_events.length = 0;
  await mockSupabase(page, state);
  await loginAs(page, state, userId);
  await open(page, "account/");
  await expect(page.getByRole("link", { name: "Continue application" })).toBeVisible();
  await page.locator('input[type="file"][aria-label="Upload CV"]').setInputFiles({ name: "cv.pdf", mimeType: "application/pdf", buffer: PDF });
  await expect(page.getByText("Document saved.")).toBeVisible();
  const row = state.tables.applications.find((a) => a.id === appId)!;
  expect(String(row.cv_file_path)).toMatch(new RegExp(`^${userId}/[0-9a-f-]{36}\\.pdf$`));
  expect(Object.keys(state.files).some((k) => k === `documents/${row.cv_file_path}`)).toBe(true);
});

test("header shows the initials menu when logged in and Log in when not", async ({ page }) => {
  const { state, userId } = seededStudent();
  await mockSupabase(page, state);
  await loginAs(page, state, userId);
  await open(page, "about/");
  const menu = page.getByRole("button", { name: "Account menu" });
  await expect(menu).toBeVisible();
  await expect(menu).toHaveText("SA");
  await menu.click();
  await expect(page.getByRole("menuitem", { name: /Dashboard/ })).toBeVisible();

  const ctx = await page.context().browser()!.newContext({ baseURL: process.env.BASE_URL ?? "http://localhost:4173/vdc-academy/" });
  const fresh = await ctx.newPage();
  await mockSupabase(fresh);
  await open(fresh, "about/");
  await expect(fresh.getByRole("link", { name: "Log in" })).toBeVisible();
  await expect(fresh.getByRole("button", { name: "Account menu" })).toHaveCount(0);
  await ctx.close();
});

test("auth pages have no placeholders, em dashes or serious axe issues", async ({ page }) => {
  const { state, userId } = seededStudent();
  await mockSupabase(page, state);
  for (const r of ["signup/", "login/"]) {
    await open(page, r);
    const text = await page.locator("body").innerText();
    expect(text).not.toMatch(/\[[A-Z][A-Z0-9 \/]{1,40}\]/);
    expect(text).not.toContain("—");
    const res = await new AxeBuilder({ page }).analyze();
    expect(res.violations.filter((v) => v.impact === "serious" || v.impact === "critical")).toEqual([]);
  }
  await loginAs(page, state, userId);
  for (const r of ["account/", "account/profile/"]) {
    await open(page, r);
    await page.waitForTimeout(600);
    const text = await page.locator("body").innerText();
    expect(text).not.toMatch(/\[[A-Z][A-Z0-9 \/]{1,40}\]/);
    expect(text).not.toContain("—");
    const res = await new AxeBuilder({ page }).analyze();
    expect(res.violations.filter((v) => v.impact === "serious" || v.impact === "critical")).toEqual([]);
  }
});

// Screenshots for the hand-off: SHOTS=1 writes tmp-shots/<page>-<width>.png (untracked).
test.describe("screenshots", () => {
  test.skip(!process.env.SHOTS, "set SHOTS=1 to capture");
  const widths = [1440, 390];
  async function shot(page: Page, name: string, width: number) {
    await page.setViewportSize({ width, height: width > 600 ? 900 : 844 });
    await page.waitForTimeout(400);
    fs.mkdirSync("tmp-shots", { recursive: true });
    await page.screenshot({ path: `tmp-shots/${name}-${width}.png`, fullPage: true });
  }
  for (const width of widths) {
    test(`capture at ${width}`, async ({ page }) => {
      const empty: MockState = emptyState();
      const emptyId = seedUser(empty, "test@example.com", "Str0ng-pass!", { full_name: "Test Student", current_status: "student" });
      await mockSupabase(page, empty);
      await open(page, "login/");
      await shot(page, "login", width);
      await open(page, "signup/");
      await shot(page, "signup", width);
      await loginAs(page, empty, emptyId);
      await open(page, "account/");
      await shot(page, "dashboard-empty", width);

      const ctx = await page.context().browser()!.newContext({ baseURL: process.env.BASE_URL ?? "http://localhost:4173/vdc-academy/" });
      const p2 = await ctx.newPage();
      const { state, userId, appId } = seededStudent();
      await mockSupabase(p2, state);
      await loginAs(p2, state, userId);
      await open(p2, "account/");
      await shot(p2, "dashboard-app", width);
      await open(p2, "account/profile/");
      await shot(p2, "profile", width);
      await open(p2, `account/application/?id=${appId}`);
      await shot(p2, "application", width);
      await ctx.close();
    });
  }
});
