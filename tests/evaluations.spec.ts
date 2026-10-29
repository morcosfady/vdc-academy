import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import fs from "node:fs";
import { emptyState, loginAs, mockSupabase, seedUser, type MockState } from "./helpers/mockSupabase";
import { handle, tokenFor, uuid } from "../lib/demo/engine";

// Student evaluations by recruiters (migration 0007) against the static export and the in-memory Supabase mock
// (`?mock=1`). The mock mirrors the database: students are invisible until they opt in, only verified recruiters read the
// talent list or write evaluations, new evaluations are "submitted", the team publishes or hides them, and a student can
// only read published ones through a view that has no private note.

const DAY = 86400_000;
const ago = (days: number) => new Date(Date.now() - days * DAY).toISOString();
const PRIVATE = "PRIVATE-NOTE-MARKER";
const SCORES = { modeling: 4, coordination: 3, standards: 5, communication: 4, professionalism: 5, portfolio: 4 };

type Seed = ReturnType<typeof seed>;

function seed() {
  const state = emptyState();
  const admin = seedUser(state, "admin@vdc.test", "Secret123!", { full_name: "Ada Admin" }, "admin");
  const rita = seedUser(state, "rita@build.test", "Secret123!", { full_name: "Rita Builder" }, "recruiter", {
    profile: { phone: "+1 555 020 1111" },
    recruiter: { company_name: "Build Co", verification_status: "approved", verified_by: admin, verified_at: ago(5) },
  });
  const pat = seedUser(state, "pat@pending.test", "Secret123!", { full_name: "Pat Pending" }, "recruiter", {
    recruiter: { company_name: "Pending Co", verification_status: "pending" },
  });
  const rex = seedUser(state, "rex@rejected.test", "Secret123!", { full_name: "Rex Rejected" }, "recruiter", {
    recruiter: { company_name: "Rejected Co", verification_status: "rejected", rejection_note: "We could not confirm the website." },
  });
  const student = (n: string, visible: boolean, city: string, year: number, programs: string[], skills: Record<string, string>, phone: string) => {
    const id = seedUser(state, `student${n.toLowerCase()}@example.com`, "Secret123!", { full_name: `Sample Student ${n}` }, "student", {
      profile: { phone, whatsapp: phone, city, country: "USA", graduation_year: year, talent_visible: visible, talent_consent_at: visible ? ago(3) : null, linkedin_url: visible ? `https://www.linkedin.com/in/sample-${n.toLowerCase()}` : null },
    });
    state.tables.applications.push({ id: uuid(state.nextId++), user_id: id, status: "enrolled", programs, software_skills: skills, created_at: ago(30), updated_at: ago(30), submitted_at: ago(30) });
    return id;
  };
  const ana = student("A", true, "Fort Worth", 2025, ["revit-mep"], { Revit: "Intermediate", Navisworks: "None", Dynamo: "Beginner" }, "+1 555 010 0101");
  const ben = student("B", true, "Dallas", 2024, ["navisworks-clash-detection"], { Navisworks: "Advanced", Revit: "Beginner" }, "+1 555 010 0202");
  const cara = student("C", false, "Austin", 2023, ["revit-structure"], { Revit: "Advanced" }, "+1 555 010 0303");
  return { state, admin, rita, pat, rex, ana, ben, cara };
}

let evalCount = 0;
// A row exactly as the database stores it (a trusted seed, like the SQL editor).
function evaluation(s: Seed, over: Record<string, unknown> = {}) {
  evalCount += 1;
  const row = {
    id: `eeeeeeee-0000-4000-8000-${String(evalCount).padStart(12, "0")}`,
    student_id: s.ana,
    recruiter_id: s.rita,
    application_id: null,
    context: "portfolio_review",
    scores: SCORES,
    overall: 4,
    recommendation: "yes",
    strengths: "Clean, well named families and a tidy sheet set.",
    improvements: "Show more coordination work across disciplines.",
    private_note: PRIVATE,
    show_company_name: true,
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
  s.state.tables.student_evaluations.push(row);
  return row;
}

// Another person in the same mock database. A context of its own, so the sessions never meet in localStorage.
async function asOther(page: Page, s: Seed, userId: string, path: string, viewport?: { width: number; height: number }) {
  const ctx = await page.context().browser()!.newContext(viewport ? { viewport } : {});
  const other = await ctx.newPage();
  await mockSupabase(other, s.state);
  await loginAs(other, s.state, userId);
  await other.goto(`${path}${path.includes("?") ? "&" : "?"}mock=1`);
  await other.waitForLoadState("networkidle");
  return other;
}
const done = (p: Page) => p.context().close();

async function openAs(page: Page, s: Seed, userId: string, path: string) {
  await mockSupabase(page, s.state);
  await loginAs(page, s.state, userId);
  await page.goto(`${path}${path.includes("?") ? "&" : "?"}mock=1`);
  await page.waitForLoadState("networkidle");
}

const serious = async (page: Page) => (await new AxeBuilder({ page }).analyze()).violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => `${v.id} (${v.nodes.length}): ${v.nodes.slice(0, 4).map((n) => n.target.join(" ") + " " + (n.any[0]?.message ?? "")).join(" | ")}`);
const overflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
// The elements that stick out past the right edge, for a readable failure message.
const offenders = (page: Page) =>
  page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const out: string[] = [];
    document.querySelectorAll("body *").forEach((el) => {
      const r = (el as HTMLElement).getBoundingClientRect();
      const inScroller = (() => { for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) { const o = getComputedStyle(a).overflowX; if (o === "auto" || o === "scroll") return true; } return false; })();
      if (!inScroller && r.right > vw + 2 && r.width > 0) out.push(`${el.tagName.toLowerCase()}[${(el as HTMLElement).dataset.testid ?? (el as HTMLElement).className.toString().slice(0, 50)}] right=${Math.round(r.right)}`);
    });
    return out.slice(0, 8).join("; ");
  });

