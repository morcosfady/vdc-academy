import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import fs from "node:fs";
import { emptyState, loginAs, mockSupabase, seedUser, type MockState } from "./helpers/mockSupabase";
import { handle, tokenFor, uuid } from "../lib/demo/engine";

// Admin assignments (AD-440) and the Instructors side of the admin evaluations (AD-400), against the static export and
// the in-memory Supabase mock (`?mock=1`). Seed: one admin, three students (one has not finished onboarding), four
// fictional instructors (01 pending, 02 approved, 03 rejected, 04 approved) like the demo.

const DAY = 86400_000;
const ago = (days: number) => new Date(Date.now() - days * DAY).toISOString();
const PRIVATE = "PRIVATE-NOTE-MARKER";
const SCORES = { modeling: 4, coordination: 3, standards: 5, communication: 4, professionalism: 5, portfolio: 4 };
const DUP = "This student is already assigned to this instructor.";

type Seed = ReturnType<typeof seed>;

function seed() {
  const state = emptyState();
  const admin = seedUser(state, "admin@vdc.test", "Secret123!", { full_name: "Ada Admin" }, "admin", { profile: { created_at: ago(30) } });
  const mona = seedUser(state, "mona@example.com", "Secret123!", { full_name: "Mona Hassan" }, "student", { profile: { created_at: ago(20) } });
  const sam = seedUser(state, "sam@example.com", "Secret123!", { full_name: "Sam Student" }, "student", { profile: { created_at: ago(18) } });
  const nora = seedUser(state, "nora@example.com", "Secret123!", { full_name: "Nora Newbie" }, "student", { onboarding: false, profile: { created_at: ago(2) } });
  const person = (n: number, over: Record<string, unknown>, days: number) =>
    seedUser(state, `instructor0${n}@example.com`, "Secret123!", { full_name: `Sample Instructor 0${n}` }, "instructor", {
      profile: { created_at: ago(days) },
      instructor: { created_at: ago(days), ...over },
    });
  const i1 = person(1, {}, 1);
  const i2 = person(2, { verification_status: "approved", verified_by: admin, verified_at: ago(12) }, 14);
  const i3 = person(3, { verification_status: "rejected", verified_by: admin, verified_at: ago(6), rejection_note: "We need a little more teaching experience first." }, 8);
  const i4 = person(4, { verification_status: "approved", verified_by: admin, verified_at: ago(19) }, 21);
  // Mona studies with Sample Instructor 02
  const assignment = { id: uuid(900), instructor_id: i2, student_id: mona, program: "revit-architecture", created_by: admin, created_at: ago(5) };
  state.tables.instructor_assignments.push(assignment);
  return { state, admin, mona, sam, nora, i1, i2, i3, i4, assignment };
}

let evalCount = 0;
// A row exactly as the database stores it (a trusted seed, like the SQL editor).
function instructorEvaluation(s: Seed, over: Record<string, unknown> = {}) {
  evalCount += 1;
  const row = {
    id: `1e5e0000-0000-4000-8000-${String(evalCount).padStart(12, "0")}`,
    student_id: s.mona,
    instructor_id: s.i2,
    program: "revit-architecture",
    context: "mid_course",
    scores: SCORES,
    overall: 4,
    readiness: "almost_there",
    strengths: "Clean, well named families and a tidy sheet set.",
    improvements: "Check the level of detail before you share a model.",
    private_note: PRIVATE,
    status: "submitted",
    moderation_note: null,
    moderated_by: null,
    moderated_at: null,
    published_at: null,
    notified_at: null,
    created_at: ago(2),
    updated_at: ago(2),
    ...over,
  };
  s.state.tables.instructor_evaluations.push(row);
  return row;
}

