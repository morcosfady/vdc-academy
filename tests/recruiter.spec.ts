import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import fs from "node:fs";
import { emptyState, loginAs, mockSupabase, seedUser, type MockState } from "./helpers/mockSupabase";
import { tokenFor } from "../lib/demo/engine";

// v9 recruiters, role menus and the v9 profile against the static export with the in-memory mock (`?mock=1`).
// The mock mirrors 0005: recruiters insert and read only their own hiring requests, never applications, and never
// write the verification columns.

// `?mock=1` goes before any #hash.
async function open(page: Page, path: string) {
  const [p, hash] = path.split("#");
  await page.goto(`${p}${p.includes("?") ? "&" : "?"}mock=1${hash ? `#${hash}` : ""}`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(600);
}

const day = (offset: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

function recruiterState(status: "pending" | "approved" | "rejected" = "pending", note: string | null = null, state: MockState = emptyState()) {
  const userId = seedUser(state, "rita@example.com", "Str0ng-pass!", { full_name: "Rita Haddad" }, "recruiter", {
    recruiter: {
      job_title: "Talent lead",
      company_name: "Lone Star Builders",
      company_website: "https://lonestar.example.com",
      company_type: "general_contractor",
      company_size: "51-200",
      linkedin_url: "https://www.linkedin.com/in/rita-haddad",
      hiring_roles: ["bim_coordinator", "vdc_engineer"],
      expected_hires: "2-5",
      verification_status: status,
      rejection_note: note,
    },
  });
  return { state, userId };
}

const noText = async (page: Page) => {
  const text = await page.locator("body").innerText();
  expect(text).not.toMatch(/\[[A-Z][A-Z0-9 \/]{1,40}\]/);
  expect(text).not.toContain("—");
};
const axe = async (page: Page) => {
  const res = await new AxeBuilder({ page }).analyze();
  expect(res.violations.filter((v) => v.impact === "serious" || v.impact === "critical")).toEqual([]);
};

test("pending recruiter: R-100 sheet, pending banner, company card and the coming-soon talent pool", async ({ page }) => {
  const { state, userId } = recruiterState("pending");
  await mockSupabase(page, state);
  await loginAs(page, state, userId);
  await open(page, "account/");
  await expect(page.getByRole("heading", { name: "Welcome back, Rita." })).toBeVisible();
  await expect(page.getByText("R-100", { exact: true })).toBeVisible();

  const banner = page.getByTestId("verification-banner");
  await expect(banner).toHaveAttribute("data-status", "pending");
  await expect(banner).toContainText("We're reviewing your company account. This usually takes up to 2 working days.");

  const card = page.getByTestId("company-card");
  await expect(card.getByRole("heading", { name: "Lone Star Builders" })).toBeVisible();
  await expect(card).toContainText("Rita Haddad, Talent lead");
  await expect(card).toContainText("General contractor");
  await expect(card).toContainText("51 to 200");
  await expect(card).toContainText("BIM Coordinator, VDC Engineer");
  await expect(card).toContainText("2 to 5");
  await expect(card.getByRole("link", { name: "lonestar.example.com" })).toHaveAttribute("href", "https://lonestar.example.com");

  const teaser = page.getByTestId("talent-pool");
  await expect(teaser).toContainText("Coming soon");
  await expect(teaser).toContainText("Approved recruiters will be able to see graduates who choose to share their profile.");
  await expect(page.getByTestId("review-note")).toHaveText("Requests are reviewed once your company account is verified.");
  await expect(page.getByText("No requests yet.")).toBeVisible();
  // the student dashboard is not rendered for a recruiter
  await expect(page.getByText("Programs for you")).toHaveCount(0);
});

test("hiring request: required fields first, then it is stored as new for this recruiter and listed", async ({ page }) => {
  const { state, userId } = recruiterState("pending");
  await mockSupabase(page, state);
  await loginAs(page, state, userId);
  await open(page, "account/#hiring");
  await expect(page.locator("#hiring")).toBeInViewport();

  const send = page.getByRole("button", { name: "Send request" });
  await send.click();
  for (const msg of ["Please choose a role.", "Please enter a number from 1 to 500.", "Please enter a location.", "Please choose a work mode.", "Please choose a start date."]) await expect(page.getByText(msg)).toBeVisible();
  await expect(page.locator('select[name="role"]')).toBeFocused();

  await page.locator('select[name="role"]').selectOption("vdc_engineer");
  await page.locator('input[name="hires"]').fill("501");
  await page.locator('input[name="location"]').fill("Dallas, TX");
  await page.locator('select[name="work_mode"]').selectOption("hybrid");
  await page.locator('input[name="start_date"]').fill(day(-1));
  await send.click();
  await expect(page.getByText("Please enter a number from 1 to 500.")).toBeVisible();
  await expect(page.getByText("Please choose today or a later date.")).toBeVisible();
  expect(state.requests.some((r) => r.method === "POST" && r.path.startsWith("/rest/v1/hiring_requests"))).toBe(false);

  await page.locator('input[name="hires"]').fill("3");
  const start = day(30);
  await page.locator('input[name="start_date"]').fill(start);
  await page.locator('textarea[name="notes"]').fill("Revit and Navisworks, coordination on hospital work.");
  await send.click();
  await expect(page.getByText("Request sent.")).toBeVisible();

  const row = page.getByTestId("hiring-row");
  await expect(row).toHaveCount(1);
  await expect(row).toContainText("VDC Engineer · 3 hires");
  await expect(row).toContainText("Dallas, TX · Hybrid");
  await expect(row).toContainText("New");
  // the form is ready for the next request
  await expect(page.locator('select[name="role"]')).toHaveValue("");

  expect(state.tables.hiring_requests).toHaveLength(1);
  expect(state.tables.hiring_requests[0]).toMatchObject({ recruiter_id: userId, status: "new", role: "vdc_engineer", hires: 3, location: "Dallas, TX", work_mode: "hybrid", start_date: start });

  // newest first after a reload
  state.tables.hiring_requests.push({ id: "00000000-0000-4000-8000-00000000c0de", recruiter_id: userId, role: "bim_modeler", hires: 1, location: "Remote", work_mode: "remote", start_date: day(60), notes: "", status: "in_review", created_at: "2020-01-01T00:00:00Z", updated_at: "2020-01-01T00:00:00Z" });
  await open(page, "account/");
  await expect(page.getByTestId("hiring-row")).toHaveCount(2);
  await expect(page.getByTestId("hiring-row").first()).toContainText("VDC Engineer");
  await expect(page.getByTestId("hiring-row").last()).toContainText("In review");
});

test("approved recruiter sees the verified banner and no review note", async ({ page }) => {
  const { state, userId } = recruiterState("approved");
  await mockSupabase(page, state);
  await loginAs(page, state, userId);
  await open(page, "account/");
  const banner = page.getByTestId("verification-banner");
  await expect(banner).toHaveAttribute("data-status", "approved");
  await expect(banner).toContainText("Your company account is verified.");
  await expect(page.getByTestId("review-note")).toHaveCount(0);
});

test("rejected recruiter sees the team's note and a contact link", async ({ page }) => {
  const { state, userId } = recruiterState("rejected", "We could not match the website to the company name.");
  await mockSupabase(page, state);
  await loginAs(page, state, userId);
  await open(page, "account/");
  const banner = page.getByTestId("verification-banner");
  await expect(banner).toHaveAttribute("data-status", "rejected");
  await expect(banner).toContainText("We could not verify your company account.");
  await expect(page.getByTestId("rejection-note")).toHaveText("We could not match the website to the company name.");
  await expect(banner.getByRole("link", { name: "Contact us" })).toHaveAttribute("href", /\/contact\/$/);
  await expect(page.getByTestId("review-note")).toBeVisible();
});

test("header for a recruiter: Hire talent instead of Apply, recruiter menu items", async ({ page }) => {
  const { state, userId } = recruiterState("pending");
  await mockSupabase(page, state);
  await loginAs(page, state, userId);
  await open(page, "about/");
  const header = page.locator("header").first();
  await expect(header.getByRole("link", { name: "Hire talent" })).toBeVisible();
  await expect(header.getByRole("link", { name: "Hire talent" })).toHaveAttribute("href", /\/account\/#hiring$/);
  await expect(header.getByRole("link", { name: "Apply", exact: true })).toHaveCount(0);

  await header.getByRole("button", { name: "Account menu" }).click();
  const items = page.getByRole("menuitem");
  await expect(items).toHaveText([/Dashboard/, /Company profile/, /Hiring requests/, /Sign out/]);
  await expect(page.getByRole("menuitem", { name: /My applications/ })).toHaveCount(0);
  await expect(page.getByRole("menuitem", { name: /Company profile/ })).toHaveAttribute("href", /\/account\/profile\/#company$/);
  await page.getByRole("menuitem", { name: /Hiring requests/ }).click();
  await expect(page).toHaveURL(/\/account\/#hiring$/);
  await expect(page.locator("#hiring")).toBeInViewport();

  // the phone menu agrees
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Menu", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Menu" });
  await expect(dialog.getByRole("link", { name: /Hiring requests/ })).toBeVisible();
  await expect(dialog.getByRole("link", { name: "Hire talent" })).toBeVisible();
  await expect(dialog.getByRole("link", { name: "Apply now" })).toHaveCount(0);
});

test("a recruiter never reads applications: the dashboard does not ask, and a direct read returns []", async ({ page }) => {
  const state = emptyState();
  const studentId = seedUser(state, "sara@example.com", "Str0ng-pass!", { full_name: "Sara Ahmed" });
  state.tables.applications.push({ id: "00000000-0000-4000-8000-00000000aaaa", user_id: studentId, status: "submitted", created_at: "2026-10-01T10:00:00Z", updated_at: "2026-10-01T10:00:00Z", submitted_at: "2026-10-01T10:00:00Z", programs: ["revit-mep"], discount_status: "none" });
  const { userId } = recruiterState("approved", null, state);
  await mockSupabase(page, state);
  await loginAs(page, state, userId);
  await open(page, "account/");
  await expect(page.getByTestId("company-card")).toBeVisible();
  expect(state.requests.filter((r) => r.path.startsWith("/rest/v1/applications"))).toEqual([]);
  expect(state.requests.filter((r) => r.path.startsWith("/rest/v1/application_events"))).toEqual([]);

  const read = (token: string) =>
    page.evaluate(async (t) => {
      const res = await fetch("https://mock.supabase.local/rest/v1/applications?select=*", { headers: { apikey: "mock-anon-key", Authorization: `Bearer ${t}` } });
      return res.json();
    }, token);
  expect(await read(tokenFor(userId))).toEqual([]);
  // control: the owner of the row does see it
  expect(await read(tokenFor(studentId))).toHaveLength(1);
});

test("super admin badge shows for a super admin and not for an admin; team menu", async ({ page, browser }) => {
  const state = emptyState();
  const ownerId = seedUser(state, "owner@example.com", "Str0ng-pass!", { full_name: "Owner Person" }, "super_admin");
  await mockSupabase(page, state);
  await loginAs(page, state, ownerId);
  await open(page, "about/");
  await page.getByRole("button", { name: "Account menu" }).click();
  await expect(page.getByTestId("super-admin-badge")).toHaveText("Super admin");
  await expect(page.getByRole("menuitem")).toHaveText([/Admin/, /Dashboard/, /Profile/, /Sign out/]);

  const ctx = await browser.newContext({ baseURL: process.env.BASE_URL ?? "http://localhost:4173/vdc-academy/" });
  const p2 = await ctx.newPage();
  const s2 = emptyState();
  const adminId = seedUser(s2, "admin@example.com", "Str0ng-pass!", { full_name: "Admin Person" }, "admin");
  await mockSupabase(p2, s2);
  await loginAs(p2, s2, adminId);
  await open(p2, "about/");
  await p2.getByRole("button", { name: "Account menu" }).click();
  await expect(p2.getByRole("menuitem", { name: /Admin/ })).toBeVisible();
  await expect(p2.getByTestId("super-admin-badge")).toHaveCount(0);
  await ctx.close();
});

test("student profile: v9 fields show, required ones stay required, edits save", async ({ page }) => {
  const state = emptyState();
  const userId = seedUser(state, "sara@example.com", "Str0ng-pass!", { full_name: "Sara Ahmed", current_status: "fresh_grad" });
  await mockSupabase(page, state);
  await loginAs(page, state, userId);
  await open(page, "account/profile/");
  await expect(page.getByTestId("account-type")).toContainText("Student");
  await expect(page.getByTestId("account-type").locator("input, select")).toHaveCount(0);
  await expect(page.locator('select[name="current_status"]')).toHaveValue("fresh_grad");
  await expect(page.locator('select[name="degree_field"]')).toHaveValue("architecture");
  await expect(page.locator('input[name="date_of_birth"]')).toHaveValue("2000-01-01");

  await page.locator('input[name="university"]').fill("");
  await page.locator('select[name="career_goal"]').selectOption("vdc_engineer");
  await page.locator('select[name="revit_level"]').selectOption("advanced");
  await page.locator('input[name="date_of_birth"]').fill("1999-05-04");
  await page.getByRole("button", { name: "Save profile" }).click();
  await expect(page.getByText("Please enter your university or school.")).toBeVisible();
  expect(state.requests.some((r) => r.method === "PATCH" && r.path.startsWith("/rest/v1/profiles"))).toBe(false);

  await page.locator('input[name="university"]').fill("UT Arlington");
  await page.getByRole("button", { name: "Save profile" }).click();
  await expect(page.getByText("Profile saved.")).toBeVisible();
  const patch = state.requests.find((r) => r.method === "PATCH" && r.path.startsWith("/rest/v1/profiles"))!;
  expect(patch.body).toMatchObject({ university: "UT Arlington", career_goal: "vdc_engineer", revit_level: "advanced", date_of_birth: "1999-05-04", current_status: "fresh_grad" });
  expect(patch.body).not.toHaveProperty("role");
  expect(patch.body).not.toHaveProperty("account_type");
  expect(state.tables.profiles[0]).toMatchObject({ university: "UT Arlington", career_goal: "vdc_engineer", onboarding_complete: true, account_type: "student" });
});

test("recruiter profile: company section at #company saves, verification stays read-only", async ({ page }) => {
  const { state, userId } = recruiterState("pending");
  await mockSupabase(page, state);
  await loginAs(page, state, userId);
  await open(page, "account/profile/#company");
  await expect(page.locator("#company")).toBeInViewport();
  await expect(page.getByTestId("account-type")).toContainText("Recruiter");
  const verification = page.getByTestId("verification-status");
  await expect(verification).toHaveAttribute("data-status", "pending");
  await expect(verification.locator("input, select, button")).toHaveCount(0);
  await expect(page.locator('input[name="company_name"]')).toHaveValue("Lone Star Builders");
  // students' fields are not on a recruiter's profile
  await expect(page.locator('select[name="degree_field"]')).toHaveCount(0);

  await page.locator('input[name="company_name"]').fill("Lone Star Builders Inc");
  await page.locator('input[name="company_website"]').fill("nope");
  await page.locator('select[name="company_size"]').selectOption("201-1000");
  await page.locator('input[name="hiring_roles"][value="bim_coordinator"]').uncheck();
  await page.locator('input[name="hiring_roles"][value="vdc_engineer"]').uncheck();
  await page.locator('input[name="city"]').fill("Austin");
  await page.getByRole("button", { name: "Save profile" }).click();
  await expect(page.getByText("Please enter the full website address, starting with https://")).toBeVisible();
  await expect(page.getByText("Please choose at least one role you hire for.")).toBeVisible();
  expect(state.requests.some((r) => r.method === "PATCH")).toBe(false);

  await page.locator('input[name="company_website"]').fill("https://lonestar.example.com");
  await page.locator('input[name="hiring_roles"][value="bim_manager"]').check();
  await page.getByRole("button", { name: "Save profile" }).click();
  await expect(page.getByText("Profile saved.")).toBeVisible();

  const company = state.requests.find((r) => r.method === "PATCH" && r.path.startsWith("/rest/v1/recruiter_profiles"))!;
  expect(company.body).toMatchObject({ company_name: "Lone Star Builders Inc", company_size: "201-1000", hiring_roles: ["bim_manager"] });
  for (const k of ["verification_status", "verified_by", "verified_at", "rejection_note"]) expect(company.body).not.toHaveProperty(k);
  const person = state.requests.find((r) => r.method === "PATCH" && r.path.startsWith("/rest/v1/profiles"))!;
  expect(person.body).toMatchObject({ city: "Austin", full_name: "Rita Haddad" });
  expect(person.body).not.toHaveProperty("role");
  const row = state.tables.recruiter_profiles.find((r) => r.id === userId)!;
  expect(row).toMatchObject({ company_name: "Lone Star Builders Inc", hiring_roles: ["bim_manager"], verification_status: "pending" });
  expect(state.tables.profiles.find((p) => p.id === userId)).toMatchObject({ city: "Austin", onboarding_complete: true, role: "recruiter" });
});

test("recruiter dashboard and both profile variants: no placeholders, em dashes or serious axe issues", async ({ page, browser }) => {
  const { state, userId } = recruiterState("rejected", "Please use a company email.");
  await mockSupabase(page, state);
  await loginAs(page, state, userId);
  for (const r of ["account/", "account/profile/"]) {
    await open(page, r);
    await noText(page);
    await axe(page);
  }
  // a pending one too (the brass tag and the review note)
  state.tables.recruiter_profiles[0].verification_status = "pending";
  await open(page, "account/");
  await axe(page);

  const ctx = await browser.newContext({ baseURL: process.env.BASE_URL ?? "http://localhost:4173/vdc-academy/" });
  const p2 = await ctx.newPage();
  const s2 = emptyState();
  const studentId = seedUser(s2, "sara@example.com", "Str0ng-pass!", { full_name: "Sara Ahmed" });
  await mockSupabase(p2, s2);
  await loginAs(p2, s2, studentId);
  await open(p2, "account/profile/");
  await noText(p2);
  await axe(p2);
  await ctx.close();
});

// Screenshots for the hand-off: SHOTS=1 writes tmp-shots/recruiter-<page>-<width>.png (untracked).
test.describe("screenshots", () => {
  test.skip(!process.env.SHOTS, "set SHOTS=1 to capture");
  for (const width of [1440, 390]) {
    test(`recruiter capture at ${width}`, async ({ page }) => {
      const { state, userId } = recruiterState("pending");
      state.tables.hiring_requests.push({ id: "00000000-0000-4000-8000-00000000c0de", recruiter_id: userId, role: "bim_coordinator", hires: 2, location: "Dallas, TX", work_mode: "hybrid", start_date: day(45), notes: "", status: "new", created_at: "2026-10-20T10:00:00Z", updated_at: "2026-10-20T10:00:00Z" });
      await mockSupabase(page, state);
      await loginAs(page, state, userId);
      await page.setViewportSize({ width, height: width > 600 ? 900 : 844 });
      fs.mkdirSync("tmp-shots", { recursive: true });
      await open(page, "account/");
      await page.screenshot({ path: `tmp-shots/recruiter-dashboard-${width}.png`, fullPage: true });
      await open(page, "account/profile/");
      await page.screenshot({ path: `tmp-shots/recruiter-profile-${width}.png`, fullPage: true });
    });
  }
});
