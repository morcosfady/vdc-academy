import { expect, test, type Page } from "@playwright/test";
import fs from "node:fs";
import { emptyState, loginAs, mockSupabase, seedUser, type MockState } from "./helpers/mockSupabase";

// The admin area against the static export and the in-memory Supabase mock (`?mock=1`).
// Seed: one admin, two students, three applications in different statuses, two leads, one message.

const DAY = 86400_000;
const appId = (n: number) => `aaaaaaaa-0000-4000-8000-${String(n).padStart(12, "0")}`;
const fileId = (n: number) => `bbbbbbbb-0000-4000-8000-${String(n).padStart(12, "0")}`;

function application(n: number, userId: string, over: Record<string, unknown>) {
  const at = new Date(Date.now() - Number(over.daysAgo ?? 0) * DAY).toISOString();
  return {
    id: appId(n),
    user_id: userId,
    status: "submitted",
    created_at: at,
    updated_at: at,
    submitted_at: at,
    full_name: "",
    email: "",
    phone: "+1 555 000 0000",
    whatsapp: null,
    country: "USA",
    city: "Dallas",
    dob_or_age: "22 to 25",
    language: "English",
    current_status: "fresh_grad",
    degree: "Architecture",
    university: "UT Arlington",
    graduation_year: new Date().getFullYear(),
    gpa: null,
    experience_years: "None",
    job_title: null,
    company: null,
    software_skills: { Revit: "Beginner", AutoCAD: "Intermediate" },
    career_goal: "BIM Modeler",
    linkedin_url: null,
    portfolio_url: null,
    programs: ["revit-architecture"],
    format: "Online live",
    schedule: "Evenings",
    start_pref: "Next cohort",
    has_laptop: "Yes",
    source: "LinkedIn",
    discount_type: null,
    discount_percent: 0,
    discount_status: "none",
    discount_verified: false,
    proof_file_path: null,
    cv_file_path: null,
    consent_privacy: true,
    consent_contact: true,
    newsletter: false,
    notes: null,
    utm: null,
    ...over,
  };
}

function seed() {
  const state = emptyState();
  const admin = seedUser(state, "admin@vdc.test", "Secret123!", { full_name: "Ada Admin" }, "admin");
  const mona = seedUser(state, "mona@example.com", "Secret123!", { full_name: "Mona Hassan" });
  const omar = seedUser(state, "omar@example.com", "Secret123!", { full_name: "Omar Ali" });
  state.tables.applications.push(
    application(1, mona, { full_name: "Mona Hassan", email: "mona@example.com", status: "submitted", daysAgo: 1, discount_type: "freshGrad", discount_percent: 40, discount_status: "pending", proof_file_path: `${mona}/${fileId(1)}.pdf`, cv_file_path: `${mona}/${fileId(2)}.pdf` }),
    application(2, omar, { full_name: "Omar Ali", email: "omar@example.com", status: "under_review", daysAgo: 10, programs: ["bim-fundamentals-revit"], current_status: "professional" }),
    application(3, mona, { full_name: "Mona Hassan", email: "mona@example.com", status: "accepted", daysAgo: 20, programs: ["revit-mep"] }),
  );
  state.tables.leads.push(
    { id: appId(11), created_at: new Date(Date.now() - DAY).toISOString(), name: "Sara Lead", email: "sara@example.com", topic: "Price list", handled: false },
    { id: appId(12), created_at: new Date(Date.now() - 3 * DAY).toISOString(), name: "Karim Lead", email: "karim@example.com", topic: "Company training", handled: true },
  );
  state.tables.contact_messages.push({ id: appId(13), created_at: new Date().toISOString(), name: "Nour Message", email: "nour@example.com", message: "Do you run weekend cohorts?", handled: false });
  return { state, admin, mona, omar };
}

async function openAs(page: Page, state: MockState, userId: string | null, path: string) {
  await mockSupabase(page, state);
  if (userId) await loginAs(page, state, userId);
  await page.goto(`${path}${path.includes("?") ? "&" : "?"}mock=1`);
}

test("admin sees the overview counts", async ({ page }) => {
  const { state, admin } = seed();
  await openAs(page, state, admin, "admin/");
  await expect(page.getByTestId("stat-total")).toHaveText("3");
  await expect(page.getByTestId("stat-week")).toHaveText("1");
  await expect(page.getByTestId("stat-fresh")).toHaveText("33%");
  await expect(page.getByTestId("stat-pending")).toHaveText("1");
  await expect(page.locator('[data-testid="by-status"] [data-status="under_review"]')).toHaveText("1");
  await expect(page.locator('[data-testid="by-status"] [data-status="accepted"]')).toHaveText("1");
  await expect(page.getByRole("link", { name: "Leads to handle" })).toBeVisible();
});

test("the table filters by status and searches by name", async ({ page }) => {
  const { state, admin } = seed();
  await openAs(page, state, admin, "admin/applications/");
  await expect(page.getByTestId("app-row")).toHaveCount(3);

  await page.locator('button[data-status="under_review"]').click();
  await expect(page.getByTestId("app-row")).toHaveCount(1);
  await expect(page.getByTestId("app-row").first()).toContainText("Omar Ali");

  await page.locator('button[data-status="under_review"]').click();
  await expect(page.getByTestId("app-row")).toHaveCount(3);

  await page.getByTestId("search").fill("Mona");
  await expect(page.getByTestId("app-row")).toHaveCount(2);
  await expect(page.getByTestId("app-row").first()).toContainText("Mona Hassan");
  await expect(page.getByTestId("count")).toHaveText("2 rows");
});