// Three rows in the three states, plus one recruiter evaluation to prove the recruiter side is untouched.
function seedEvaluations(s: Seed) {
  const waiting = instructorEvaluation(s, { created_at: ago(1) });
  const published = instructorEvaluation(s, { student_id: s.sam, context: "end_of_course", program: null, readiness: "ready", overall: 5, status: "published", published_at: ago(3), moderated_by: s.admin, moderated_at: ago(3), notified_at: ago(3), created_at: ago(5) });
  const hidden = instructorEvaluation(s, { student_id: s.sam, instructor_id: s.i4, context: "project_review", program: "revit-mep", readiness: "needs_practice", overall: 2, status: "hidden", moderation_note: "Too short to help the student.", moderated_by: s.admin, moderated_at: ago(6), created_at: ago(7) });
  const rita = seedUser(s.state, "rita@build.test", "Secret123!", { full_name: "Rita Builder" }, "recruiter", { recruiter: { company_name: "Build Co", verification_status: "approved", verified_by: s.admin, verified_at: ago(5) } });
  const recruiterRow = {
    id: "eeeeeeee-0000-4000-8000-000000000001", student_id: s.mona, recruiter_id: rita, application_id: null, context: "portfolio_review", scores: SCORES, overall: 3, recommendation: "yes",
    strengths: "Recruiter words.", improvements: "More coordination.", private_note: "RECRUITER-PRIVATE", show_company_name: true, status: "submitted", moderation_note: null, moderated_by: null, moderated_at: null,
    published_at: null, notified_at: null, created_at: ago(4), updated_at: ago(4),
  };
  s.state.tables.student_evaluations.push(recruiterRow);
  return { waiting, published, hidden, rita, recruiterRow };
}

async function openAs(page: Page, state: MockState, userId: string | null, path: string) {
  await mockSupabase(page, state);
  if (userId) await loginAs(page, state, userId);
  await page.goto(`${path}${path.includes("?") ? "&" : "?"}mock=1`);
}

const serious = async (page: Page) => (await new AxeBuilder({ page }).analyze()).violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => `${v.id} (${v.nodes.length})`);
const group = (page: Page, id: string) => page.locator(`[data-testid="instructor-group"][data-id="${id}"]`);
const DATE = /\d{2} [A-Z][a-z]{2} \d{4}/;

// What the student's own screen asks: the view, as that student.
function studentView(state: MockState, userId: string) {
  return handle(state, { method: "GET", path: "/rest/v1/my_evaluations", search: new URLSearchParams(), headers: { authorization: `Bearer ${tokenFor(userId)}` }, body: null, bodySize: 0 }).body as Record<string, unknown>[];
}

// ---- assignments

test("the list groups students by instructor with the program and the date, and says when an instructor is not approved", async ({ page }) => {
  const s = seed();
  await openAs(page, s.state, s.admin, "admin/assignments/");
  await expect(page.getByRole("navigation", { name: "Admin sections" }).getByRole("link", { name: /Assignments/ })).toHaveAttribute("aria-current", "page");
  await expect(page.getByText("AD-440", { exact: true })).toBeVisible();
  await expect(page.getByTestId("instructor-group")).toHaveCount(4);

  const two = group(page, s.i2);
  await expect(two).toHaveAttribute("data-status", "approved");
  await expect(two).toContainText("Sample Instructor 02");
  await expect(two.getByTestId("group-count")).toHaveText("1 student");
  const row = two.getByTestId("assignment-row");
  await expect(row).toHaveCount(1);
  await expect(row).toContainText("Mona Hassan");
  await expect(row.getByTestId("assignment-program")).toHaveText("Revit Architecture"); // a label, not the slug
  await expect(row.getByTestId("assignment-date")).toHaveText(DATE);
  await expect(row.getByTestId("remove-assignment")).toBeVisible();
  await expect(row).not.toContainText("revit-architecture");

  await expect(group(page, s.i4)).toContainText("No students yet.");
  await expect(group(page, s.i1)).toHaveAttribute("data-status", "pending");
  await expect(group(page, s.i1).getByTestId("group-note")).toContainText("Approve this instructor first");
  await expect(group(page, s.i1).getByRole("link", { name: "Open the Instructors screen" })).toHaveAttribute("href", /\/admin\/instructors\/$/);
  await expect(group(page, s.i3).getByTestId("group-note")).toContainText("was not approved");
});

