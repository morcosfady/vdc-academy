import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import fs from "node:fs";
import { emptyState, loginAs, mockSupabase, seedUser, type MockState } from "./helpers/mockSupabase";

// Admin instructor approval (AD-430), the Users table and the Overview card, against the static export and the
// in-memory Supabase mock (`?mock=1`). Seed: one admin, one student, four fictional instructors in every state
// (01 pending, 02 approved, 03 rejected, 04 approved) like the demo.

const DAY = 86400_000;
const ago = (days: number) => new Date(Date.now() - days * DAY).toISOString();

function seed() {
  const state = emptyState();
  const admin = seedUser(state, "admin@vdc.test", "Secret123!", { full_name: "Ada Admin" }, "admin", { profile: { created_at: ago(30) } });
  const mona = seedUser(state, "mona@example.com", "Secret123!", { full_name: "Mona Hassan" }, "student", { profile: { created_at: ago(20) } });
  const person = (n: number, over: Record<string, unknown>, days: number) =>
    seedUser(state, `instructor0${n}@example.com`, "Secret123!", { full_name: `Sample Instructor 0${n}` }, "instructor", {
      profile: { created_at: ago(days), phone: `+1 555 030 0${n}0${n}`, country: "USA", city: "Dallas" },
      instructor: {
        linkedin_url: `https://www.linkedin.com/in/sample-instructor-0${n}`,
        bio: `Sample bio ${n}. Years of BIM delivery on commercial projects, now teaching what works on real jobs.`,
        created_at: ago(days),
        ...over,
      },
    });
  const i1 = person(1, { job_title: "BIM Manager", employer: "Sample Company A", industry_years: "10-15", teaching_years: "2-5", subjects: ["revit-architecture", "bim-fundamentals-revit"], teaching_format: "either", availability: "evenings" }, 1);
  const i2 = person(2, { job_title: "VDC Director", employer: "Sample Company B", industry_years: "15+", teaching_years: "5+", subjects: ["navisworks-clash-detection", "4d-5d-simulation"], teaching_format: "online", availability: "weekends", verification_status: "approved", verified_by: admin, verified_at: ago(12) }, 14);
  const i3 = person(3, { job_title: "Revit Drafter", employer: "Sample Company C", industry_years: "3-5", teaching_years: "none", subjects: ["revit-mep"], teaching_format: "in_person", availability: "daytime", verification_status: "rejected", verified_by: admin, verified_at: ago(6), rejection_note: "We need a little more teaching experience first." }, 8);
  const i4 = person(4, { job_title: "MEP Coordinator", employer: "Sample Company D", industry_years: "5-10", teaching_years: "lt2", subjects: ["revit-mep", "low-voltage-bim"], teaching_format: "either", availability: "flexible", verification_status: "approved", verified_by: admin, verified_at: ago(19) }, 21);
  return { state, admin, mona, i1, i2, i3, i4 };
}

async function openAs(page: Page, state: MockState, userId: string | null, path: string) {
  await mockSupabase(page, state);
  if (userId) await loginAs(page, state, userId);
  await page.goto(`${path}${path.includes("?") ? "&" : "?"}mock=1`);
}

const serious = async (page: Page) => (await new AxeBuilder({ page }).analyze()).violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => `${v.id} (${v.nodes.length})`);

test("the list shows the four sample instructors, pending first, with their teaching profile", async ({ page }) => {
  const { state, admin, i1 } = seed();
  await openAs(page, state, admin, "admin/instructors/");
  const cards = page.getByTestId("instructor-card");
  await expect(cards).toHaveCount(4);
  await expect(page.getByRole("navigation", { name: "Admin sections" }).getByRole("link", { name: /Instructors/ })).toHaveAttribute("aria-current", "page");
  // groups: pending, approved, not approved
  await expect(cards.nth(0)).toHaveAttribute("data-status", "pending");
  await expect(cards.nth(1)).toHaveAttribute("data-status", "approved");
  await expect(cards.nth(2)).toHaveAttribute("data-status", "approved");
  await expect(cards.nth(3)).toHaveAttribute("data-status", "rejected");
  await expect(cards.nth(3)).toContainText("We need a little more teaching experience first.");

  const card = page.locator(`[data-testid="instructor-card"][data-id="${i1}"]`);
  await expect(card).toContainText("Sample Instructor 01");
  await expect(card).toContainText("BIM Manager · Sample Company A");
  await expect(card).toContainText("10 to 15 years");
  await expect(card).toContainText("2 to 5 years");
  await expect(card).toContainText("Revit Architecture, BIM Fundamentals with Revit"); // labels, not slugs
  await expect(card).not.toContainText("revit-architecture");
  await expect(card).toContainText("Either");
  await expect(card).toContainText("Weekday evenings");
  await expect(card).toContainText("linkedin.com/in/sample-instructor-01");
  await expect(card).toContainText("instructor01@example.com");
  await expect(card).toContainText("Dallas, USA");
  await expect(card.getByTestId("instructor-bio")).toContainText("Sample bio 1.");
  await expect(card.getByTestId("approve-instructor")).toBeVisible();
  await expect(card.getByTestId("reject-instructor")).toBeVisible();
});