// ---- the rules, straight against the engine (the same rules 0007 and supabase/tests/rls_accounts.sql prove in Postgres)

function call(state: MockState, userId: string | null, method: string, path: string, o: { query?: string; body?: unknown } = {}) {
  const headers = { authorization: userId ? `Bearer ${tokenFor(userId)}` : "Bearer anon-key" };
  return handle(state, { method, path: `/rest/v1/${path}`, search: new URLSearchParams(o.query ?? ""), headers, body: o.body ?? null, bodySize: 0 });
}
const newRow = (studentId: string, recruiterId: string, over: Record<string, unknown> = {}) => ({
  student_id: studentId,
  recruiter_id: recruiterId,
  context: "interview",
  scores: SCORES,
  overall: 4,
  recommendation: "yes",
  strengths: "Good communication.",
  improvements: "More practice.",
  private_note: PRIVATE,
  ...over,
});

test("engine: a student who did not opt in is invisible, an opted-in one shows only safe fields", async () => {
  const s = seed();
  const list = call(s.state, s.rita, "GET", "talent_cards").body as Record<string, unknown>[];
  expect(list.map((c) => c.display_name).sort()).toEqual(["Sample A.", "Sample B."]);
  for (const c of list) {
    expect(Object.keys(c).sort()).toEqual(["city", "country", "display_name", "graduation_year", "linkedin_url", "portfolio_url", "programs", "software", "student_id"]);
  }
  expect(JSON.stringify(list)).not.toMatch(/example\.com|@|\+1 555|Sample Student/);
  const a = list.find((c) => c.display_name === "Sample A.")!;
  expect(a.programs).toEqual(["revit-mep"]);
  expect(a.software).toEqual(["Dynamo", "Revit"]); // level "None" is not a skill
  // an unverified recruiter, a rejected one, a student and a visitor read nothing
  expect(call(s.state, s.pat, "GET", "talent_cards").body).toEqual([]);
  expect(call(s.state, s.rex, "GET", "talent_cards").body).toEqual([]);
  expect(call(s.state, s.ana, "GET", "talent_cards").body).toEqual([]);
  expect(call(s.state, null, "GET", "talent_cards").status).toBe(401);
  expect((call(s.state, s.admin, "GET", "talent_cards").body as unknown[]).length).toBe(2);
});

test("engine: only the student turns the opt-in on or off, and only a student account can", async () => {
  const s = seed();
  // an admin editing a student's profile keeps the stored value
  call(s.state, s.admin, "PATCH", "profiles", { query: `id=eq.${s.cara}`, body: { talent_visible: true } });
  expect(s.state.tables.profiles.find((p) => p.id === s.cara)!.talent_visible).toBe(false);
  // the recruiter cannot opt in
  const r = call(s.state, s.rita, "PATCH", "profiles", { query: `id=eq.${s.rita}`, body: { talent_visible: true } });
  expect(r.status).toBe(400);
  expect(JSON.stringify(r.body)).toContain("only student accounts");
  // the student can, and the consent time is stamped by the server; turning it off clears it and hides the card
  call(s.state, s.cara, "PATCH", "profiles", { query: `id=eq.${s.cara}`, body: { talent_visible: true, talent_consent_at: "2000-01-01T00:00:00.000Z" } });
  const p = s.state.tables.profiles.find((x) => x.id === s.cara)!;
  expect(p.talent_visible).toBe(true);
  expect(String(p.talent_consent_at)).not.toContain("2000-01-01");
  expect((call(s.state, s.rita, "GET", "talent_cards").body as unknown[]).length).toBe(3);
  call(s.state, s.cara, "PATCH", "profiles", { query: `id=eq.${s.cara}`, body: { talent_visible: false } });
  expect(p.talent_consent_at).toBeNull();
  expect((call(s.state, s.rita, "GET", "talent_cards").body as unknown[]).length).toBe(2);
});

test("engine: evaluations are submitted by verified recruiters about opted-in students, once per context", async () => {
  const s = seed();
  // a forged status and author: the database forces submitted and the caller
  const made = call(s.state, s.rita, "POST", "student_evaluations", { body: newRow(s.ana, s.pat, { context: "portfolio_review", status: "published", moderation_note: "forged" }) });
  expect(made.status).toBe(201);
  const row = (made.body as Record<string, unknown>[])[0];
  expect(row.status).toBe("submitted");
  expect(row.recruiter_id).toBe(s.rita);
  expect(row.moderation_note).toBeNull();
  // not opted in, a recruiter as the target, an unverified recruiter, a duplicate, a bad score, html, too long
  expect(JSON.stringify(call(s.state, s.rita, "POST", "student_evaluations", { body: newRow(s.cara, s.rita) }).body)).toContain("not available");
  expect(JSON.stringify(call(s.state, s.rita, "POST", "student_evaluations", { body: newRow(s.pat, s.rita) }).body)).toContain("not available");
  expect(call(s.state, s.pat, "POST", "student_evaluations", { body: newRow(s.ana, s.pat) }).status).toBe(403);
  expect(call(s.state, s.rex, "POST", "student_evaluations", { body: newRow(s.ana, s.rex) }).status).toBe(403);
  expect(call(s.state, s.rita, "POST", "student_evaluations", { body: newRow(s.ana, s.rita, { context: "portfolio_review" }) }).status).toBe(409);
  expect(call(s.state, s.rita, "POST", "student_evaluations", { body: newRow(s.ana, s.rita, { scores: { ...SCORES, modeling: 6 } }) }).status).toBe(400);
  expect(call(s.state, s.rita, "POST", "student_evaluations", { body: newRow(s.ben, s.rita, { strengths: "<script>alert(1)</script>" }) }).status).toBe(400);
  expect(call(s.state, s.rita, "POST", "student_evaluations", { body: newRow(s.ben, s.rita, { strengths: "x".repeat(1001) }) }).status).toBe(400);
  // students and visitors cannot write
  expect(call(s.state, s.ana, "POST", "student_evaluations", { body: newRow(s.ana, s.ana) }).status).toBe(403);
  expect(call(s.state, null, "POST", "student_evaluations", { body: newRow(s.ana, s.rita) }).status).toBe(401);
  expect(s.state.tables.student_evaluations.length).toBe(1);
});