test("assigning a student saves the row, shows it under the instructor and removes it from the list without an instructor", async ({ page }) => {
  const s = seed();
  await openAs(page, s.state, s.admin, "admin/assignments/");
  await expect(page.getByTestId("unassigned-student")).toHaveCount(1); // Sam; Mona has an instructor, Nora has not finished
  await page.getByTestId("assign-instructor").selectOption(s.i4);
  await page.getByTestId("assign-student-search").fill("sam@");
  await page.getByTestId("assign-student").selectOption(s.sam);
  await page.getByTestId("assign-program").selectOption("revit-mep");
  await page.getByTestId("assign-save").click();

  await expect(page.getByText("Sam Student is now assigned to Sample Instructor 04.")).toBeVisible();
  const saved = s.state.tables.instructor_assignments.find((a) => a.student_id === s.sam)!;
  expect(saved).toMatchObject({ instructor_id: s.i4, student_id: s.sam, program: "revit-mep", created_by: s.admin });
  const row = group(page, s.i4).getByTestId("assignment-row");
  await expect(row).toHaveCount(1);
  await expect(row).toContainText("Sam Student");
  await expect(row.getByTestId("assignment-program")).toHaveText("Revit MEP");
  await expect(group(page, s.i4).getByTestId("group-count")).toHaveText("1 student");
  await expect(page.getByTestId("unassigned-student")).toHaveCount(0);
  await expect(page.getByText("Every student with a finished profile has an instructor.")).toBeVisible();
  // the form is ready for the next one
  await expect(page.getByTestId("assign-student")).toHaveValue("");
  await expect(page.getByTestId("assign-instructor")).toHaveValue(s.i4);
});

test("a program is optional", async ({ page }) => {
  const s = seed();
  await openAs(page, s.state, s.admin, "admin/assignments/");
  await page.getByTestId("assign-instructor").selectOption(s.i2);
  await page.getByTestId("assign-student").selectOption(s.sam);
  await page.getByTestId("assign-save").click();
  await expect(group(page, s.i2).getByTestId("assignment-row")).toHaveCount(2);
  expect(s.state.tables.instructor_assignments.find((a) => a.student_id === s.sam)!.program).toBeNull();
  await expect(group(page, s.i2).getByTestId("assignment-row").filter({ hasText: "Sam Student" }).getByTestId("assignment-program")).toHaveText("No program");
});

test("a duplicate is refused with a plain message and nothing is added", async ({ page }) => {
  const s = seed();
  await openAs(page, s.state, s.admin, "admin/assignments/");
  await page.getByTestId("assign-instructor").selectOption(s.i2);
  await page.getByTestId("assign-student").selectOption(s.mona);
  await page.getByTestId("assign-save").click();
  await expect(page.getByTestId("assign-error")).toHaveText(DUP);
  expect(s.state.tables.instructor_assignments).toHaveLength(1);
  await expect(group(page, s.i2).getByTestId("assignment-row")).toHaveCount(1);
  // another instructor for the same student is allowed
  await page.getByTestId("assign-instructor").selectOption(s.i4);
  await page.getByTestId("assign-save").click();
  await expect(page.getByTestId("assign-error")).toHaveCount(0);
  expect(s.state.tables.instructor_assignments).toHaveLength(2);
});

test("only approved instructors can be chosen, and only students with a finished profile", async ({ page }) => {
  const s = seed();
  await openAs(page, s.state, s.admin, "admin/assignments/");
  await page.getByTestId("instructor-group").first().waitFor();
  const instructors = await page.getByTestId("assign-instructor").locator("option").allTextContents();
  expect(instructors).toEqual(["Choose an approved instructor", "Sample Instructor 02", "Sample Instructor 04"]);
  const students = await page.getByTestId("assign-student").locator("option").allTextContents();
  expect(students.join("|")).toContain("Mona Hassan");
  expect(students.join("|")).toContain("Sam Student");
  expect(students.join("|")).not.toContain("Nora Newbie"); // onboarding not finished
  expect(students.join("|")).not.toContain("Ada Admin");
  expect(students.join("|")).not.toContain("Sample Instructor");
  // the search narrows the student list by name or email
  await page.getByTestId("assign-student-search").fill("mona@");
  expect(await page.getByTestId("assign-student").locator("option").allTextContents()).toEqual(["Choose a student", "Mona Hassan · mona@example.com"]);
  await page.getByTestId("assign-student-search").fill("nobody here");
  expect(await page.getByTestId("assign-student").locator("option").allTextContents()).toEqual(["No student matches that search."]);
});

test("saving without a choice says what is missing", async ({ page }) => {
  const s = seed();
  await openAs(page, s.state, s.admin, "admin/assignments/");
  await page.getByTestId("assign-save").click();
  await expect(page.getByText("Choose an instructor first.")).toBeVisible();
  await expect(page.getByText("Choose a student first.")).toBeVisible();
  expect(s.state.requests.some((r) => r.method === "POST" && r.path === "/rest/v1/instructor_assignments")).toBe(false);
});