test("approving a pending instructor stamps the decision and calls the function", async ({ page }) => {
  const { state, admin, i1 } = seed();
  await openAs(page, state, admin, "admin/instructors/");
  const card = page.locator(`[data-testid="instructor-card"][data-id="${i1}"]`);
  await card.getByTestId("approve-instructor").click();

  await expect(card).toHaveAttribute("data-status", "approved");
  await expect(card.getByTestId("verified-at")).toBeVisible();
  await expect(page.getByText(/Instructor approved on/)).toBeVisible();
  const row = state.tables.instructor_profiles.find((r) => r.id === i1)!;
  expect(row.verification_status).toBe("approved");
  expect(row.verified_by).toBe(admin);
  expect(typeof row.verified_at).toBe("string");
  expect(Date.now() - new Date(String(row.verified_at)).getTime()).toBeLessThan(60_000);
  const call = state.requests.find((r) => r.path === "/functions/v1/on-instructor-verified");
  expect(call).toBeTruthy();
  expect(call!.body).toEqual({ instructor_id: i1, status: "approved" });
});

test("rejecting an instructor needs a note", async ({ page }) => {
  const { state, admin, i1 } = seed();
  await openAs(page, state, admin, "admin/instructors/");
  const card = page.locator(`[data-testid="instructor-card"][data-id="${i1}"]`);
  await card.getByTestId("reject-instructor").click();
  await card.getByTestId("confirm-reject").click();
  await expect(card.getByTestId("rejection-note-error")).toHaveText("Write a short note for the instructor first.");
  await expect(card).toHaveAttribute("data-status", "pending");
  expect(state.requests.some((r) => r.method === "PATCH" && r.path === "/rest/v1/instructor_profiles")).toBe(false);
  expect(state.tables.instructor_profiles.find((r) => r.id === i1)!.verification_status).toBe("pending");

  // a note of spaces is not a note, and the box is capped at 1000 characters
  await card.getByTestId("rejection-note").fill("   ");
  await card.getByTestId("confirm-reject").click();
  await expect(card.getByTestId("rejection-note-error")).toBeVisible();
  await expect(card.getByTestId("rejection-note")).toHaveAttribute("maxlength", "1000");

  const note = "We could not confirm the teaching experience. Reply with a link to a recorded lesson.";
  await card.getByTestId("rejection-note").fill(note);
  await card.getByTestId("confirm-reject").click();
  await expect(card).toHaveAttribute("data-status", "rejected");
  await expect(card).toContainText("We could not confirm the teaching experience.");
  const row = state.tables.instructor_profiles.find((r) => r.id === i1)!;
  expect(row.verification_status).toBe("rejected");
  expect(row.rejection_note).toBe(note);
  expect(row.verified_by).toBe(admin);
  expect(state.requests.some((r) => r.path === "/functions/v1/on-instructor-verified" && (r.body as { status?: string })?.status === "rejected")).toBe(true);
});

test("a failed email call never blocks the decision", async ({ page }) => {
  const { state, admin, i1 } = seed();
  await openAs(page, state, admin, "admin/instructors/");
  await page.route("**/functions/v1/on-instructor-verified", (route) => route.abort());
  const card = page.locator(`[data-testid="instructor-card"][data-id="${i1}"]`);
  await card.getByTestId("approve-instructor").click();
  await expect(card).toHaveAttribute("data-status", "approved");
  expect(state.tables.instructor_profiles.find((r) => r.id === i1)!.verification_status).toBe("approved");
});

test("the status filter and the search narrow the list", async ({ page }) => {
  const { state, admin } = seed();
  await openAs(page, state, admin, "admin/instructors/");
  const cards = page.getByTestId("instructor-card");
  await expect(cards).toHaveCount(4);
  await expect(page.getByTestId("count")).toHaveText("4 rows");

  await page.locator('button[data-status="approved"]').click();
  await expect(cards).toHaveCount(2);
  await expect(cards.first()).toContainText("Sample Instructor 02");
  await expect(page.getByTestId("count")).toHaveText("2 rows");
  await page.locator('button[data-status="pending"]').click();
  await expect(cards).toHaveCount(1);
  await expect(cards.first()).toContainText("Sample Instructor 01");
  await page.locator('button[data-status="rejected"]').click();
  await expect(cards).toHaveCount(1);
  await expect(cards.first()).toContainText("Sample Instructor 03");

  await page.locator('button[data-status="all"]').click();
  await expect(cards).toHaveCount(4);
  await page.getByTestId("search").fill("instructor04@");
  await expect(cards).toHaveCount(1);
  await expect(cards.first()).toContainText("Sample Instructor 04");
  await page.getByTestId("search").fill("nobody here");
  await expect(cards).toHaveCount(0);
  await expect(page.getByText("No instructor matches.")).toBeVisible();
});