test("engine: a recruiter edits a submission, never its status or ids, and a decided one is locked", async () => {
  const s = seed();
  const e = evaluation(s);
  const edit = call(s.state, s.rita, "PATCH", "student_evaluations", { query: `id=eq.${e.id}`, body: { strengths: "Updated words.", status: "published", moderation_note: "x" } });
  expect(edit.status).toBe(200);
  expect(s.state.tables.student_evaluations[0]).toMatchObject({ strengths: "Updated words.", status: "submitted", moderation_note: null });
  expect(JSON.stringify(call(s.state, s.rita, "PATCH", "student_evaluations", { query: `id=eq.${e.id}`, body: { student_id: s.ben } }).body)).toContain("never change");
  expect(JSON.stringify(call(s.state, s.rita, "PATCH", "student_evaluations", { query: `id=eq.${e.id}`, body: { recruiter_id: s.pat } }).body)).toContain("never change");
  // the team publishes: now the author's edit changes nothing
  call(s.state, s.admin, "PATCH", "student_evaluations", { query: `id=eq.${e.id}`, body: { status: "published" } });
  const locked = call(s.state, s.rita, "PATCH", "student_evaluations", { query: `id=eq.${e.id}`, body: { strengths: "Changed after publishing." } });
  expect(locked.body).toEqual([]);
  expect(s.state.tables.student_evaluations[0].strengths).toBe("Updated words.");
  // a recruiter reads only their own rows
  const other = evaluation(s, { recruiter_id: s.pat, context: "interview" });
  expect((call(s.state, s.rita, "GET", "student_evaluations").body as { id: string }[]).map((x) => x.id)).toEqual([e.id]);
  expect(call(s.state, s.pat, "GET", "student_evaluations").body).toEqual([expect.objectContaining({ id: other.id })]);
});

test("engine: the student reads only published evaluations, through a view without the private note", async () => {
  const s = seed();
  evaluation(s, { status: "submitted", context: "portfolio_review" });
  evaluation(s, { status: "hidden", moderation_note: "Too short.", context: "interview" });
  const pub = evaluation(s, { status: "published", published_at: ago(1), context: "project_review", show_company_name: false });
  evaluation(s, { status: "published", published_at: ago(1), context: "worked_together" });
  // the table is closed to the student; the view shows published rows only
  expect(call(s.state, s.ana, "GET", "student_evaluations").body).toEqual([]);
  const mine = call(s.state, s.ana, "GET", "my_evaluations").body as Record<string, unknown>[];
  expect(mine.length).toBe(2);
  expect(JSON.stringify(mine)).not.toContain(PRIVATE);
  for (const m of mine) expect(Object.keys(m).sort()).toEqual(["company_name", "context", "id", "improvements", "overall", "published_at", "recommendation", "scores", "strengths"]);
  expect(mine.find((m) => m.id === pub.id)!.company_name).toBeNull();
  expect(mine.find((m) => m.id !== pub.id)!.company_name).toBe("Build Co");
  expect(call(s.state, s.ben, "GET", "my_evaluations").body).toEqual([]);
  expect(call(s.state, s.ana, "PATCH", "student_evaluations", { query: `id=eq.${pub.id}`, body: { overall: 1 } }).body).toEqual([]);
  // views cannot be written
  expect(call(s.state, s.ana, "POST", "my_evaluations", { body: {} }).status).toBe(405);
});

test("engine: the team publishes or hides (a hide needs a note), the words stay as written, 20 a day at most", async () => {
  const s = seed();
  const e = evaluation(s);
  // a student decides nothing
  expect(call(s.state, s.ana, "PATCH", "student_evaluations", { query: `id=eq.${e.id}`, body: { status: "published" } }).body).toEqual([]);
  const hideNoNote = call(s.state, s.admin, "PATCH", "student_evaluations", { query: `id=eq.${e.id}`, body: { status: "hidden" } });
  expect(hideNoNote.status).toBe(400);
  expect(JSON.stringify(hideNoNote.body)).toContain("note is required");
  const hide = call(s.state, s.admin, "PATCH", "student_evaluations", { query: `id=eq.${e.id}`, body: { status: "hidden", moderation_note: "Please add detail.", strengths: "rewritten by an admin" } });
  expect(hide.status).toBe(200);
  const row = s.state.tables.student_evaluations[0];
  expect(row).toMatchObject({ status: "hidden", moderation_note: "Please add detail.", moderated_by: s.admin });
  expect(row.strengths).not.toBe("rewritten by an admin");
  call(s.state, s.admin, "PATCH", "student_evaluations", { query: `id=eq.${e.id}`, body: { status: "published", moderation_note: null } });
  expect(row.status).toBe("published");
  expect(row.published_at).toBeTruthy();
  // the daily cap: 20 in the last 24 hours, the 21st is refused
  s.state.tables.student_evaluations.length = 0;
  for (let i = 0; i < 20; i++) evaluation(s, { student_id: uuid(900 + i), created_at: new Date().toISOString() });
  const over = call(s.state, s.rita, "POST", "student_evaluations", { body: newRow(s.ana, s.rita) });
  expect(over.status).toBe(400);
  expect(JSON.stringify(over.body)).toContain("daily limit");
});