test("removing needs a confirmation", async ({ page }) => {
  const s = seed();
  await openAs(page, s.state, s.admin, "admin/assignments/");
  const row = group(page, s.i2).getByTestId("assignment-row");
  await row.getByTestId("remove-assignment").click();
  await expect(row.getByTestId("remove-confirm")).toContainText("Remove Mona Hassan from this instructor?");
  expect(s.state.requests.some((r) => r.method === "DELETE" && r.path === "/rest/v1/instructor_assignments")).toBe(false);

  await row.getByTestId("cancel-remove").click();
  await expect(row.getByTestId("remove-confirm")).toHaveCount(0);
  await expect(row).toHaveCount(1);
  expect(s.state.tables.instructor_assignments).toHaveLength(1);

  await row.getByTestId("remove-assignment").click();
  await row.getByTestId("confirm-remove").click();
  await expect(page.getByText("Mona Hassan was removed from this instructor.")).toBeVisible();
  await expect(group(page, s.i2).getByTestId("assignment-row")).toHaveCount(0);
  await expect(group(page, s.i2)).toContainText("No students yet.");
  expect(s.state.tables.instructor_assignments).toHaveLength(0);
  // she has nobody now
  await expect(page.getByTestId("unassigned-student").filter({ hasText: "Mona Hassan" })).toHaveCount(1);
});

test("students without an instructor are listed, and Assign fills the form", async ({ page }) => {
  const s = seed();
  await openAs(page, s.state, s.admin, "admin/assignments/");
  const loose = page.getByTestId("unassigned-student");
  await expect(loose).toHaveCount(1);
  await expect(loose.first()).toContainText("Sam Student");
  await expect(loose.first()).toContainText("sam@example.com");
  await expect(page.getByTestId("unassigned-count")).toHaveText("1");
  await loose.first().getByTestId("unassigned-assign").click();
  await expect(page.getByTestId("assign-student")).toHaveValue(s.sam);
  await page.getByTestId("assign-instructor").selectOption(s.i2);
  await page.getByTestId("assign-save").click();
  await expect(page.getByTestId("unassigned-student")).toHaveCount(0);
  expect(s.state.tables.instructor_assignments.some((a) => a.student_id === s.sam && a.instructor_id === s.i2)).toBe(true);
});

test("the search narrows instructors and students", async ({ page }) => {
  const s = seed();
  await openAs(page, s.state, s.admin, "admin/assignments/");
  await page.getByTestId("search").fill("mona");
  await expect(page.getByTestId("instructor-group")).toHaveCount(1);
  await expect(page.getByTestId("instructor-group")).toContainText("Sample Instructor 02");
  await expect(page.getByTestId("unassigned-student")).toHaveCount(0);
  await page.getByTestId("search").fill("instructor 04");
  await expect(page.getByTestId("instructor-group")).toHaveCount(1);
  await page.getByTestId("search").fill("sam");
  await expect(page.getByTestId("unassigned-student")).toHaveCount(1);
  await page.getByTestId("search").fill("zzz");
  await expect(page.getByText("Nothing matches.")).toBeVisible();
});

test("a super admin sees the assignments screen", async ({ page }) => {
  const s = seed();
  const owner = seedUser(s.state, "owner@vdc.test", "Secret123!", { full_name: "Olive Owner" }, "super_admin");
  await openAs(page, s.state, owner, "admin/assignments/");
  await expect(page.getByTestId("instructor-group")).toHaveCount(4);
  await expect(page.getByText("This area is for the academy team.")).toHaveCount(0);
});

for (const who of ["student", "instructor"] as const) {
  test(`a ${who} gets the 403 on /admin/assignments/ and on the evaluations screen`, async ({ page }) => {
    const s = seed();
    const id = who === "student" ? s.mona : s.i2; // an approved instructor is still not the team
    await openAs(page, s.state, id, "admin/assignments/");
    await expect(page.getByText("This area is for the academy team.")).toBeVisible();
    await expect(page.getByTestId("instructor-group")).toHaveCount(0);
    await expect(page.getByTestId("assign-form")).toHaveCount(0);
    await page.goto("admin/evaluations/?source=instructors&mock=1");
    await expect(page.getByText("This area is for the academy team.")).toBeVisible();
    expect(s.state.requests.some((r) => r.path === "/rest/v1/instructor_assignments" && r.method !== "GET")).toBe(false);
    expect(s.state.tables.instructor_assignments).toHaveLength(1);
  });
}

