import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { emptyState, loginAs, mockSupabase, seedUser, type MockState } from "./helpers/mockSupabase";
import { tokenFor } from "../lib/demo/engine";

// Instructors (the people who teach the courses): dashboard I-100, the teaching profile, role menus and the /apply
// notice, against the static export with the in-memory mock (`?mock=1`). The mock mirrors 0008: an instructor never
// reads applications and never writes the verification columns.

// `?mock=1` goes before any #hash.
async function open(page: Page, path: string) {
  const [p, hash] = path.split("#");
  await page.goto(`${p}${p.includes("?") ? "&" : "?"}mock=1${hash ? `#${hash}` : ""}`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(600);
}

function instructorState(status: "pending" | "approved" | "rejected" = "pending", note: string | null = null, state: MockState = emptyState()) {
  const userId = seedUser(state, "ines@example.com", "Str0ng-pass!", { full_name: "Ines Carter" }, "instructor", {
    instructor: {
      job_title: "BIM manager",
      employer: "Lone Star Builders",
      industry_years: "10-15",
      teaching_years: "2-5",
      subjects: ["revit-mep", "navisworks-clash-detection"],
      teaching_format: "online",
      availability: "weekends",
      linkedin_url: "https://www.linkedin.com/in/ines-carter",
      bio: "Twelve years of BIM delivery on hospital and school projects, now teaching coordination to new modelers.",
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

test("pending instructor: I-100 sheet, pending banner, teaching card and an honest cohorts panel", async ({ page }) => {
  const { state, userId } = instructorState("pending");
  await mockSupabase(page, state);
  await loginAs(page, state, userId);
  await open(page, "account/");
  await expect(page.getByRole("heading", { name: "Welcome back, Ines." })).toBeVisible();
  await expect(page.getByText("I-100", { exact: true })).toBeVisible();

  const banner = page.getByTestId("verification-banner");
  await expect(banner).toHaveAttribute("data-status", "pending");
  await expect(banner).toContainText("We are reviewing your profile.");

  const card = page.getByTestId("teaching-card");
  await expect(card.getByRole("heading", { name: "BIM manager" })).toBeVisible();
  await expect(card).toContainText("Ines Carter, Lone Star Builders");
  await expect(card).toContainText("10 to 15 years");
  await expect(card).toContainText("2 to 5 years");
  await expect(card).toContainText("Online live");
  await expect(card).toContainText("Weekends");
  await expect(card.getByTestId("teaching-subjects").getByRole("listitem")).toHaveText(["Revit MEP", "Navisworks: Coordination & Clash Detection"]);
  await expect(card.getByRole("link", { name: "linkedin.com/in/ines-carter" })).toHaveAttribute("href", "https://www.linkedin.com/in/ines-carter");
  await expect(card).toContainText("Twelve years of BIM delivery");
  await expect(card.getByRole("link", { name: "Edit teaching profile" })).toHaveAttribute("href", /\/account\/profile\/#teaching$/);

  // the cohorts placeholder is gone: a pending instructor gets an honest note and no student data
  await expect(page.getByTestId("cohorts")).toHaveCount(0);
  const students = page.locator("#students");
  await expect(students).toContainText("Your students");
  await expect(page.getByTestId("students-locked")).toContainText("Students appear here after the academy team approves your profile.");
  await expect(page.getByTestId("student-card")).toHaveCount(0);

  // neither the student nor the recruiter dashboard is rendered for an instructor
  await expect(page.getByText("Programs for you")).toHaveCount(0);
  await expect(page.getByTestId("company-card")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Send request" })).toHaveCount(0);
});

test("approved instructor sees the approved banner and no rejection note", async ({ page }) => {
  const { state, userId } = instructorState("approved");
  await mockSupabase(page, state);
  await loginAs(page, state, userId);
  await open(page, "account/");
  const banner = page.getByTestId("verification-banner");
  await expect(banner).toHaveAttribute("data-status", "approved");
  await expect(banner).toContainText("Your teaching profile is approved.");
  await expect(page.getByTestId("rejection-note")).toHaveCount(0);
  await expect(page.getByTestId("teaching-card")).toContainText("Approved");
});

test("rejected instructor sees the team's note and a contact link", async ({ page }) => {
  const { state, userId } = instructorState("rejected", "Please add a recorded sample lesson and we will look again.");
  await mockSupabase(page, state);
  await loginAs(page, state, userId);
  await open(page, "account/");
  const banner = page.getByTestId("verification-banner");
  await expect(banner).toHaveAttribute("data-status", "rejected");
  await expect(banner).toContainText("We could not approve your teaching profile yet.");
  await expect(page.getByTestId("rejection-note")).toHaveText("Please add a recorded sample lesson and we will look again.");
  await expect(banner.getByRole("link", { name: "Contact us" })).toHaveAttribute("href", /\/contact\/$/);
});

test("teaching profile: fields stay required, edits save, verification stays read-only and unchanged", async ({ page }) => {
  const { state, userId } = instructorState("pending");
  await mockSupabase(page, state);
  await loginAs(page, state, userId);
  await open(page, "account/profile/#teaching");
  await expect(page.locator("#teaching")).toBeInViewport();
  await expect(page.getByTestId("account-type")).toContainText("Instructor");
  await expect(page.getByTestId("account-type").locator("input, select")).toHaveCount(0);
  const verification = page.getByTestId("verification-status");
  await expect(verification).toHaveAttribute("data-status", "pending");
  await expect(verification.locator("input, select, button")).toHaveCount(0);
  await expect(page.locator('input[name="employer"]')).toHaveValue("Lone Star Builders");
  await expect(page.locator('select[name="teaching_format"]')).toHaveValue("online");
  await expect(page.locator('input[name="subjects"][value="revit-mep"]')).toBeChecked();
  await expect(page.locator('textarea[name="bio"]')).toHaveAttribute("maxlength", "600");
  // a student's fields and a recruiter's fields are not on an instructor's profile
  await expect(page.locator('select[name="degree_field"]')).toHaveCount(0);
  await expect(page.locator('input[name="company_name"]')).toHaveCount(0);

  // every required field stays required
  await page.locator('input[name="employer"]').fill("");
  await page.locator('select[name="availability"]').selectOption("");
  await page.locator('input[name="subjects"][value="revit-mep"]').uncheck();
  await page.locator('input[name="subjects"][value="navisworks-clash-detection"]').uncheck();
  await page.locator('input[name="teaching_linkedin"]').fill("nope");
  await page.locator('textarea[name="bio"]').fill("Too short.");
  await page.getByRole("button", { name: "Save profile" }).click();
  for (const msg of [
    "Please enter your company or employer.",
    "Please choose when you are available.",
    "Please choose at least one program you can teach.",
    "Please enter your LinkedIn profile link (linkedin.com/in/...).",
    "Please write at least 40 characters about your background.",
  ])
    await expect(page.getByText(msg)).toBeVisible();
  await expect(page.locator('input[name="employer"]')).toBeFocused();
  expect(state.requests.some((r) => r.method === "PATCH")).toBe(false);

  await page.locator('input[name="employer"]').fill("Prairie Design Group");
  await page.locator('select[name="availability"]').selectOption("evenings");
  await page.locator('select[name="teaching_years"]').selectOption("5+");
  await page.locator('input[name="subjects"][value="revit-structure"]').check();
  await page.locator('input[name="teaching_linkedin"]').fill("https://www.linkedin.com/in/ines-carter-bim");
  await page.locator('textarea[name="bio"]').fill("Fifteen years of structural BIM on schools and hospitals, and a few years of teaching Revit to new modelers.");
  await page.locator('input[name="city"]').fill("Austin");
  await page.getByRole("button", { name: "Save profile" }).click();
  await expect(page.getByText("Profile saved.")).toBeVisible();

  const teaching = state.requests.find((r) => r.method === "PATCH" && r.path.startsWith("/rest/v1/instructor_profiles"))!;
  expect(teaching.body).toMatchObject({ employer: "Prairie Design Group", availability: "evenings", teaching_years: "5+", subjects: ["revit-structure"], linkedin_url: "https://www.linkedin.com/in/ines-carter-bim" });
  for (const k of ["verification_status", "verified_by", "verified_at", "rejection_note", "info_confirmed"]) expect(teaching.body).not.toHaveProperty(k);
  const person = state.requests.find((r) => r.method === "PATCH" && r.path.startsWith("/rest/v1/profiles"))!;
  expect(person.body).toMatchObject({ city: "Austin", full_name: "Ines Carter" });
  expect(person.body).not.toHaveProperty("role");
  expect(person.body).not.toHaveProperty("account_type");
  const row = state.tables.instructor_profiles.find((r) => r.id === userId)!;
  expect(row).toMatchObject({ employer: "Prairie Design Group", subjects: ["revit-structure"], verification_status: "pending" });
  expect(state.tables.profiles.find((p) => p.id === userId)).toMatchObject({ city: "Austin", onboarding_complete: true, role: "instructor", account_type: "instructor" });

  // even a direct write cannot approve the profile: the guard keeps the stored status
  const patched = await page.evaluate(
    async ([t, id]) => {
      const res = await fetch(`https://mock.supabase.local/rest/v1/instructor_profiles?id=eq.${id}`, {
        method: "PATCH",
        headers: { apikey: "mock-anon-key", Authorization: `Bearer ${t}`, "Content-Type": "application/json", Prefer: "return=representation" },
        body: JSON.stringify({ verification_status: "approved", rejection_note: "x" }),
      });
      return res.status;
    },
    [tokenFor(userId), userId],
  );
  expect(patched).toBeLessThan(500);
  expect(state.tables.instructor_profiles.find((r) => r.id === userId)).toMatchObject({ verification_status: "pending", rejection_note: null });
});

test("an instructor opening /apply sees that applications are for students", async ({ page }) => {
  const { state, userId } = instructorState("approved");
  await mockSupabase(page, state);
  await loginAs(page, state, userId);
  await open(page, "apply/");
  const notice = page.getByTestId("instructor-apply");
  await expect(notice.getByRole("heading", { name: "Applications are for students." })).toBeVisible();
  await expect(notice.getByRole("link", { name: "Go to your dashboard" })).toHaveAttribute("href", /\/account\/$/);
  await expect(page.getByTestId("recruiter-apply")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Continue" })).toHaveCount(0);
  // the apply flow's own draft lookup may run, but it finds nothing for this account and nothing is written
  expect(state.requests.filter((r) => r.path.startsWith("/rest/v1/applications") && r.method !== "GET")).toEqual([]);
  await axe(page);
});

test("an instructor never reads applications: the dashboard does not ask, and a direct read returns []", async ({ page }) => {
  const state = emptyState();
  const studentId = seedUser(state, "sara@example.com", "Str0ng-pass!", { full_name: "Sara Ahmed" });
  state.tables.applications.push({ id: "00000000-0000-4000-8000-00000000aaaa", user_id: studentId, status: "submitted", created_at: "2026-10-01T10:00:00Z", updated_at: "2026-10-01T10:00:00Z", submitted_at: "2026-10-01T10:00:00Z", programs: ["revit-mep"], discount_status: "none" });
  const { userId } = instructorState("approved", null, state);
  await mockSupabase(page, state);
  await loginAs(page, state, userId);
  await open(page, "account/");
  await expect(page.getByTestId("teaching-card")).toBeVisible();
  await open(page, "account/profile/");
  expect(state.requests.filter((r) => r.path.startsWith("/rest/v1/applications"))).toEqual([]);
  expect(state.requests.filter((r) => r.path.startsWith("/rest/v1/application_events"))).toEqual([]);
  expect(state.requests.filter((r) => r.path.startsWith("/rest/v1/hiring_requests"))).toEqual([]);

  const read = (token: string, table: string) =>
    page.evaluate(
      async ([t, name]) => {
        const res = await fetch(`https://mock.supabase.local/rest/v1/${name}?select=*`, { headers: { apikey: "mock-anon-key", Authorization: `Bearer ${t}` } });
        return res.json();
      },
      [token, table],
    );
  expect(await read(tokenFor(userId), "applications")).toEqual([]);
  // control: the owner of the row does see it
  expect(await read(tokenFor(studentId), "applications")).toHaveLength(1);
  // and the instructor sees no other person's profile
  const profiles = (await read(tokenFor(userId), "profiles")) as { id: string }[];
  expect(profiles.map((p) => p.id)).toEqual([userId]);
});

test("header for an instructor: Dashboard instead of Apply, instructor menu items", async ({ page }) => {
  const { state, userId } = instructorState("pending");
  await mockSupabase(page, state);
  await loginAs(page, state, userId);
  await open(page, "about/");
  const header = page.locator("header").first();
  await expect(header.getByRole("link", { name: "Dashboard", exact: true })).toBeVisible();
  await expect(header.getByRole("link", { name: "Dashboard", exact: true })).toHaveAttribute("href", /\/account\/$/);
  await expect(header.getByRole("link", { name: "Apply", exact: true })).toHaveCount(0);
  await expect(header.getByRole("link", { name: "Hire talent" })).toHaveCount(0);

  await header.getByRole("button", { name: "Account menu" }).click();
  await expect(page.getByRole("menuitem")).toHaveText([/Dashboard/, /My students/, /Teaching profile/, /Sign out/]);
  await expect(page.getByRole("menuitem", { name: /My students/ })).toHaveAttribute("href", /\/account\/#students$/);
  await expect(page.getByRole("menuitem", { name: /My applications/ })).toHaveCount(0);
  await expect(page.getByRole("menuitem", { name: /Teaching profile/ })).toHaveAttribute("href", /\/account\/profile\/#teaching$/);
  await page.getByRole("menuitem", { name: /Teaching profile/ }).click();
  await expect(page).toHaveURL(/\/account\/profile\/#teaching$/);
  await expect(page.locator("#teaching")).toBeInViewport();

  // the phone menu agrees
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Menu", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Menu" });
  await expect(dialog.getByRole("link", { name: /Teaching profile/ })).toBeVisible();
  await expect(dialog.getByRole("link", { name: /My students/ })).toHaveAttribute("href", /\/account\/#students$/);
  await expect(dialog.getByRole("link", { name: "Dashboard", exact: true })).toHaveAttribute("href", /\/account\/$/);
  await expect(dialog.getByRole("link", { name: "Apply now" })).toHaveCount(0);
  await expect(dialog.getByRole("link", { name: "Hire talent" })).toHaveCount(0);
});

test("instructor dashboard and profile: no placeholders, em dashes or serious axe issues", async ({ page }) => {
  const { state, userId } = instructorState("rejected", "Please add a recorded sample lesson.");
  await mockSupabase(page, state);
  await loginAs(page, state, userId);
  for (const r of ["account/", "account/profile/"]) {
    await open(page, r);
    await noText(page);
    await axe(page);
  }
  // pending and approved too (the brass and blueprint tags)
  for (const status of ["pending", "approved"]) {
    state.tables.instructor_profiles[0].verification_status = status;
    await open(page, "account/");
    await axe(page);
  }
});