// ---- the screens

test("a verified recruiter sees the talent list: opted-in students only, no email or phone anywhere in the page", async ({ page }) => {
  const s = seed();
  await openAs(page, s, s.rita, "account/");
  await expect(page.getByTestId("talent-section")).toBeVisible();
  const cards = page.getByTestId("talent-card");
  await expect(cards).toHaveCount(2);
  const a = cards.filter({ hasText: "Sample A." });
  await expect(a).toContainText("Fort Worth, USA");
  await expect(a).toContainText("Revit MEP");
  await expect(a).toContainText("2025");
  await expect(a.getByText("Dynamo", { exact: true })).toBeVisible();
  await expect(a.getByText("Navisworks", { exact: true })).toHaveCount(0); // level "None"
  await expect(a.getByRole("link", { name: "LinkedIn" })).toHaveAttribute("href", "https://www.linkedin.com/in/sample-a");
  await expect(cards.filter({ hasText: "Sample C." })).toHaveCount(0);
  await expect(page.getByText("R-200", { exact: true }).first()).toBeVisible();
  const html = await page.content();
  for (const leak of ["studenta@example.com", "studentb@example.com", "studentc@example.com", "+1 555 010", "Sample Student", "avatar"]) expect(html).not.toContain(leak);
  // the page never asked for applications
  expect(s.state.requests.some((r) => r.path.includes("/applications"))).toBe(false);
  expect(await page.locator("body").innerText()).not.toContain("—");
});

test("talent filters: search by skill or program, program, year and skill, with a clear filters link", async ({ page }) => {
  const s = seed();
  await openAs(page, s, s.rita, "account/");
  const cards = page.getByTestId("talent-card");
  await expect(cards).toHaveCount(2);
  await page.getByLabel("Search by skill or program").fill("navisworks");
  await expect(cards).toHaveCount(1);
  await expect(cards.first()).toContainText("Sample B.");
  await expect(page.getByTestId("talent-count")).toHaveText("1 of 2 students");
  await page.getByRole("button", { name: "Clear filters" }).click();
  await expect(cards).toHaveCount(2);
  await page.locator('select[name="filter-program"]').selectOption("Revit MEP");
  await expect(cards).toHaveCount(1);
  await expect(cards.first()).toContainText("Sample A.");
  await page.getByRole("button", { name: "Clear filters" }).click();
  await page.locator('select[name="filter-year"]').selectOption("2024");
  await expect(cards).toHaveCount(1);
  await expect(cards.first()).toContainText("Sample B.");
  await page.getByRole("button", { name: "Clear filters" }).click();
  await page.locator('select[name="filter-skill"]').selectOption("Dynamo");
  await expect(cards).toHaveCount(1);
  await page.getByLabel("Search by skill or program").fill("zzz");
  await expect(page.getByText("No student matches those filters.")).toBeVisible();
});

test("an unverified recruiter sees the banner and no list; nothing was requested", async ({ page }) => {
  const s = seed();
  await openAs(page, s, s.pat, "account/");
  await expect(page.getByTestId("verification-banner")).toHaveAttribute("data-status", "pending");
  await expect(page.getByTestId("talent-locked")).toContainText("Talent opens as soon as the academy team has verified your company.");
  await expect(page.getByTestId("talent-card")).toHaveCount(0);
  await expect(page.getByTestId("talent-section")).toHaveCount(0);
  expect(s.state.requests.some((r) => r.path.includes("talent_cards") || r.path.includes("student_evaluations"))).toBe(false);
  // the form refuses them too
  await page.goto(`account/evaluate/?student=${s.ana}&mock=1`);
  await expect(page.getByText("Evaluations open as soon as the academy team has verified your company.")).toBeVisible();
  await expect(page.locator("form#evaluation-form")).toHaveCount(0);
  // a rejected company is told so
  const rex = await asOther(page, s, s.rex, "account/");
  await expect(rex.getByTestId("talent-locked")).toContainText("Talent is not available because your company account was not approved.");
  await expect(rex.getByTestId("talent-card")).toHaveCount(0);
  await done(rex);
});

async function fillForm(page: Page, strengths = "Clean, well named families and a tidy sheet set.") {
  await page.locator('select[name="context"]').selectOption("portfolio_review");
  for (const [key, n] of Object.entries(SCORES)) await page.locator(`label:has(input[name="score-${key}"][value="${n}"])`).click();
  await page.locator('label:has(input[name="overall"][value="4"])').click();
  await page.locator('select[name="recommendation"]').selectOption("yes");
  await page.locator('textarea[name="strengths"]').fill(strengths);
  await page.locator('textarea[name="improvements"]').fill("Show more coordination work across disciplines.");
  await page.locator('textarea[name="private_note"]').fill(PRIVATE);
}

