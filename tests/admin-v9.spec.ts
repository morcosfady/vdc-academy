import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import fs from "node:fs";
import { emptyState, loginAs, mockSupabase, seedUser, type MockState } from "./helpers/mockSupabase";

// v9 admin screens (users, recruiters, hiring, the new overview cards) against the static export and the
// in-memory Supabase mock (`?mock=1`). Seed: one admin, one super admin, three students (one older than a week,
// one still onboarding), three recruiters (pending, pending, approved; one older than a week), four hiring requests.

const DAY = 86400_000;
const ago = (days: number) => new Date(Date.now() - days * DAY).toISOString();
const hireId = (n: number) => `cccccccc-0000-4000-8000-${String(n).padStart(12, "0")}`;

function seed() {
  const state = emptyState();
  const admin = seedUser(state, "admin@vdc.test", "Secret123!", { full_name: "Ada Admin" }, "admin", { profile: { created_at: ago(30) } });
  const owner = seedUser(state, "owner@vdc.test", "Secret123!", { full_name: "Olive Owner" }, "super_admin", { profile: { created_at: ago(40) } });
  const mona = seedUser(state, "mona@example.com", "Secret123!", { full_name: "Mona Hassan" }, "student", { profile: { created_at: ago(1), country: "Egypt" } });
  const omar = seedUser(state, "omar@example.com", "Secret123!", { full_name: "Omar Ali" }, "student", { profile: { created_at: ago(2) } });
  const lina = seedUser(state, "lina@example.com", "Secret123!", { full_name: "Lina Old" }, "student", { profile: { created_at: ago(20) } });
  const rami = seedUser(state, "rami@build.test", "Secret123!", { full_name: "Rami Builder" }, "recruiter", {
    profile: { created_at: ago(1) },
    recruiter: { company_name: "Build Co", company_type: "general_contractor", company_size: "51-200", hiring_roles: ["bim_coordinator", "vdc_engineer"], expected_hires: "2-5", created_at: ago(1) },
  });
  const sara = seedUser(state, "sara@design.test", "Secret123!", { full_name: "Sara Designer" }, "recruiter", {
    profile: { created_at: ago(3) },
    recruiter: { company_name: "Design Studio", company_type: "ae_firm", company_size: "11-50", created_at: ago(3) },
  });
  const tom = seedUser(state, "tom@mep.test", "Secret123!", { full_name: "Tom Approved" }, "recruiter", {
    profile: { created_at: ago(15) },
    recruiter: { company_name: "MEP Partners", verification_status: "approved", verified_by: admin, verified_at: ago(10), created_at: ago(15) },
  });
  const request = (n: number, status: string, days: number, over: Record<string, unknown> = {}) => ({
    id: hireId(n),
    recruiter_id: tom,
    role: "bim_modeler",
    hires: 2,
    location: "Dallas, TX",
    work_mode: "hybrid",
    start_date: "2026-12-01",
    notes: "",
    status,
    created_at: ago(days),
    updated_at: ago(days),
    ...over,
  });
  state.tables.hiring_requests.push(
    request(1, "new", 1, { role: "vdc_engineer", hires: 3, notes: "Two on site in Fort Worth." }),
    request(2, "in_review", 4),
    request(3, "matched", 8),
    request(4, "closed", 12),
  );
  return { state, admin, owner, mona, omar, lina, rami, sara, tom };
}

async function openAs(page: Page, state: MockState, userId: string | null, path: string) {
  await mockSupabase(page, state);
  if (userId) await loginAs(page, state, userId);
  await page.goto(`${path}${path.includes("?") ? "&" : "?"}mock=1`);
}

const serious = async (page: Page) => (await new AxeBuilder({ page }).analyze()).violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => `${v.id} (${v.nodes.length})`);