test("the engine refuses what the screen never offers: an assignment written by a student or an instructor", async () => {
  const s = seed();
  const post = (userId: string, body: Record<string, unknown>) =>
    handle(s.state, { method: "POST", path: "/rest/v1/instructor_assignments", search: new URLSearchParams(), headers: { authorization: `Bearer ${tokenFor(userId)}` }, body, bodySize: 0 });
  expect(post(s.mona, { instructor_id: s.i4, student_id: s.mona }).status).toBe(403);
  expect(post(s.i2, { instructor_id: s.i2, student_id: s.sam }).status).toBe(403);
  expect(post(s.admin, { instructor_id: s.mona, student_id: s.sam }).status).toBe(400); // the first is not an instructor account
  expect(s.state.tables.instructor_assignments).toHaveLength(1);
});

// ---- evaluations, Instructors side

test("the evaluations screen has a Recruiters | Instructors switch; Instructors lists the seeded rows with their counters", async ({ page }) => {
  const s = seed();
  seedEvaluations(s);
  await openAs(page, s.state, s.admin, "admin/evaluations/");
  // recruiters first, exactly as before
  await expect(page.getByTestId("source-switch")).toBeVisible();
  await expect(page.getByTestId("evaluation-row")).toHaveCount(1);
  await expect(page.getByTestId("evaluation-row")).toContainText("Build Co");

  await page.locator('button[data-source="instructor"]').click();
  const rows = page.getByTestId("evaluation-row");
  await expect(rows).toHaveCount(3);
  await expect(rows.first()).toContainText("Mona Hassan"); // newest first
  await expect(rows.first()).toContainText("Sample Instructor 02");
  await expect(rows.first()).toContainText("Revit Architecture");
  await expect(rows.first()).toContainText("Mid course");
  await expect(rows.first()).toContainText("Almost there");
  await expect(rows.first()).toContainText("4 / 5");
  await expect(rows.first()).toContainText("Submitted");
  await expect(rows.filter({ hasText: "Needs more practice" })).toContainText("Sample Instructor 04");
  await expect(rows.filter({ hasText: "Needs more practice" })).toContainText("Hidden");
  await expect(rows.filter({ hasText: "Ready for work" })).toContainText("End of course");
  await expect(rows.filter({ hasText: "Ready for work" })).toContainText("Published");
  await expect(page.getByTestId("count-all")).toHaveText("3");
  await expect(page.getByTestId("count-submitted")).toHaveText("1");
  await expect(page.getByTestId("count-published")).toHaveText("1");
  await expect(page.getByTestId("count-hidden")).toHaveText("1");

  await page.locator('button[data-status="hidden"]').click();
  await expect(rows).toHaveCount(1);
  await page.locator('button[data-status="all"]').click();
  await page.getByTestId("search").fill("instructor 04");
  await expect(rows).toHaveCount(1);
  await page.getByTestId("search").fill("");
  await expect(rows).toHaveCount(3);

  // the detail has everything, the private note included (team only)
  await rows.first().getByTestId("open-evaluation").click();
  const detail = page.getByTestId("evaluation-detail");
  await expect(detail).toContainText("Mona Hassan · mona@example.com");
  await expect(detail).toContainText("Sample Instructor 02");
  await expect(detail.getByTestId("detail-strengths")).toHaveText("Clean, well named families and a tidy sheet set.");
  await expect(detail.getByTestId("detail-improvements")).toHaveText("Check the level of detail before you share a model.");
  await expect(detail.getByTestId("detail-private-note")).toHaveText(PRIVATE);
  await expect(detail).toContainText("Internal. Never shown to the student.");
  await page.keyboard.press("Escape");

  // the CSV has scores and dates, no free text
  const [download] = await Promise.all([page.waitForEvent("download"), page.getByTestId("csv-export").click()]);
  const csv = fs.readFileSync((await download.path())!, "utf8");
  expect(csv).toContain("Student,Instructor,Program,Based on,Readiness");
  expect(csv).toContain("Sample Instructor 02");
  expect(csv).not.toContain(PRIVATE);
  expect(csv).not.toContain("Clean, well named");

  // and back: the recruiter list is as it was
  await page.locator('button[data-source="recruiter"]').click();
  await expect(rows).toHaveCount(1);
  await expect(rows).toContainText("Build Co");
});