test("a recruiter evaluates a student: errors first, then it is sent as Submitted, listed, and can be edited", async ({ page }) => {
  const s = seed();
  await openAs(page, s, s.rita, "account/");
  await page.getByTestId("talent-card").filter({ hasText: "Sample A." }).getByRole("link", { name: /Evaluate/ }).click();
  await page.waitForURL(/account\/evaluate\/\?student=/);
  await expect(page.getByTestId("evaluate-student")).toContainText("Sample A.");
  await expect(page.getByTestId("evaluate-student")).toContainText("Revit MEP");
  await expect(page.getByText("Only you and the academy team see this")).toBeVisible();

  // validation first: nothing is sent, the summary takes focus and lists what to fix
  await page.getByTestId("submit-evaluation").click();
  const summary = page.getByTestId("error-summary");
  await expect(summary).toBeVisible();
  await expect(summary).toContainText("There are 11 things to fix.");
  await expect(summary).toBeFocused();
  await expect(page.getByText("Please write at least 10 characters about their strengths.").first()).toBeVisible();
  expect(s.state.tables.student_evaluations.length).toBe(0);
  // the clickable list moves focus to the field
  await summary.getByRole("button", { name: "Please say what this evaluation is based on." }).click();
  await expect(page.locator('select[name="context"]')).toBeFocused();
  // html is refused
  await fillForm(page, "<b>Great</b> modeling work overall");
  await page.getByTestId("submit-evaluation").click();
  await expect(page.getByText("Please use plain text only, without tags.").first()).toBeVisible();
  expect(s.state.tables.student_evaluations.length).toBe(0);

  // the preview is what the student will see: the company, the scores, no private note
  await page.locator('textarea[name="strengths"]').fill("Clean, well named families and a tidy sheet set.");
  const preview = page.getByTestId("evaluation-preview");
  await expect(preview).toContainText("Build Co");
  await expect(preview).toContainText("Clean, well named families and a tidy sheet set.");
  await expect(preview).not.toContainText(PRIVATE);
  await page.getByLabel("Show my company name to the student").uncheck();
  await expect(preview).toContainText("A verified recruiter");
  await expect(preview).not.toContainText("Build Co");
  await page.getByLabel("Show my company name to the student").check();

  await page.getByTestId("submit-evaluation").click();
  await expect(page.getByTestId("evaluation-sent")).toContainText("Sent for review; the academy team publishes it before the student sees it.");
  expect(s.state.tables.student_evaluations.length).toBe(1);
  const row = s.state.tables.student_evaluations[0];
  expect(row).toMatchObject({ student_id: s.ana, recruiter_id: s.rita, status: "submitted", recommendation: "yes", overall: 4, context: "portfolio_review", show_company_name: true, private_note: PRIVATE });
  expect(row.scores).toEqual(SCORES);

  // listed under My evaluations as Submitted
  await page.goto("account/?mock=1#evaluations");
  const mine = page.getByTestId("my-evaluation");
  await expect(mine).toHaveCount(1);
  await expect(mine).toHaveAttribute("data-status", "submitted");
  await expect(mine.getByTestId("evaluation-status")).toHaveText("Submitted");
  await expect(mine).toContainText("Sample A.");
  await expect(mine).toContainText("Waiting for the academy team. You can still edit it.");
  await expect(page.getByTestId("talent-card").filter({ hasText: "Sample A." })).toContainText("1 evaluation by you");

  // edit it
  await mine.getByRole("link", { name: "Edit" }).click();
  await page.waitForURL(/context=portfolio_review/);
  await expect(page.getByTestId("editing-note")).toBeVisible();
  await expect(page.locator('textarea[name="strengths"]')).toHaveValue("Clean, well named families and a tidy sheet set.");
  await page.locator('textarea[name="strengths"]').fill("Clean families, tidy sheets and a strong standards habit.");
  await page.getByTestId("submit-evaluation").click();
  await expect(page.getByTestId("evaluation-sent")).toContainText("Your changes are saved.");
  expect(s.state.tables.student_evaluations.length).toBe(1);
  expect(s.state.tables.student_evaluations[0].strengths).toBe("Clean families, tidy sheets and a strong standards habit.");
  expect(s.state.tables.student_evaluations[0].status).toBe("submitted");

  // a second reason is a second evaluation
  await page.locator('select[name="context"]').selectOption("interview");
  await expect(page.getByTestId("editing-note")).toHaveCount(0);
  await expect(page.locator('textarea[name="strengths"]')).toHaveValue("");
});