test("the detail page shows documents, changes the status and verifies a discount", async ({ page }) => {
  const { state, admin } = seed();
  await openAs(page, state, admin, `admin/application/?id=${appId(1)}`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Mona Hassan");

  // documents through signed URLs
  // (the mock answers the sign call like an upload, so the href is checked by the request it made, not its value)
  const proof = page.getByRole("link", { name: "Open proof" });
  await expect(proof).toBeVisible();
  await expect(proof).toHaveAttribute("href", /mock\.supabase\.local\/storage\/v1/);
  await expect(page.getByRole("link", { name: "Open CV" })).toBeVisible();
  expect(state.requests.filter((r) => r.method === "POST" && r.path.startsWith("/storage/v1/object/sign/documents/")).length).toBe(2);

  // status change: PATCH, then the status_change event appears in the log
  await page.getByTestId("status-select").selectOption("Under review");
  await page.getByTestId("status-apply").click();
  await expect(page.getByTestId("activity")).toContainText("Status changed: Submitted → Under review");
  expect(state.requests.some((r) => r.method === "PATCH" && r.path === "/rest/v1/applications" && (r.body as { status?: string })?.status === "under_review")).toBe(true);
  expect(state.requests.some((r) => r.path === "/functions/v1/on-status-changed")).toBe(true);
  expect(state.tables.applications.find((a) => a.id === appId(1))?.status).toBe("under_review");

  // discount check: row updated and a student-visible note written
  await page.getByTestId("verify-discount").click();
  await expect(page.getByTestId("activity")).toContainText("Your discount proof was verified.");
  const row = state.tables.applications.find((a) => a.id === appId(1))!;
  expect(row.discount_status).toBe("verified");
  expect(row.discount_verified).toBe(true);
  const note = state.tables.application_events.find((e) => e.type === "note" && e.application_id === appId(1));
  expect(note?.visible_to_student).toBe(true);
  await expect(page.getByTestId("verify-discount")).toBeDisabled();
});

test("a student sees the 403 screen", async ({ page }) => {
  const { state, mona } = seed();
  await openAs(page, state, mona, "admin/");
  await expect(page.getByText("This area is for the academy team.")).toBeVisible();
  await expect(page.getByTestId("stat-total")).toHaveCount(0);
});

test("a logged-out visit redirects to the login page", async ({ page }) => {
  const { state } = seed();
  await openAs(page, state, null, "admin/");
  // RequireAuth sends /login/?next=...; the export has no login page yet so the router may drop the slash
  await expect(page).toHaveURL(/\/login\/?\?next=%2Fadmin%2F/);
});

test("CSV export downloads the filtered rows with a header row", async ({ page }) => {
  const { state, admin } = seed();
  await openAs(page, state, admin, "admin/applications/");
  await expect(page.getByTestId("app-row")).toHaveCount(3);
  const waiting = page.waitForEvent("download");
  await page.getByTestId("csv-export").click();
  const download = await waiting;
  expect(download.suggestedFilename()).toMatch(/^applications-\d{4}-\d{2}-\d{2}\.csv$/);
  const text = fs.readFileSync((await download.path())!, "utf8");
  const lines = text.split(/\r?\n/).filter(Boolean);
  expect(lines[0].startsWith("Name,Email,Phone")).toBe(true);
  expect(lines).toHaveLength(4);
  expect(text).toContain("Omar Ali");
});

// SHOTS=1 writes full-page captures of the four screens at 1440 and 390 into tmp-shots/ (untracked).
test("screenshots of the admin screens", async ({ page }) => {
  test.skip(!process.env.SHOTS, "set SHOTS=1 to capture");
  const { state, admin } = seed();
  fs.mkdirSync("tmp-shots", { recursive: true });
  const screens: [string, string, string][] = [
    ["overview", "admin/", '[data-testid="stat-total"]'],
    ["applications", "admin/applications/", '[data-testid="app-row"]'],
    ["detail", `admin/application/?id=${appId(1)}`, '[data-testid="documents"]'],
    ["leads", "admin/leads/", '[data-testid="inbox-row"]'],
  ];
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
    for (const [name, path, ready] of screens) {
      await openAs(page, state, admin, path);
      await page.locator(ready).first().waitFor();
      await page.waitForTimeout(400);
      await page.screenshot({ path: `tmp-shots/${name}-${width}.png`, fullPage: true });
      await page.unrouteAll({ behavior: "ignoreErrors" });
    }
  }
});

test("the inbox lists leads and marks one handled", async ({ page }) => {
  const { state, admin } = seed();
  await openAs(page, state, admin, "admin/leads/");
  await expect(page.getByTestId("inbox-row")).toHaveCount(1); // handled leads hidden by default
  await expect(page.getByTestId("inbox-row").first()).toContainText("Sara Lead");
  await page.getByTestId("mark-handled").click();
  await expect(page.getByTestId("inbox-row")).toHaveCount(0);
  expect(state.tables.leads.find((l) => l.name === "Sara Lead")?.handled).toBe(true);

  await page.getByRole("tab", { name: "Messages" }).click();
  await expect(page.getByTestId("inbox-row")).toHaveCount(1);
  await expect(page.getByTestId("inbox-row").first()).toContainText("Nour Message");
});