test("?source=instructors opens the Instructors side", async ({ page }) => {
  const s = seed();
  seedEvaluations(s);
  await openAs(page, s.state, s.admin, "admin/evaluations/?source=instructors");
  await expect(page.getByTestId("evaluation-row")).toHaveCount(3);
});

test("publish: the student sees it through my_evaluations (no private note), the email function is called with kind instructor", async ({ page }) => {
  const s = seed();
  const e = seedEvaluations(s);
  expect(studentView(s.state, s.mona)).toEqual([]); // nothing until the team publishes
  await openAs(page, s.state, s.admin, "admin/evaluations/?source=instructors&status=submitted");
  await expect(page.getByTestId("evaluation-row")).toHaveCount(1);
  await page.getByTestId("evaluation-row").first().getByTestId("open-evaluation").click();
  await page.getByTestId("publish-evaluation").click();
  await expect(page.getByText("Published. The student can see it now.")).toBeVisible();

  const row = s.state.tables.instructor_evaluations.find((r) => r.id === e.waiting.id)!;
  expect(row).toMatchObject({ status: "published", moderated_by: s.admin });
  expect(row.published_at).toBeTruthy();
  // the words stay as the instructor wrote them
  expect(row.strengths).toBe("Clean, well named families and a tidy sheet set.");
  const call = s.state.requests.find((r) => r.path === "/functions/v1/on-evaluation-published");
  expect(call).toBeTruthy();
  expect(call!.body).toEqual({ evaluation_id: e.waiting.id, kind: "instructor" });

  const seen = studentView(s.state, s.mona);
  expect(seen).toHaveLength(1);
  expect(seen[0]).toMatchObject({ id: e.waiting.id, source: "instructor", program: "revit-architecture", readiness: "almost_there", overall: 4 });
  expect(seen[0].author_name).toMatch(/^Sample \S\.$/); // first name and the initial of the last name only
  expect(JSON.stringify(seen)).not.toContain(PRIVATE);
  expect(Object.keys(seen[0])).not.toContain("private_note");
  expect(Object.keys(seen[0])).not.toContain("status");
  expect(Object.keys(seen[0])).not.toContain("instructor_id");
  // the other student's view is unchanged: only what is published for them
  expect(studentView(s.state, s.sam)).toHaveLength(1);
});

test("hide needs a note of 1000 characters at most; the student sees nothing of a hidden evaluation", async ({ page }) => {
  const s = seed();
  const e = seedEvaluations(s);
  await openAs(page, s.state, s.admin, "admin/evaluations/?source=instructors&status=submitted");
  await page.getByTestId("evaluation-row").first().getByTestId("open-evaluation").click();
  await page.getByTestId("hide-evaluation").click();
  await page.getByTestId("confirm-hide").click();
  await expect(page.getByTestId("hide-note-error")).toHaveText("A note is required to hide an evaluation.");
  expect(s.state.requests.some((r) => r.method === "PATCH" && r.path === "/rest/v1/instructor_evaluations")).toBe(false);

  await page.getByTestId("hide-note").fill("   ");
  await page.getByTestId("confirm-hide").click();
  await expect(page.getByTestId("hide-note-error")).toBeVisible();

  await page.getByTestId("hide-note").fill("x".repeat(1001));
  await page.getByTestId("confirm-hide").click();
  await expect(page.getByTestId("hide-note-error")).toHaveText("Please keep the note under 1000 characters.");
  expect(s.state.requests.some((r) => r.method === "PATCH" && r.path === "/rest/v1/instructor_evaluations")).toBe(false);

  const note = "Please describe the work you reviewed.";
  await page.getByTestId("hide-note").fill(note);
  await page.getByTestId("confirm-hide").click();
  await expect(page.getByText("Hidden. The student cannot see it.")).toBeVisible();
  const row = s.state.tables.instructor_evaluations.find((r) => r.id === e.waiting.id)!;
  expect(row).toMatchObject({ status: "hidden", moderation_note: note, moderated_by: s.admin });
  expect(row.published_at).toBeNull();
  // hiding sends no email
  expect(s.state.requests.some((r) => r.path === "/functions/v1/on-evaluation-published")).toBe(false);
  expect(studentView(s.state, s.mona)).toEqual([]);
});