test("the users table lists students and recruiters, filters, searches and exports", async ({ page }) => {
  const { state, admin } = seed();
  await openAs(page, state, admin, "admin/users/");
  const rows = page.getByTestId("user-row");
  await expect(rows).toHaveCount(8); // 3 students, 3 recruiters, 2 on the team
  await expect(page.getByRole("navigation", { name: "Admin sections" }).getByRole("link", { name: /Users/ })).toHaveAttribute("aria-current", "page");
  await expect(rows.filter({ hasText: "Olive Owner" })).toContainText("Academy team");
  await expect(rows.filter({ hasText: "Olive Owner" })).toContainText("Super admin");

  // account type
  await page.locator('button[data-type="recruiter"]').click();
  await expect(rows).toHaveCount(3);
  await expect(rows.filter({ hasText: "Build Co" })).toHaveCount(0); // company is not a column, the person is
  await expect(rows.filter({ hasText: "Rami Builder" })).toHaveCount(1);
  await page.locator('button[data-type="student"]').click();
  await expect(rows).toHaveCount(3);
  await expect(rows.first()).toContainText("Mona Hassan"); // newest first

  // verification status
  await page.locator('button[data-type="all"]').click();
  await page.getByRole("button", { name: "More filters" }).click();
  await page.getByTestId("verification").selectOption("Pending review");
  await expect(rows).toHaveCount(2);
  await expect(rows.filter({ hasText: "Tom Approved" })).toHaveCount(0);
  await page.getByTestId("verification").selectOption("Approved");
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText("Tom Approved");
  await page.getByTestId("verification").selectOption("Any verification state");

  // search by name, then by email
  await page.getByTestId("search").fill("omar");
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText("Omar Ali");
  await page.getByTestId("search").fill("design.test");
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText("Sara Designer");
  await page.getByTestId("search").fill("");

  // CSV of the filtered rows (recruiters only)
  await page.locator('button[data-type="recruiter"]').click();
  await expect(rows).toHaveCount(3);
  const waiting = page.waitForEvent("download");
  await page.getByTestId("csv-export").click();
  const download = await waiting;
  expect(download.suggestedFilename()).toMatch(/^users-\d{4}-\d{2}-\d{2}\.csv$/);
  const text = fs.readFileSync((await download.path())!, "utf8");
  const lines = text.split(/\r?\n/).filter(Boolean);
  expect(lines[0].startsWith("Name,Email,Account type,Role,Onboarding complete,Recruiter verification")).toBe(true);
  expect(lines).toHaveLength(4);
  expect(text).toContain("Rami Builder");
  expect(text).toContain("Build Co");
  expect(text).not.toContain("Mona Hassan");
});

test("the users table filters by onboarding and joined date", async ({ page }) => {
  const { state, admin } = seed();
  state.tables.profiles.find((p) => p.email === "omar@example.com")!.onboarding_complete = false;
  await openAs(page, state, admin, "admin/users/?type=student");
  const rows = page.getByTestId("user-row");
  await expect(rows).toHaveCount(3);
  await page.getByRole("button", { name: "More filters" }).click();
  await page.getByTestId("onboarding").selectOption("Onboarding not complete");
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText("Omar Ali");
  await page.getByTestId("onboarding").selectOption("Any onboarding state");
  await page.getByLabel("Joined from").fill(ago(7).slice(0, 10));
  await expect(rows).toHaveCount(2);
  await expect(rows.filter({ hasText: "Lina Old" })).toHaveCount(0);
});

test("approving a pending recruiter stamps the decision and calls the function", async ({ page }) => {
  const { state, admin, rami } = seed();
  await openAs(page, state, admin, "admin/recruiters/");
  const cards = page.getByTestId("recruiter-card");
  await expect(cards).toHaveCount(3);
  // pending first
  await expect(cards.nth(0)).toHaveAttribute("data-status", "pending");
  await expect(cards.nth(1)).toHaveAttribute("data-status", "pending");
  await expect(cards.nth(2)).toHaveAttribute("data-status", "approved");

  const card = page.locator(`[data-testid="recruiter-card"][data-id="${rami}"]`);
  await expect(card).toContainText("Build Co");
  await expect(card).toContainText("General contractor");
  await expect(card).toContainText("51 to 200");
  await expect(card).toContainText("BIM Coordinator, VDC Engineer");
  await expect(card).toContainText("2 to 5");
  await expect(card).toContainText("rami@build.test");
  await card.getByTestId("approve-recruiter").click();

  await expect(card).toHaveAttribute("data-status", "approved");
  await expect(card.getByTestId("verified-at")).toBeVisible();
  await expect(page.getByText(/Recruiter approved on/)).toBeVisible();
  const row = state.tables.recruiter_profiles.find((r) => r.id === rami)!;
  expect(row.verification_status).toBe("approved");
  expect(row.verified_by).toBe(admin);
  expect(typeof row.verified_at).toBe("string");
  expect(Date.now() - new Date(String(row.verified_at)).getTime()).toBeLessThan(60_000);
  const call = state.requests.find((r) => r.path === "/functions/v1/on-recruiter-verified");
  expect(call).toBeTruthy();
  expect(call!.body).toEqual({ recruiter_id: rami, status: "approved" });
});