test("the student sees nothing until the team publishes; then scores, company or A verified recruiter, never the private note", async ({ page }) => {
  const s = seed();
  evaluation(s, { context: "portfolio_review" });
  evaluation(s, { context: "interview", show_company_name: false, scores: { ...SCORES, modeling: 2 }, overall: 3, recommendation: "maybe", strengths: "Quick to learn and friendly.", improvements: "Needs more practice with naming." });
  await openAs(page, s, s.ana, "account/");
  await expect(page.getByTestId("student-evaluations")).toBeVisible();
  await expect(page.getByTestId("evaluations-empty")).toContainText("No evaluations yet.");
  await expect(page.getByTestId("evaluation-card")).toHaveCount(0);
  expect(await page.content()).not.toContain(PRIVATE);

  // the admin publishes both
  const admin = await asOther(page, s, s.admin, "admin/evaluations/?status=submitted");
  await expect(admin.getByTestId("evaluation-row")).toHaveCount(2);
  for (let i = 0; i < 2; i++) {
    await admin.getByTestId("evaluation-row").first().getByTestId("open-evaluation").click();
    await expect(admin.getByTestId("detail-private-note")).toHaveText(PRIVATE); // the team reads it
    await admin.getByTestId("publish-evaluation").click();
    await expect(admin.getByText("Published. The student can see it now.")).toBeVisible();
    await admin.keyboard.press("Escape");
    await expect(admin.getByTestId("count")).toHaveText(i === 0 ? "1 row" : "0 rows");
  }
  await done(admin);
  expect(s.state.tables.student_evaluations.map((e) => e.status)).toEqual(["published", "published"]);
  expect(s.state.tables.student_evaluations[0].published_at).toBeTruthy();

  const before = s.state.requests.length;
  await page.reload();
  await page.waitForLoadState("networkidle");
  const cards = page.getByTestId("evaluation-card");
  await expect(cards).toHaveCount(2);
  await expect(page.getByTestId("evaluation-count")).toHaveText("2");
  await expect(page.getByTestId("evaluation-average")).toContainText("3.5");
  const named = cards.filter({ hasText: "Build Co" });
  await expect(named).toHaveCount(1);
  await expect(named).toContainText("Portfolio review");
  await expect(named).toContainText("Yes");
  await expect(named).toContainText("Modeling accuracy");
  await expect(named).toContainText("Clean, well named families and a tidy sheet set.");
  const anon = cards.filter({ hasText: "A verified recruiter" });
  await expect(anon).toHaveCount(1);
  await expect(anon).not.toContainText("Build Co");
  await expect(anon).toContainText("Maybe");
  await expect(anon).toContainText("Needs more practice with naming.");
  const html = await page.content();
  expect(html).not.toContain(PRIVATE);
  for (const leak of ["rita@build.test", "+1 555 020 1111", "Rita Builder"]) expect(html).not.toContain(leak);
  // the student's screen asked only the student-safe view, never the evaluations table
  const asked = s.state.requests.slice(before).filter((r) => r.path.startsWith("/rest/v1/")).map((r) => r.path);
  expect(asked).toContain("/rest/v1/my_evaluations");
  expect(asked.some((p) => p.endsWith("/student_evaluations"))).toBe(false);
});