test("a failed email call never blocks publishing", async ({ page }) => {
  const s = seed();
  const e = seedEvaluations(s);
  await openAs(page, s.state, s.admin, "admin/evaluations/?source=instructors&status=submitted");
  await page.route("**/functions/v1/on-evaluation-published", (route) => route.abort());
  await page.getByTestId("evaluation-row").first().getByTestId("open-evaluation").click();
  await page.getByTestId("publish-evaluation").click();
  await expect(page.getByText("Published. The student can see it now.")).toBeVisible();
  expect(s.state.tables.instructor_evaluations.find((r) => r.id === e.waiting.id)!.status).toBe("published");
  await expect(page.getByTestId("count")).toHaveText("0 rows");
});

test("the recruiter side still publishes exactly as before (no kind in the call)", async ({ page }) => {
  const s = seed();
  const e = seedEvaluations(s);
  await openAs(page, s.state, s.admin, "admin/evaluations/");
  await page.getByTestId("evaluation-row").first().getByTestId("open-evaluation").click();
  await page.getByTestId("publish-evaluation").click();
  await expect(page.getByText("Published. The student can see it now.")).toBeVisible();
  const call = s.state.requests.find((r) => r.path === "/functions/v1/on-evaluation-published");
  expect(call!.body).toEqual({ evaluation_id: e.recruiterRow.id });
  expect(s.state.tables.instructor_evaluations.every((r) => r.status !== "published" || r.id === e.published.id)).toBe(true);
});

// ---- looks

for (const width of [1440, 390]) {
  test(`assignments at ${width}: axe has no serious or critical issues and nothing overflows`, async ({ page }) => {
    const s = seed();
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
    await openAs(page, s.state, s.admin, "admin/assignments/");
    await page.getByTestId("instructor-group").first().waitFor();
    // the open states are part of the screen: a form error, a duplicate message and a confirmation
    await page.getByTestId("assign-save").click();
    await expect(page.getByText("Choose an instructor first.")).toBeVisible();
    await page.getByTestId("assign-instructor").selectOption(s.i2);
    await page.getByTestId("assign-student").selectOption(s.mona);
    await page.getByTestId("assign-save").click();
    await expect(page.getByTestId("assign-error")).toHaveText(DUP);
    await group(page, s.i2).getByTestId("remove-assignment").click();
    await expect(group(page, s.i2).getByTestId("remove-confirm")).toBeVisible();
    expect(await serious(page)).toEqual([]);
    const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(over, `horizontal overflow at ${width}`).toBeLessThanOrEqual(1);
  });

  test(`instructor evaluations at ${width}: axe has no serious or critical issues and nothing overflows`, async ({ page }) => {
    const s = seed();
    seedEvaluations(s);
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
    await openAs(page, s.state, s.admin, "admin/evaluations/?source=instructors");
    await page.getByTestId("evaluation-row").first().waitFor();
    expect(await serious(page), "list").toEqual([]);
    const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(over, `horizontal overflow at ${width}`).toBeLessThanOrEqual(1);
    await page.getByTestId("evaluation-row").first().getByTestId("open-evaluation").click();
    await page.getByTestId("hide-evaluation").click();
    await page.getByTestId("confirm-hide").click();
    await expect(page.getByTestId("hide-note-error")).toBeVisible();
    expect(await serious(page), "drawer").toEqual([]);
  });
}

test("the new screens have no em dash", async ({ page }) => {
  const s = seed();
  seedEvaluations(s);
  await openAs(page, s.state, s.admin, "admin/assignments/");
  await page.getByTestId("instructor-group").first().waitFor();
  await group(page, s.i2).getByTestId("remove-assignment").click();
  expect(await page.locator("body").innerText()).not.toContain("—");
  await page.goto("admin/evaluations/?source=instructors&mock=1");
  await page.getByTestId("evaluation-row").first().waitFor();
  await page.getByTestId("evaluation-row").first().getByTestId("open-evaluation").click();
  await page.getByTestId("hide-evaluation").click();
  expect(await page.locator("body").innerText()).not.toContain("—");
});