test("rejecting a recruiter needs a note", async ({ page }) => {
  const { state, admin, sara } = seed();
  await openAs(page, state, admin, "admin/recruiters/");
  const card = page.locator(`[data-testid="recruiter-card"][data-id="${sara}"]`);
  await card.getByTestId("reject-recruiter").click();
  await card.getByTestId("confirm-reject").click();
  await expect(card.getByTestId("rejection-note-error")).toHaveText("Write a short note for the recruiter first.");
  await expect(card).toHaveAttribute("data-status", "pending");
  expect(state.requests.some((r) => r.method === "PATCH" && r.path === "/rest/v1/recruiter_profiles")).toBe(false);
  expect(state.tables.recruiter_profiles.find((r) => r.id === sara)!.verification_status).toBe("pending");

  await card.getByTestId("rejection-note").fill("We could not find this company. Reply with a company email address.");
  await card.getByTestId("confirm-reject").click();
  await expect(card).toHaveAttribute("data-status", "rejected");
  await expect(card).toContainText("We could not find this company.");
  const row = state.tables.recruiter_profiles.find((r) => r.id === sara)!;
  expect(row.verification_status).toBe("rejected");
  expect(row.rejection_note).toBe("We could not find this company. Reply with a company email address.");
  expect(row.verified_by).toBe(admin);
  expect(state.requests.some((r) => r.path === "/functions/v1/on-recruiter-verified" && (r.body as { status?: string })?.status === "rejected")).toBe(true);
});

test("the hiring inbox lists requests newest first and moves one to matched", async ({ page }) => {
  const { state, admin } = seed();
  await openAs(page, state, admin, "admin/hiring/");
  const rows = page.getByTestId("hiring-row");
  await expect(rows).toHaveCount(4);
  const first = rows.first();
  await expect(first).toContainText("MEP Partners");
  await expect(first).toContainText("Tom Approved");
  await expect(first).toContainText("VDC Engineer");
  await expect(first).toContainText("Dallas, TX · Hybrid");
  await expect(first).toContainText("Two on site in Fort Worth.");
  await expect(first).toContainText("01 Dec 2026");

  await first.getByTestId("hiring-status").selectOption("matched");
  await expect(page.getByText("Status set to Matched.")).toBeVisible();
  expect(state.tables.hiring_requests.find((r) => r.id === hireId(1))!.status).toBe("matched");

  await page.locator('button[data-status="matched"]').click();
  await expect(rows).toHaveCount(2);
});

test("the overview shows the accounts and hiring numbers", async ({ page }) => {
  const { state, admin } = seed();
  await openAs(page, state, admin, "admin/");
  await expect(page.getByTestId("stat-students-week")).toHaveText("2");
  await expect(page.getByTestId("stat-recruiters-week")).toHaveText("2");
  await expect(page.getByTestId("stat-recruiters-pending")).toHaveText("2");
  await expect(page.getByTestId("stat-hiring-open")).toHaveText("2");
  await expect(page.getByTestId("stat-total")).toHaveText("0"); // the existing cards stay
  await expect(page.getByRole("link", { name: /Recruiters to verify/ })).toHaveAttribute("href", /\/admin\/recruiters\/$/);
  await expect(page.getByRole("link", { name: /Open hiring requests/ })).toHaveAttribute("href", /\/admin\/hiring\/$/);
});