test("the overview has an Instructors to review card that links to the list", async ({ page }) => {
  const { state, admin } = seed();
  await openAs(page, state, admin, "admin/");
  await expect(page.getByTestId("stat-instructors-pending")).toHaveText("1");
  await expect(page.getByRole("link", { name: /Instructors to review/ })).toHaveAttribute("href", /\/admin\/instructors\/$/);
  await expect(page.getByTestId("stat-recruiters-pending")).toHaveText("0"); // the recruiter cards stay
});

test("the users table lists instructors, filters them and exports them", async ({ page }) => {
  const { state, admin } = seed();
  await openAs(page, state, admin, "admin/users/");
  const rows = page.getByTestId("user-row");
  await expect(rows).toHaveCount(6); // 1 admin, 1 student, 4 instructors
  await expect(rows.filter({ hasText: "Sample Instructor 02" })).toContainText("Instructor");

  await page.locator('button[data-type="instructor"]').click();
  await expect(rows).toHaveCount(4);
  await expect(rows.filter({ hasText: "Mona Hassan" })).toHaveCount(0);
  await page.locator('button[data-type="student"]').click();
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText("Mona Hassan");

  // the verification filter covers instructors too
  await page.locator('button[data-type="instructor"]').click();
  await page.getByRole("button", { name: "More filters" }).click();
  await page.getByTestId("verification").selectOption("Pending review");
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText("Sample Instructor 01");
  await page.getByTestId("verification").selectOption("Approved");
  await expect(rows).toHaveCount(2);
  await page.getByTestId("verification").selectOption("Any verification state");

  await page.getByTestId("search").fill("instructor03@");
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText("Sample Instructor 03");
  await page.getByTestId("search").fill("");
  await expect(rows).toHaveCount(4);

  const waiting = page.waitForEvent("download");
  await page.getByTestId("csv-export").click();
  const text = fs.readFileSync((await (await waiting).path())!, "utf8");
  const lines = text.split(/\r?\n/).filter(Boolean);
  expect(lines[0]).toContain("Instructor verification");
  expect(lines).toHaveLength(5);
  expect(text).toContain("Sample Instructor 01");
  expect(text).toContain("Sample Company B");
  expect(text).not.toContain("Mona Hassan");
});

test("a link from the overview or a shared URL preselects the instructor type", async ({ page }) => {
  const { state, admin } = seed();
  await openAs(page, state, admin, "admin/users/?type=instructor");
  await expect(page.getByTestId("user-row")).toHaveCount(4);
});

test("a super admin sees the instructors screen", async ({ page }) => {
  const s = seed();
  const owner = seedUser(s.state, "owner@vdc.test", "Secret123!", { full_name: "Olive Owner" }, "super_admin");
  await openAs(page, s.state, owner, "admin/instructors/");
  await expect(page.getByTestId("instructor-card")).toHaveCount(4);
  await expect(page.getByText("This area is for the academy team.")).toHaveCount(0);
});

for (const who of ["student", "instructor"] as const) {
  test(`a ${who} gets the 403 on /admin/instructors/`, async ({ page }) => {
    const s = seed();
    const id = who === "student" ? s.mona : s.i2; // an approved instructor is still not the team
    await openAs(page, s.state, id, "admin/instructors/");
    await expect(page.getByText("This area is for the academy team.")).toBeVisible();
    await expect(page.getByTestId("instructor-card")).toHaveCount(0);
    expect(s.state.requests.some((r) => r.path === "/rest/v1/instructor_profiles" && r.method === "PATCH")).toBe(false);
  });
}

for (const width of [1440, 390]) {
  test(`instructors at ${width}: axe has no serious or critical issues and nothing overflows`, async ({ page }) => {
    const { state, admin } = seed();
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
    await openAs(page, state, admin, "admin/instructors/");
    await page.getByTestId("instructor-card").first().waitFor();
    // the open rejection form is part of the screen too
    await page.getByTestId("reject-instructor").first().click();
    await page.getByTestId("confirm-reject").click();
    await expect(page.getByTestId("rejection-note-error")).toBeVisible();
    expect(await serious(page)).toEqual([]);
    const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(over, `horizontal overflow at ${width}`).toBeLessThanOrEqual(1);
  });
}

test("the instructors screen has no em dash", async ({ page }) => {
  const { state, admin } = seed();
  await openAs(page, state, admin, "admin/instructors/");
  await page.getByTestId("instructor-card").first().waitFor();
  expect(await page.locator("body").innerText()).not.toContain("—");
});
