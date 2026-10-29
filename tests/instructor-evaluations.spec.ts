import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { emptyState, loginAs, mockSupabase, seedUser, type MockState } from "./helpers/mockSupabase";
import { handle, tokenFor } from "../lib/demo/engine";

// Instructors evaluate the students the academy team assigned to them (migration 0009), against the static export and
// the in-memory Supabase mock (`?mock=1`). The mock mirrors the database: an instructor reads only the students
// assigned to them (view my_students: name and program), only a verified instructor writes, new evaluations are
// "submitted", the team publishes or hides them, and a student reads published ones through a view with no private note.

const DAY = 86400_000;
const ago = (days: number) => new Date(Date.now() - days * DAY).toISOString();
const PRIVATE = "PRIVATE-INSTRUCTOR-NOTE";
const SCORES = { modeling: 4, coordination: 3, standards: 5, communication: 4, professionalism: 5, portfolio: 4 };
const FAKE_ID = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

type Seed = ReturnType<typeof seed>;

function seed() {
  const state = emptyState();
  const admin = seedUser(state, "admin@vdc.test", "Secret123!", { full_name: "Ada Admin" }, "admin");
  const teacher = (email: string, name: string, status: "pending" | "approved" | "rejected") =>
    seedUser(state, email, "Secret123!", { full_name: name }, "instructor", { instructor: { verification_status: status, verified_by: status === "pending" ? null : admin, verified_at: status === "pending" ? null : ago(5) } });
  const ines = teacher("ines@example.com", "Ines Carter", "approved");
  const omar = teacher("omar@example.com", "Omar Blake", "approved");
  const pia = teacher("pia@example.com", "Pia Pending", "pending");
  const rey = teacher("rey@example.com", "Rey Rejected", "rejected");
  const nova = teacher("nova@example.com", "Nova Newteacher", "approved");
  const student = (email: string, name: string) => seedUser(state, email, "Secret123!", { full_name: name }, "student", { profile: { phone: "+1 555 030 0101", city: "Austin", country: "USA" } });
  const sara = student("sara@example.com", "Sara Ahmed");
  const tariq = student("tariq@example.com", "Tariq Nasser");
  const lena = student("lena@example.com", "Lena Other");
  const nora = student("nora@example.com", "Nora Unassigned");
  const mia = student("mia@example.com", "Mia Quiet");
  const rita = seedUser(state, "rita@build.test", "Secret123!", { full_name: "Rita Builder" }, "recruiter", { recruiter: { company_name: "Build Co", verification_status: "approved", verified_by: admin, verified_at: ago(5) } });
  let n = 0;
  const assign = (instructor: string, studentId: string, program: string | null, daysAgo = 20) => {
    n += 1;
    state.tables.instructor_assignments.push({ id: `a5516000-0000-4000-8000-${String(n).padStart(12, "0")}`, instructor_id: instructor, student_id: studentId, program, created_by: admin, created_at: ago(daysAgo) });
  };
  assign(ines, sara, "revit-mep", 20);
  assign(ines, tariq, "navisworks-clash-detection", 10);
  assign(omar, lena, "dynamo-for-revit", 12);
  assign(pia, mia, "revit-structure", 3); // a pending instructor with an assignment: still sees nothing
  return { state, admin, ines, omar, pia, rey, nova, sara, tariq, lena, nora, mia, rita };
}