test("a super admin sees the same admin screens", async ({ page }) => {
  const { state, owner } = seed();
  await openAs(page, state, owner, "admin/");
  await expect(page.getByTestId("stat-recruiters-pending")).toHaveText("2");
  const nav = page.getByRole("navigation", { name: "Admin sections" });
  for (const label of ["Overview", "Applications", "Leads", "Users", "Recruiters", "Hiring"]) await expect(nav.getByRole("link", { name: new RegExp(label) })).toBeVisible();
  await page.goto("admin/users/?mock=1");
  await expect(page.getByTestId("user-row")).toHaveCount(8);
  await page.goto("admin/recruiters/?mock=1");
  await expect(page.getByTestId("recruiter-card")).toHaveCount(3);
  await page.goto("admin/hiring/?mock=1");
  await expect(page.getByTestId("hiring-row")).toHaveCount(4);
  await expect(page.getByText("This area is for the academy team.")).toHaveCount(0);
});

for (const who of ["student", "recruiter"] as const) {
  test(`a ${who} gets the 403 on the admin screens`, async ({ page }) => {
    const s = seed();
    const id = who === "student" ? s.mona : s.tom;
    for (const path of ["admin/", "admin/users/", "admin/recruiters/", "admin/hiring/"]) {
      await openAs(page, s.state, id, path);
      await expect(page.getByText("This area is for the academy team.")).toBeVisible();
      await expect(page.getByTestId("user-row")).toHaveCount(0);
      await expect(page.getByTestId("recruiter-card")).toHaveCount(0);
      await expect(page.getByTestId("hiring-row")).toHaveCount(0);
      await page.unrouteAll({ behavior: "ignoreErrors" });
    }
  });
}

const screens: [string, string, string][] = [
  ["users", "admin/users/", '[data-testid="user-row"]'],
  ["recruiters", "admin/recruiters/", '[data-testid="recruiter-card"]'],
  ["hiring", "admin/hiring/", '[data-testid="hiring-row"]'],
];

for (const width of [1440, 390]) {
  for (const [name, path, ready] of screens) {
    test(`${name} at ${width}: axe has no serious or critical issues and nothing overflows`, async ({ page }) => {
      const { state, admin } = seed();
      await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
      await openAs(page, state, admin, path);
      await page.locator(ready).first().waitFor();
      if (name === "recruiters") {
        // the open rejection form is part of the screen too
        await page.getByTestId("reject-recruiter").first().click();
        await page.getByTestId("confirm-reject").click();
        await expect(page.getByTestId("rejection-note-error")).toBeVisible();
      }
      expect(await serious(page)).toEqual([]);
      const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(over, `horizontal overflow on /${path} at ${width}`).toBeLessThanOrEqual(1);
    });
  }
}

test("the new screens have no em dash", async ({ page }) => {
  const { state, admin } = seed();
  for (const [, path, ready] of screens) {
    await openAs(page, state, admin, path);
    await page.locator(ready).first().waitFor();
    expect(await page.locator("body").innerText()).not.toContain("—");
    await page.unrouteAll({ behavior: "ignoreErrors" });
  }
});

// SHOTS=1 writes full-page captures of the three new screens at 1440 and 390 into tmp-shots/ (untracked).
test("screenshots of the v9 admin screens", async ({ page }) => {
  test.skip(!process.env.SHOTS, "set SHOTS=1 to capture");
  const { state, admin } = seed();
  fs.mkdirSync("tmp-shots", { recursive: true });
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
    for (const [name, path, ready] of [...screens, ["overview-v9", "admin/", '[data-testid="stat-hiring-open"]'] as [string, string, string]]) {
      await openAs(page, state, admin, path);
      await page.locator(ready).first().waitFor();
      await page.waitForTimeout(400);
      await page.screenshot({ path: `tmp-shots/${name}-${width}.png`, fullPage: true });
      await page.unrouteAll({ behavior: "ignoreErrors" });
    }
  }
});