test("admin evaluations: table, status filter, search, sort, CSV, hide needs a note, publish; the student sees only what is published", async ({ page }) => {
  const s = seed();
  evaluation(s, { context: "portfolio_review", created_at: ago(1) });
  evaluation(s, { student_id: s.ben, context: "interview", created_at: ago(3), overall: 5, recommendation: "strong_yes" });
  evaluation(s, { student_id: s.ben, context: "project_review", status: "published", published_at: ago(1), moderated_by: s.admin, moderated_at: ago(1), created_at: ago(5) });
  evaluation(s, { student_id: s.ana, recruiter_id: s.pat, context: "worked_together", status: "hidden", moderation_note: "Too short.", created_at: ago(7) });
  await openAs(page, s, s.admin, "admin/evaluations/");
  await expect(page.getByText("AD-400", { exact: true })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Admin sections" }).getByRole("link", { name: /Evaluations/ })).toHaveAttribute("aria-current", "page");
  const rows = page.getByTestId("evaluation-row");
  await expect(rows).toHaveCount(4);
  await expect(rows.first()).toContainText("Sample Student A"); // newest first
  await page.locator('button[data-status="submitted"]').click();
  await expect(rows).toHaveCount(2);
  await page.locator('button[data-status="hidden"]').click();
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText("Pending Co");
  await page.locator('button[data-status="all"]').click();
  await page.getByTestId("search").fill("Build Co");
  await expect(rows).toHaveCount(3);
  await page.getByTestId("search").fill("Sample Student B");
  await expect(rows).toHaveCount(2);
  await page.getByRole("button", { name: "Clear filters" }).click();
  await expect(rows).toHaveCount(4);
  await page.getByRole("button", { name: "Overall" }).click();
  await expect(rows.first()).toContainText("5 / 5");

  // the CSV has scores and dates, no free text
  const [download] = await Promise.all([page.waitForEvent("download"), page.getByTestId("csv-export").click()]);
  const csv = fs.readFileSync((await download.path())!, "utf8");
  expect(csv).toContain("Student,Recruiter company");
  expect(csv).not.toContain(PRIVATE);
  expect(csv).not.toContain("Clean, well named");

  // hide: a note is required
  await page.locator('button[data-status="submitted"]').click();
  await rows.first().getByTestId("open-evaluation").click();
  const detail = page.getByTestId("evaluation-detail");
  await expect(detail).toContainText(PRIVATE);
  await expect(detail).toContainText("Internal. Never shown to the student.");
  await page.getByTestId("hide-evaluation").click();
  await page.getByTestId("confirm-hide").click();
  await expect(page.getByTestId("hide-note-error")).toHaveText("A note is required to hide an evaluation.");
  expect(s.state.tables.student_evaluations.filter((e) => e.status === "hidden").length).toBe(1);
  await page.getByTestId("hide-note").fill("Please describe the work you reviewed.");
  await page.getByTestId("confirm-hide").click();
  await expect(page.getByText("Hidden. The student cannot see it.")).toBeVisible();
  const hidden = s.state.tables.student_evaluations.find((e) => e.moderation_note === "Please describe the work you reviewed.")!;
  expect(hidden).toMatchObject({ status: "hidden", moderated_by: s.admin });
  await page.keyboard.press("Escape");

  // publish the other one
  await expect(rows).toHaveCount(1);
  await rows.first().getByTestId("open-evaluation").click();
  await page.getByTestId("publish-evaluation").click();
  await expect(page.getByText("Published. The student can see it now.")).toBeVisible();
  expect(s.state.tables.student_evaluations.filter((e) => e.status === "published").length).toBe(2);

  // the student of the hidden one still sees only the published evaluation
  const ben = await asOther(page, s, s.ben, "account/#evaluations");
  await expect(ben.getByTestId("evaluation-card")).toHaveCount(1);
  await done(ben);
  // the author reads the team's note
  const rita = await asOther(page, s, s.rita, "account/#evaluations");
  const hiddenRow = rita.getByTestId("my-evaluation").filter({ has: rita.locator('[data-testid="evaluation-status"]', { hasText: "Hidden" }) });
  await expect(hiddenRow).toContainText("Please describe the work you reviewed.");
  await done(rita);
});

test("the overview shows evaluations awaiting review and links to the queue", async ({ page }) => {
  const s = seed();
  evaluation(s, { context: "portfolio_review" });
  evaluation(s, { context: "interview" });
  evaluation(s, { context: "project_review", status: "published", published_at: ago(1) });
  await openAs(page, s, s.admin, "admin/");
  await expect(page.getByTestId("stat-evaluations-awaiting")).toHaveText("2");
  await expect(page.getByText("Evaluations awaiting review")).toBeVisible();
  await page.getByRole("link", { name: /Evaluations awaiting review/ }).click();
  await page.waitForURL(/admin\/evaluations\/\?status=submitted/);
  await expect(page.getByTestId("evaluation-row")).toHaveCount(2);
});

test("the student's switch: consent text, on and off, the talent list follows, published evaluations stay", async ({ page }) => {
  const s = seed();
  evaluation(s, { status: "published", published_at: ago(1) });
  await openAs(page, s, s.cara, "account/profile/#visibility");
  const box = page.getByTestId("talent-consent");
  await expect(box).toBeVisible();
  await expect(box).toHaveAttribute("data-visible", "off");
  await expect(box).toContainText("Only recruiters whose company the academy team has verified can see you.");
  await expect(box).toContainText("They never see your email, phone number or documents.");
  await expect(page.getByRole("switch", { name: "Let verified recruiters see my profile and evaluate my work" })).toHaveAttribute("aria-checked", "false");
  // the dashboard explains how recruiters find a student and offers the switch
  await page.goto("account/?mock=1#evaluations");
  await expect(page.getByTestId("evaluations-empty")).toHaveAttribute("data-visible", "off");
  await expect(page.getByTestId("evaluations-empty")).toContainText("Recruiters cannot find you yet.");
  await page.getByRole("link", { name: "Share my profile with recruiters" }).click();
  await page.waitForURL(/account\/profile\/#visibility/);
  await page.getByRole("switch", { name: /Let verified recruiters/ }).click();
  await expect(box).toHaveAttribute("data-visible", "on");
  await expect(page.getByText("You are now visible to verified recruiters.")).toBeVisible();
  const p = s.state.tables.profiles.find((x) => x.id === s.cara)!;
  expect(p.talent_visible).toBe(true);
  expect(p.talent_consent_at).toBeTruthy();

  // the recruiter now lists three students
  const rita = await asOther(page, s, s.rita, "account/");
  await expect(rita.getByTestId("talent-card")).toHaveCount(3);
  // the student turns it off again: gone from the list, nothing else lost
  await page.getByRole("switch", { name: /Let verified recruiters/ }).click();
  await expect(box).toHaveAttribute("data-visible", "off");
  await rita.reload();
  await rita.waitForLoadState("networkidle");
  await expect(rita.getByTestId("talent-card")).toHaveCount(2);
  await done(rita);
  expect(p.talent_visible).toBe(false);
  expect(s.state.tables.student_evaluations.length).toBe(1);

  // a student who is visible and has no evaluation yet: "No evaluations yet"
  const ben = await asOther(page, s, s.ben, "account/#evaluations");
  await expect(ben.getByTestId("evaluations-empty")).toHaveAttribute("data-visible", "on");
  await expect(ben.getByTestId("evaluations-empty")).toContainText("No evaluations yet.");
  await done(ben);
});

test("the 21st evaluation of the day shows the daily limit message", async ({ page }) => {
  const s = seed();
  for (let i = 0; i < 20; i++) evaluation(s, { student_id: uuid(800 + i), created_at: new Date().toISOString() });
  await openAs(page, s, s.rita, `account/evaluate/?student=${s.ana}`);
  await fillForm(page);
  await page.getByTestId("submit-evaluation").click();
  await expect(page.getByText("You have reached today's limit of 20 evaluations. Please come back tomorrow.")).toBeVisible();
  expect(s.state.tables.student_evaluations.length).toBe(20);
});

test("a decided evaluation opens read only for its author", async ({ page }) => {
  const s = seed();
  evaluation(s, { context: "interview", status: "published", published_at: ago(1) });
  await openAs(page, s, s.rita, `account/evaluate/?student=${s.ana}&context=interview`);
  await expect(page.getByTestId("evaluation-locked")).toContainText("The academy team published this evaluation, so it can no longer be edited.");
  await expect(page.getByTestId("evaluation-locked")).toContainText(PRIVATE); // the author may read their own note
  await expect(page.getByTestId("submit-evaluation")).toHaveCount(0);
  await expect(page.locator('textarea[name="strengths"]')).toHaveCount(0);
});

test("keyboard only: the whole evaluation form is completed and sent without a mouse", async ({ page }) => {
  const s = seed();
  await openAs(page, s, s.rita, `account/evaluate/?student=${s.ana}`);
  await page.waitForTimeout(400);
  const tabTo = async (name: string, max = 40) => {
    for (let i = 0; i < max; i++) {
      await page.keyboard.press("Tab");
      const got = await page.evaluate(() => {
        const a = document.activeElement as HTMLElement | null;
        return a?.getAttribute("name") ?? a?.getAttribute("data-testid") ?? "";
      });
      if (got === name) return;
    }
    throw new Error(`${name} is not reachable with Tab`);
  };
  await tabTo("context", 80);
  await page.keyboard.press("ArrowDown"); // Portfolio review
  await expect(page.locator('select[name="context"]')).toHaveValue("portfolio_review");
  for (const [field, n] of [...Object.entries(SCORES).map(([k, v]) => [`score-${k}`, v] as [string, number]), ["overall", 4] as [string, number]]) {
    await tabTo(field);
    for (let i = 1; i < n; i++) await page.keyboard.press("ArrowRight");
    await expect(page.locator(`input[name="${field}"][value="${n}"]`)).toBeChecked();
  }
  await tabTo("recommendation");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown"); // Yes
  await expect(page.locator('select[name="recommendation"]')).toHaveValue("yes");
  await tabTo("strengths");
  await page.keyboard.type("Clean, well named families and a tidy sheet set.");
  await tabTo("improvements");
  await page.keyboard.type("Show more coordination work across disciplines.");
  await tabTo("private_note");
  await page.keyboard.type(PRIVATE);
  await tabTo("show_company_name");
  await page.keyboard.press("Space"); // unticks it
  await expect(page.locator('input[name="show_company_name"]')).not.toBeChecked();
  await tabTo("submit-evaluation");
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("evaluation-sent")).toBeVisible();
  expect(s.state.tables.student_evaluations[0]).toMatchObject({ status: "submitted", overall: 4, recommendation: "yes", show_company_name: false });
});

test("no horizontal overflow at 360 and 390 on the new screens", async ({ page }) => {
  const s = seed();
  evaluation(s, { status: "published", published_at: ago(1), strengths: "A".repeat(180) + " " + "B".repeat(60), improvements: "Long unbroken text: " + "word ".repeat(60) });
  evaluation(s, { context: "interview", student_id: s.ben });
  for (const w of [360, 390]) {
    for (const [who, path] of [
      [s.rita, "account/"],
      [s.rita, `account/evaluate/?student=${s.ana}`],
      [s.ana, "account/"],
      [s.cara, "account/profile/"],
      [s.admin, "admin/evaluations/"],
      [s.admin, "admin/"],
    ] as const) {
      const p = await asOther(page, s, who, path, { width: w, height: 800 });
      await p.waitForTimeout(600);
      const over = await overflow(p);
      expect(over, `${path} at ${w}: ${over > 0 ? await offenders(p) : ""}`).toBeLessThanOrEqual(0);
      await done(p);
    }
  }
  // the drawer on a phone
  const p = await asOther(page, s, s.admin, "admin/evaluations/", { width: 360, height: 800 });
  await p.getByTestId("open-evaluation").first().click();
  await expect(p.getByTestId("evaluation-detail")).toBeVisible();
  expect(await overflow(p)).toBeLessThanOrEqual(0);
  await done(p);
});

test("axe: no serious or critical issues on the talent section, the form, the student card, the switch and the admin page", async ({ page }) => {
  const s = seed();
  evaluation(s, { status: "published", published_at: ago(1) });
  evaluation(s, { context: "interview", student_id: s.ben });
  const check = async (who: string, path: string, ready: string) => {
    const p = await asOther(page, s, who, path);
    await expect(p.getByTestId(ready).first()).toBeVisible();
    await p.waitForTimeout(500);
    expect(await serious(p), path).toEqual([]);
    await done(p);
  };
  await check(s.rita, "account/#talent", "talent-card");
  await check(s.rita, `account/evaluate/?student=${s.ana}`, "evaluate-student");
  await check(s.ana, "account/#evaluations", "evaluation-card");
  await check(s.cara, "account/profile/#visibility", "talent-consent");
  await check(s.admin, "admin/evaluations/", "evaluation-row");
  const drawer = await asOther(page, s, s.admin, "admin/evaluations/");
  await drawer.getByTestId("open-evaluation").first().click();
  await expect(drawer.getByTestId("evaluation-detail")).toBeVisible();
  await drawer.waitForTimeout(700); // the drawer fades in; measure contrast at rest
  expect(await serious(drawer), "drawer").toEqual([]);
  await done(drawer);
});

test("no em dashes or placeholders on the new screens", async ({ page }) => {
  const s = seed();
  evaluation(s, { status: "published", published_at: ago(1) });
  for (const [who, path] of [
    [s.rita, "account/"],
    [s.rita, `account/evaluate/?student=${s.ana}`],
    [s.ana, "account/"],
    [s.cara, "account/profile/"],
    [s.admin, "admin/evaluations/"],
  ] as const) {
    const p = await asOther(page, s, who, path);
    await p.waitForTimeout(500);
    const text = await p.locator("body").innerText();
    expect(text, path).not.toMatch(/\[[A-Z][A-Z0-9 \/]{1,40}\]/);
    expect(text, path).not.toContain("—");
    await done(p);
  }
});