let count = 0;
// A row exactly as the database stores it (a trusted seed, like the SQL editor).
function evaluation(s: Seed, over: Record<string, unknown> = {}) {
  count += 1;
  const row = {
    id: `1e5e0000-0000-4000-8000-${String(count).padStart(12, "0")}`,
    student_id: s.sara,
    instructor_id: s.ines,
    program: "revit-mep",
    context: "end_of_course",
    scores: SCORES,
    overall: 4,
    readiness: "ready",
    strengths: "Clean, well named families and a tidy sheet set.",
    improvements: "Show more coordination work across disciplines.",
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

async function openAs(page: Page, s: Seed, userId: string, path: string) {
  await mockSupabase(page, s.state);
  await loginAs(page, s.state, userId);
  await page.goto(`${path.split("#")[0]}${path.includes("?") ? "&" : "?"}mock=1${path.includes("#") ? `#${path.split("#")[1]}` : ""}`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(400);
}

// Another person in the same mock database, in a context of their own.
async function asOther(page: Page, s: Seed, userId: string, path: string) {
  const ctx = await page.context().browser()!.newContext();
  const other = await ctx.newPage();
  await mockSupabase(other, s.state);
  await loginAs(other, s.state, userId);
  await other.goto(`${path}${path.includes("?") ? "&" : "?"}mock=1`);
  await other.waitForLoadState("networkidle");
  return other;
}

// The engine, called like PostgREST. `userId` null is a visitor with the anon key.
function call(state: MockState, userId: string | null, method: string, path: string, o: { query?: string; body?: unknown } = {}) {
  const headers = { authorization: userId ? `Bearer ${tokenFor(userId)}` : "Bearer anon-key" };
  return handle(state, { method, path: `/rest/v1/${path}`, search: new URLSearchParams(o.query ?? ""), headers, body: o.body ?? null, bodySize: 0 });
}
// A trusted write, like the SQL editor: no Authorization header and no browser session.
function trusted(state: MockState, method: string, path: string, o: { query?: string; body?: unknown } = {}) {
  const session = state.session;
  state.session = null;
  try {
    return handle(state, { method, path: `/rest/v1/${path}`, search: new URLSearchParams(o.query ?? ""), headers: {}, body: o.body ?? null, bodySize: 0 });
  } finally {
    state.session = session;
  }
}
const newRow = (studentId: string, over: Record<string, unknown> = {}) => ({
  student_id: studentId,
  context: "mid_course",
  scores: SCORES,
  overall: 4,
  readiness: "ready",
  strengths: "Good communication.",
  improvements: "More practice.",
  private_note: PRIVATE,
  ...over,
});

const serious = async (page: Page) => (await new AxeBuilder({ page }).analyze()).violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => `${v.id}: ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(" | ")}`);
const overflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

async function fillForm(page: Page, strengths = "Clean, well named families and a tidy sheet set.") {
  await page.locator('select[name="context"]').selectOption("end_of_course");
  for (const [key, n] of Object.entries(SCORES)) await page.locator(`label:has(input[name="score-${key}"][value="${n}"])`).click();
  await page.locator('label:has(input[name="overall"][value="4"])').click();
  await page.locator('select[name="readiness"]').selectOption("ready");
  await page.locator('textarea[name="strengths"]').fill(strengths);
  await page.locator('textarea[name="improvements"]').fill("Show more coordination work across disciplines.");
  await page.locator('textarea[name="private_note"]').fill(PRIVATE);
}

// ---- the rules, straight against the engine (the same rules 0009 and supabase/tests/rls_accounts.sql prove in Postgres)

test("engine: an instructor is limited to the students assigned to them, a pending one sees none", () => {
  const s = seed();
  const mine = call(s.state, s.ines, "GET", "my_students").body as Record<string, unknown>[];
  expect(mine.map((r) => r.full_name).sort()).toEqual(["Sara Ahmed", "Tariq Nasser"]);
  for (const r of mine) expect(Object.keys(r).sort()).toEqual(["assigned_at", "assignment_id", "full_name", "program", "student_id"]);
  expect(JSON.stringify(mine)).not.toMatch(/example\.com|@|\+1 555|Austin/);
  expect((call(s.state, s.omar, "GET", "my_students").body as Record<string, unknown>[]).map((r) => r.full_name)).toEqual(["Lena Other"]);
  // pending, rejected, a new instructor, a student, a visitor
  expect(call(s.state, s.pia, "GET", "my_students").body).toEqual([]);
  expect(call(s.state, s.rey, "GET", "my_students").body).toEqual([]);
  expect(call(s.state, s.nova, "GET", "my_students").body).toEqual([]);
  expect(call(s.state, s.sara, "GET", "my_students").body).toEqual([]);
  expect(call(s.state, null, "GET", "my_students").status).toBe(401);
});

test("engine: an instructor never reads profiles, other instructors' evaluations or the assignment table of others", () => {
  const s = seed();
  evaluation(s, { student_id: s.sara, instructor_id: s.ines });
  evaluation(s, { student_id: s.lena, instructor_id: s.omar, context: "mid_course", program: "dynamo-for-revit" });
  const profiles = call(s.state, s.ines, "GET", "profiles").body as { id: string }[];
  expect(profiles.map((p) => p.id)).toEqual([s.ines]);
  const evals = call(s.state, s.ines, "GET", "instructor_evaluations").body as { instructor_id: string }[];
  expect(evals).toHaveLength(1);
  expect(evals[0].instructor_id).toBe(s.ines);
  const assigns = call(s.state, s.ines, "GET", "instructor_assignments").body as { instructor_id: string }[];
  expect(assigns.every((a) => a.instructor_id === s.ines)).toBe(true);
  expect(call(s.state, s.ines, "GET", "applications").body).toEqual([]);
  expect(call(s.state, s.ines, "GET", "student_evaluations").body).toEqual([]);
  // a student has no policy on the tables at all
  expect(call(s.state, s.sara, "GET", "instructor_evaluations").body).toEqual([]);
  expect(call(s.state, s.sara, "GET", "instructor_assignments").body).toEqual([]);
  // the team reads everything
  expect(call(s.state, s.admin, "GET", "instructor_evaluations").body).toHaveLength(2);
});

test("engine: only an assigned student, only a verified instructor, one per context, a daily cap", () => {
  const s = seed();
  // a student who is not assigned: refused, nothing stored
  const notAssigned = call(s.state, s.ines, "POST", "instructor_evaluations", { body: newRow(s.nora) });
  expect(notAssigned.status).toBeGreaterThanOrEqual(400);
  expect(JSON.stringify(notAssigned.body)).toContain("not assigned");
  // another instructor's student
  expect(JSON.stringify(call(s.state, s.ines, "POST", "instructor_evaluations", { body: newRow(s.lena) }).body)).toContain("not assigned");
  expect(s.state.tables.instructor_evaluations).toHaveLength(0);
  // a pending instructor, even for their own assigned student
  expect(call(s.state, s.pia, "POST", "instructor_evaluations", { body: newRow(s.mia, { program: "revit-structure" }) }).status).toBeGreaterThanOrEqual(400);
  expect(s.state.tables.instructor_evaluations).toHaveLength(0);
  // a student, a visitor
  expect(call(s.state, s.sara, "POST", "instructor_evaluations", { body: newRow(s.sara) }).status).toBeGreaterThanOrEqual(400);
  expect(call(s.state, null, "POST", "instructor_evaluations", { body: newRow(s.sara) }).status).toBe(401);
  // the right case: stored as submitted by the caller, whatever the body says
  const ok = call(s.state, s.ines, "POST", "instructor_evaluations", { body: newRow(s.sara, { instructor_id: s.omar, status: "published", published_at: ago(0) }) });
  expect(ok.status).toBeLessThan(300);
  expect(s.state.tables.instructor_evaluations[0]).toMatchObject({ instructor_id: s.ines, status: "submitted", published_at: null });
  // one per student, instructor and context
  const dup = call(s.state, s.ines, "POST", "instructor_evaluations", { body: newRow(s.sara) });
  expect(dup.status).toBe(409);
  expect(JSON.stringify(dup.body)).toContain("duplicate");
  // a bad score, an html tag
  expect(call(s.state, s.ines, "POST", "instructor_evaluations", { body: newRow(s.sara, { context: "project_review", overall: 7 }) }).status).toBeGreaterThanOrEqual(400);
  expect(call(s.state, s.ines, "POST", "instructor_evaluations", { body: newRow(s.sara, { context: "project_review", strengths: "<b>x</b> and more words" }) }).status).toBeGreaterThanOrEqual(400);
  // the daily cap of 30
  for (let i = 0; i < 29; i++) evaluation(s, { student_id: FAKE_ID(i + 1), instructor_id: s.ines, created_at: ago(0) });
  const capped = call(s.state, s.ines, "POST", "instructor_evaluations", { body: newRow(s.sara, { context: "project_review" }) });
  expect(capped.status).toBeGreaterThanOrEqual(400);
  expect(JSON.stringify(capped.body)).toContain("daily limit");
});

test("engine: an instructor edits until the team decides; then the row is locked; the team cannot rewrite the words", () => {
  const s = seed();
  const e = evaluation(s);
  const edit = call(s.state, s.ines, "PATCH", "instructor_evaluations", { query: `id=eq.${e.id}`, body: { strengths: "Updated words about the work.", status: "published", moderation_note: "x" } });
  expect(edit.status).toBeLessThan(300);
  expect(s.state.tables.instructor_evaluations[0]).toMatchObject({ strengths: "Updated words about the work.", status: "submitted", moderation_note: null });
  // the ids never change
  expect(JSON.stringify(call(s.state, s.ines, "PATCH", "instructor_evaluations", { query: `id=eq.${e.id}`, body: { student_id: s.tariq } }).body)).toContain("never change");
  // the team hides without a note: refused; with a note and new words: the words stay
  expect(JSON.stringify(call(s.state, s.admin, "PATCH", "instructor_evaluations", { query: `id=eq.${e.id}`, body: { status: "hidden" } }).body)).toContain("note is required");
  call(s.state, s.admin, "PATCH", "instructor_evaluations", { query: `id=eq.${e.id}`, body: { status: "hidden", moderation_note: "Please add detail.", strengths: "rewritten by an admin" } });
  expect(s.state.tables.instructor_evaluations[0]).toMatchObject({ status: "hidden", moderation_note: "Please add detail.", strengths: "Updated words about the work." });
  // locked for the instructor
  const locked = call(s.state, s.ines, "PATCH", "instructor_evaluations", { query: `id=eq.${e.id}`, body: { strengths: "Changed after the decision." } });
  expect(locked.body).toEqual([]);
  expect(s.state.tables.instructor_evaluations[0].strengths).toBe("Updated words about the work.");
  // another instructor cannot touch it
  expect(call(s.state, s.omar, "PATCH", "instructor_evaluations", { query: `id=eq.${e.id}`, body: { overall: 1 } }).body).toEqual([]);
});

test("engine: a student reads only published evaluations, no private note, an instructor shown as first name and last initial", () => {
  const s = seed();
  evaluation(s, { context: "end_of_course", status: "published", published_at: ago(1) });
  evaluation(s, { context: "mid_course" }); // waiting
  evaluation(s, { context: "project_review", status: "hidden", moderation_note: "Too short." });
  evaluation(s, { student_id: s.tariq, status: "published", published_at: ago(1) }); // somebody else's
  const view = call(s.state, s.sara, "GET", "my_evaluations").body as Record<string, unknown>[];
  expect(view).toHaveLength(1);
  expect(view[0]).toMatchObject({ source: "instructor", author_name: "Ines C.", program: "revit-mep", readiness: "ready", recommendation: null, company_name: null });
  expect(JSON.stringify(view)).not.toMatch(new RegExp(`${PRIVATE}|Carter|moderation|Too short|${s.ines}`));
  expect(Object.keys(view[0])).not.toContain("private_note");
});

// ---- the screens

test("an approved instructor sees only their own students, their evaluations and the right buttons", async ({ page }) => {
  const s = seed();
  const sent = evaluation(s, { student_id: s.sara, context: "mid_course", status: "submitted" });
  evaluation(s, { student_id: s.tariq, context: "end_of_course", status: "published", published_at: ago(1), program: "navisworks-clash-detection" });
  evaluation(s, { student_id: s.tariq, context: "project_review", status: "hidden", moderation_note: "Please add detail about the clash report.", program: "navisworks-clash-detection" });
  evaluation(s, { student_id: s.lena, instructor_id: s.omar, context: "mid_course", program: "dynamo-for-revit" }); // not Ines's
  await openAs(page, s, s.ines, "account/#students");
  await expect(page.locator("#students")).toBeInViewport();
  await expect(page.getByTestId("students-count")).toHaveText("2 students");
  const cards = page.getByTestId("student-card");
  await expect(cards).toHaveCount(2);
  const sara = cards.filter({ hasText: "Sara Ahmed" });
  const tariq = cards.filter({ hasText: "Tariq Nasser" });
  await expect(sara).toContainText("Revit MEP");
  await expect(tariq).toContainText("Navisworks");
  // Sara has a submitted evaluation: edit it; Tariq's are decided: a new one
  await expect(sara.getByRole("link", { name: /Edit evaluation/ })).toHaveAttribute("href", new RegExp(`/account/evaluate-student/\\?student=${s.sara}&context=mid_course$`));
  await expect(tariq.getByRole("link", { name: /^Evaluate/ })).toHaveAttribute("href", new RegExp(`/account/evaluate-student/\\?student=${s.tariq}$`));
  await expect(tariq).toContainText("2 evaluations by you");
  // nobody else's students, no contact details
  const body = await page.locator("body").innerText();
  expect(body).not.toMatch(/Lena|Nora|Mia Quiet|example\.com|\+1 555/);

  // the evaluations they wrote, with the team's status and note
  const list = page.getByTestId("my-evaluation");
  await expect(list).toHaveCount(3);
  await expect(list.filter({ hasText: "Sara Ahmed" }).getByTestId("evaluation-status")).toHaveText("Waiting for the team");
  await expect(list.filter({ hasText: "Sara Ahmed" })).toContainText("You can still edit it.");
  const published = list.filter({ has: page.locator('[data-testid="evaluation-status"]', { hasText: "Published" }) });
  await expect(published).toHaveCount(1);
  await expect(published.getByRole("link", { name: /View/ })).toBeVisible();
  const hidden = list.filter({ has: page.locator('[data-testid="evaluation-status"]', { hasText: "Hidden" }) });
  await expect(hidden.getByTestId("team-note")).toContainText("Please add detail about the clash report.");
  await expect(list.filter({ hasText: "Sara Ahmed" }).getByRole("link", { name: /Edit/ })).toHaveAttribute("href", new RegExp(`student=${s.sara}&context=${sent.context}$`));
  expect(body).not.toContain(PRIVATE);

  // what was asked: the view and their own evaluations, never the students' profiles
  const paths = s.state.requests.map((r) => r.path);
  expect(paths.some((p) => p.startsWith("/rest/v1/my_students"))).toBe(true);
  expect(paths.some((p) => p.startsWith("/rest/v1/applications"))).toBe(false);
});

test("a pending or rejected instructor sees a note and no students; nothing was requested", async ({ page }) => {
  const s = seed();
  evaluation(s, { student_id: s.mia, instructor_id: s.pia, program: "revit-structure" });
  await openAs(page, s, s.pia, "account/");
  await expect(page.locator("#students")).toContainText("Your students");
  await expect(page.getByTestId("students-locked")).toHaveAttribute("data-status", "pending");
  await expect(page.getByTestId("students-locked")).toContainText("Students appear here after the academy team approves your profile.");
  await expect(page.getByTestId("student-card")).toHaveCount(0);
  await expect(page.getByTestId("my-evaluation")).toHaveCount(0);
  await expect(page.locator("body")).not.toContainText("Mia Quiet");
  expect(s.state.requests.some((r) => r.path.includes("my_students") || r.path.includes("instructor_evaluations") || r.path.includes("instructor_assignments"))).toBe(false);
  // the form refuses them too
  await page.goto(`account/evaluate-student/?student=${s.mia}&mock=1`);
  await expect(page.getByText("Evaluations open as soon as the academy team has approved your profile.")).toBeVisible();
  await expect(page.locator("form#evaluation-form")).toHaveCount(0);
  await expect(page.locator("body")).not.toContainText("Mia Quiet");
  expect(s.state.requests.some((r) => r.path.includes("my_students"))).toBe(false);

  const rey = await asOther(page, s, s.rey, "account/");
  await expect(rey.getByTestId("students-locked")).toHaveAttribute("data-status", "rejected");
  await expect(rey.getByTestId("students-locked")).toContainText("Students appear here once the academy team approves your profile.");
  await expect(rey.getByTestId("student-card")).toHaveCount(0);
  await rey.context().close();
});

test("an approved instructor with no assignment is told the team assigns students", async ({ page }) => {
  const s = seed();
  await openAs(page, s, s.nova, "account/");
  await expect(page.getByTestId("students-empty")).toHaveText("No students yet. The team assigns students to you.");
  await expect(page.getByTestId("student-card")).toHaveCount(0);
  await expect(page.getByTestId("cohorts")).toHaveCount(0);
});

test("an instructor evaluates a student: errors first, then it is sent for review, listed as waiting, and can be edited", async ({ page }) => {
  const s = seed();
  await openAs(page, s, s.ines, "account/");
  await page.getByTestId("student-card").filter({ hasText: "Sara Ahmed" }).getByRole("link", { name: /^Evaluate/ }).click();
  await page.waitForURL(/account\/evaluate-student\/\?student=/);
  await expect(page.getByTestId("evaluate-student")).toContainText("Sara Ahmed");
  await expect(page.getByTestId("evaluate-student")).toContainText("Revit MEP");
  await expect(page.getByTestId("evaluate-student")).not.toContainText("example.com");
  await expect(page.getByText("Only the team sees this").first()).toBeVisible();
  await expect(page.getByTestId("review-note")).toHaveText("Your evaluation goes to the academy team first. The student sees it after the team publishes it.");

  // validation first: nothing is sent, the summary takes focus and lists what to fix
  await page.getByTestId("submit-evaluation").click();
  const summary = page.getByTestId("error-summary");
  await expect(summary).toBeVisible();
  await expect(summary).toContainText("There are 11 things to fix.");
  await expect(summary).toBeFocused();
  await expect(page.getByText("Please choose how ready the student is.").first()).toBeVisible();
  expect(s.state.tables.instructor_evaluations).toHaveLength(0);
  await summary.getByRole("button", { name: "Please choose how ready the student is." }).click();
  await expect(page.locator('select[name="readiness"]')).toBeFocused();
  // html is refused
  await fillForm(page, "<b>Great</b> modeling work overall");
  await page.getByTestId("submit-evaluation").click();
  await expect(page.getByText("Please use plain text only, without tags.").first()).toBeVisible();
  expect(s.state.tables.instructor_evaluations).toHaveLength(0);

  // the preview is what the student will see: the instructor as first name and last initial, the program, the readiness
  await page.locator('textarea[name="strengths"]').fill("Clean, well named families and a tidy sheet set.");
  const preview = page.getByTestId("evaluation-preview");
  await expect(preview).toContainText("From your instructor");
  await expect(preview).toContainText("Ines C.");
  await expect(preview).toContainText("Revit MEP");
  await expect(preview).toContainText("Ready for work");
  await expect(preview).toContainText("Clean, well named families and a tidy sheet set.");
  await expect(preview).not.toContainText(PRIVATE);
  await expect(preview).not.toContainText("Carter");

  await page.getByTestId("submit-evaluation").click();
  await expect(page.getByTestId("evaluation-sent")).toContainText("Sent for review; the academy team publishes it before the student sees it.");
  expect(s.state.tables.instructor_evaluations).toHaveLength(1);
  const row = s.state.tables.instructor_evaluations[0];
  expect(row).toMatchObject({ student_id: s.sara, instructor_id: s.ines, program: "revit-mep", status: "submitted", readiness: "ready", overall: 4, context: "end_of_course", private_note: PRIVATE });
  expect(row.scores).toEqual(SCORES);

  // listed as waiting for the team, and the card now says Edit evaluation
  await page.goto("account/?mock=1#students");
  const mine = page.getByTestId("my-evaluation");
  await expect(mine).toHaveCount(1);
  await expect(mine).toHaveAttribute("data-status", "submitted");
  await expect(mine.getByTestId("evaluation-status")).toHaveText("Waiting for the team");
  await expect(page.getByTestId("student-card").filter({ hasText: "Sara Ahmed" })).toContainText("1 evaluation by you");
  await expect(page.getByTestId("student-card").filter({ hasText: "Sara Ahmed" }).getByRole("link", { name: /Edit evaluation/ })).toBeVisible();

  // edit it while it waits
  await mine.getByRole("link", { name: /Edit/ }).click();
  await page.waitForURL(/context=end_of_course/);
  await expect(page.getByTestId("editing-note")).toBeVisible();
  await expect(page.locator('textarea[name="strengths"]')).toHaveValue("Clean, well named families and a tidy sheet set.");
  await page.locator('textarea[name="strengths"]').fill("Clean families, tidy sheets and a strong standards habit.");
  await page.getByTestId("submit-evaluation").click();
  await expect(page.getByTestId("evaluation-sent")).toContainText("Your changes are saved.");
  expect(s.state.tables.instructor_evaluations).toHaveLength(1);
  expect(s.state.tables.instructor_evaluations[0]).toMatchObject({ strengths: "Clean families, tidy sheets and a strong standards habit.", status: "submitted" });

  // a second reason is a second evaluation
  await page.locator('select[name="context"]').selectOption("mid_course");
  await expect(page.getByTestId("editing-note")).toHaveCount(0);
  await expect(page.locator('textarea[name="strengths"]')).toHaveValue("");
});

test("a duplicate for the same reason is refused with a clear message", async ({ page }) => {
  const s = seed();
  await openAs(page, s, s.ines, `account/evaluate-student/?student=${s.sara}`);
  await fillForm(page);
  // the team's list changed under the form: the same reason now exists
  evaluation(s, { context: "end_of_course" });
  await page.getByTestId("submit-evaluation").click();
  await expect(page.getByText("You already evaluated this student for that reason.")).toBeVisible();
  expect(s.state.tables.instructor_evaluations).toHaveLength(1);
});

test("locked once the team decides: read-only, the team's note shown, no way to send", async ({ page }) => {
  const s = seed();
  const e = evaluation(s, { context: "end_of_course" });
  await openAs(page, s, s.ines, `account/evaluate-student/?student=${s.sara}&context=end_of_course`);
  await expect(page.getByTestId("editing-note")).toBeVisible();
  await expect(page.getByTestId("submit-evaluation")).toBeVisible();
  // the team publishes it (a trusted write, like the SQL editor)
  const res = trusted(s.state, "PATCH", "instructor_evaluations", { query: `id=eq.${e.id}`, body: { status: "published", published_at: ago(0) } });
  expect(res.status).toBeLessThan(300);
  await page.reload();
  await page.waitForLoadState("networkidle");
  await expect(page.getByTestId("evaluation-locked")).toContainText("The academy team published this evaluation, so it can no longer be edited.");
  await expect(page.getByTestId("evaluation-locked")).toContainText(PRIVATE); // the author may read their own note
  await expect(page.getByTestId("submit-evaluation")).toHaveCount(0);
  await expect(page.locator('textarea[name="strengths"]')).toHaveCount(0);
  // a direct edit changes nothing
  expect(call(s.state, s.ines, "PATCH", "instructor_evaluations", { query: `id=eq.${e.id}`, body: { strengths: "Late change to the words." } }).body).toEqual([]);
  expect(s.state.tables.instructor_evaluations[0].strengths).toBe("Clean, well named families and a tidy sheet set.");

  // hidden: the team's reason is shown
  trusted(s.state, "PATCH", "instructor_evaluations", { query: `id=eq.${e.id}`, body: { status: "hidden", moderation_note: "Please add a concrete example." } });
  await page.reload();
  await page.waitForLoadState("networkidle");
  await expect(page.getByTestId("evaluation-locked")).toContainText("did not publish this evaluation");
  await expect(page.getByTestId("evaluation-locked")).toContainText("Please add a concrete example.");
});

test("a student who is not assigned cannot be opened or evaluated from the form", async ({ page }) => {
  const s = seed();
  for (const id of [s.nora, s.lena, "not-an-id"]) {
    await page.goto("about:blank");
    await openAs(page, s, s.ines, `account/evaluate-student/?student=${id}`);
    await expect(page.getByTestId("student-missing")).toContainText("We could not find that student.");
    await expect(page.locator("form#evaluation-form")).toHaveCount(0);
  }
  await expect(page.locator("body")).not.toContainText("Nora Unassigned");
  await expect(page.locator("body")).not.toContainText("Lena Other");
  // a direct call fails with a database error and stores nothing
  const direct = call(s.state, s.ines, "POST", "instructor_evaluations", { body: newRow(s.nora) });
  expect(direct.status).toBeGreaterThanOrEqual(400);
  expect(s.state.tables.instructor_evaluations).toHaveLength(0);
  // other roles do not get the form
  const student = await asOther(page, s, s.sara, `account/evaluate-student/?student=${s.sara}`);
  await expect(student.getByText("Evaluations of students are written by approved instructors.")).toBeVisible();
  await expect(student.locator("form#evaluation-form")).toHaveCount(0);
  await student.context().close();
});

test("the student sees only the published instructor evaluation, with the instructor as first name and last initial, next to a recruiter one", async ({ page }) => {
  const s = seed();
  evaluation(s, { context: "end_of_course", status: "published", published_at: ago(1), strengths: "Reliable and clear in class.", improvements: "Link models earlier in the project." });
  evaluation(s, { context: "mid_course", strengths: "WAITING-WORDS-FOR-THE-TEAM" });
  evaluation(s, { context: "project_review", status: "hidden", moderation_note: "HIDDEN-TEAM-NOTE", strengths: "HIDDEN-WORDS" });
  evaluation(s, { student_id: s.tariq, status: "published", published_at: ago(1), strengths: "TARIQ-ONLY-WORDS" });
  s.state.tables.student_evaluations.push({
    id: "eeeeeeee-0000-4000-8000-000000000001", student_id: s.sara, recruiter_id: s.rita, application_id: null, context: "portfolio_review", scores: SCORES, overall: 3, recommendation: "yes",
    strengths: "Tidy portfolio.", improvements: "Add a coordination sample.", private_note: "RECRUITER-PRIVATE", show_company_name: true, status: "published", moderation_note: null, moderated_by: null, moderated_at: null, published_at: ago(2), notified_at: null, created_at: ago(3), updated_at: ago(3),
  });
  // Sara never opted in to the talent list (talent_visible is off): she still reads her instructor's feedback
  expect(s.state.tables.profiles.find((p) => p.id === s.sara)!.talent_visible).toBeFalsy();
  await openAs(page, s, s.sara, "account/#evaluations");
  await expect(page.getByTestId("student-evaluations")).toBeVisible();
  const cards = page.getByTestId("evaluation-card");
  await expect(cards).toHaveCount(2);
  await expect(page.getByTestId("evaluation-count")).toHaveText("2");
  const mine = page.locator('[data-testid="evaluation-card"][data-source="instructor"]');
  await expect(mine).toHaveCount(1);
  await expect(mine).toHaveAttribute("aria-label", "From your instructor Ines C.");
  await expect(mine.getByTestId("evaluation-from")).toHaveText("Ines C.");
  await expect(mine).toContainText("From your instructor");
  await expect(mine).toContainText("Revit MEP");
  await expect(mine.getByTestId("evaluation-verdict")).toHaveText("Ready for work");
  await expect(mine).toContainText("End of course");
  await expect(mine.getByTestId("score-bars").getByRole("listitem")).toHaveCount(6);
  await expect(mine).toContainText("Reliable and clear in class.");
  await expect(mine).toContainText("Link models earlier in the project.");
  // the recruiter one renders as before
  const rec = page.locator('[data-testid="evaluation-card"][data-source="recruiter"]');
  await expect(rec).toHaveCount(1);
  await expect(rec.getByTestId("evaluation-from")).toHaveText("Build Co");
  await expect(rec.getByTestId("evaluation-verdict")).toHaveText("Yes");
  // nothing else
  const html = await page.content();
  for (const bad of [PRIVATE, "RECRUITER-PRIVATE", "WAITING-WORDS-FOR-THE-TEAM", "HIDDEN-WORDS", "HIDDEN-TEAM-NOTE", "TARIQ-ONLY-WORDS", "Carter"]) expect(html).not.toContain(bad);
  // the student read the view only, never the evaluations tables
  expect(s.state.requests.some((r) => r.path.startsWith("/rest/v1/instructor_evaluations") || r.path.startsWith("/rest/v1/instructor_assignments"))).toBe(false);
});

test("a student with nothing published sees an empty card that mentions the team, not a list", async ({ page }) => {
  const s = seed();
  evaluation(s, { student_id: s.tariq, context: "mid_course" }); // waiting for the team
  await openAs(page, s, s.tariq, "account/#evaluations");
  await expect(page.getByTestId("evaluation-card")).toHaveCount(0);
  await expect(page.getByTestId("evaluations-empty")).toBeVisible();
  await expect(page.getByTestId("evaluations-empty-instructors")).toHaveText("Evaluations from your instructors appear here after the academy team publishes them.");
  await expect(page.locator("body")).not.toContainText("WAITING");
});

test("an instructor's menu has My students; recruiters and students do not", async ({ page }) => {
  const s = seed();
  await openAs(page, s, s.ines, "about/");
  await page.locator("header").first().getByRole("button", { name: "Account menu" }).click();
  await expect(page.getByRole("menuitem")).toHaveText([/Dashboard/, /My students/, /Teaching profile/, /Sign out/]);
  await page.getByRole("menuitem", { name: /My students/ }).click();
  await expect(page).toHaveURL(/\/account\/#students$/);
  await expect(page.locator("#students")).toBeInViewport();
  const rita = await asOther(page, s, s.rita, "about/");
  await rita.locator("header").first().getByRole("button", { name: "Account menu" }).click();
  await expect(rita.getByRole("menuitem", { name: /My students/ })).toHaveCount(0);
  await rita.context().close();
  const sara = await asOther(page, s, s.sara, "about/");
  await sara.locator("header").first().getByRole("button", { name: "Account menu" }).click();
  await expect(sara.getByRole("menuitem", { name: /My students/ })).toHaveCount(0);
  await sara.context().close();
});

for (const [name, size] of [["1440", { width: 1440, height: 900 }], ["390", { width: 390, height: 844 }]] as const) {
  test(`new screens at ${name}: no placeholders, em dashes, overflow or serious axe issues; 44px targets`, async ({ page }) => {
    const s = seed();
    evaluation(s, { student_id: s.sara, context: "mid_course" });
    evaluation(s, { student_id: s.tariq, context: "end_of_course", status: "published", published_at: ago(1), program: "navisworks-clash-detection" });
    evaluation(s, { student_id: s.tariq, context: "project_review", status: "hidden", moderation_note: "Please add detail about the clash report.", program: "navisworks-clash-detection" });
    await page.setViewportSize(size);
    const check = async () => {
      const text = await page.locator("body").innerText();
      expect(text).not.toMatch(/\[[A-Z][A-Z0-9 \/]{1,40}\]/);
      expect(text).not.toContain("—");
      expect(await overflow(page)).toBeLessThanOrEqual(0);
      expect(await serious(page)).toEqual([]);
    };
    // the instructor dashboard with students, the form (new, editing, locked) and the empty and pending variants
    await openAs(page, s, s.ines, "account/#students");
    await expect(page.getByTestId("student-card")).toHaveCount(2);
    await check();
    for (const link of await page.getByTestId("student-card").getByRole("link").all()) {
      const box = (await link.boundingBox())!;
      expect(box.height).toBeGreaterThanOrEqual(44);
    }
    await page.goto(`account/evaluate-student/?student=${s.tariq}&mock=1`);
    await page.waitForLoadState("networkidle");
    await expect(page.locator("form#evaluation-form")).toBeVisible();
    await check();
    await page.getByTestId("submit-evaluation").click(); // with the error summary showing
    await expect(page.getByTestId("error-summary")).toBeVisible();
    await check();
    await page.goto(`account/evaluate-student/?student=${s.sara}&context=mid_course&mock=1`);
    await page.waitForLoadState("networkidle");
    await expect(page.getByTestId("editing-note")).toBeVisible();
    await check();
    await page.goto(`account/evaluate-student/?student=${s.tariq}&context=end_of_course&mock=1`);
    await page.waitForLoadState("networkidle");
    await expect(page.getByTestId("evaluation-locked")).toBeVisible();
    await check();
    await page.goto(`account/evaluate-student/?student=${s.nora}&mock=1`);
    await page.waitForLoadState("networkidle");
    await expect(page.getByTestId("student-missing")).toBeVisible();
    await check();

    const pending = await asOther(page, s, s.pia, "account/#students");
    await pending.setViewportSize(size);
    await expect(pending.getByTestId("students-locked")).toBeVisible();
    expect(await serious(pending)).toEqual([]);
    expect(await pending.locator("body").innerText()).not.toContain("—");
    await pending.context().close();
    const none = await asOther(page, s, s.nova, "account/#students");
    await none.setViewportSize(size);
    await expect(none.getByTestId("students-empty")).toBeVisible();
    expect(await serious(none)).toEqual([]);
    await none.context().close();

    // the student's card
    const sara = await asOther(page, s, s.tariq, "account/#evaluations");
    await sara.setViewportSize(size);
    await expect(sara.getByTestId("evaluation-card")).toHaveCount(1);
    const text = await sara.locator("body").innerText();
    expect(text).not.toContain("—");
    expect(text).not.toContain(PRIVATE);
    expect(await overflow(sara)).toBeLessThanOrEqual(0);
    expect(await serious(sara)).toEqual([]);
    await sara.context().close();
  });
}
