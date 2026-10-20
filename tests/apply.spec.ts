import { expect, test, type Page } from "@playwright/test";
import { emptyState, loginAs, mockSupabase, seedUser, type MockState } from "./helpers/mockSupabase";

// The apply flow against the static export, with the in-memory Supabase from tests/helpers/mockSupabase.ts
// (`?mock=1`). Applications belong to an account: logged out shows the gate, logged in prefills from the profile,
// every Continue upserts a draft, submit uploads to the `documents` bucket and marks the row submitted.
// Without `mock` and without keys the page must fall back honestly.

const BASE = process.env.BASE_URL ?? "http://localhost:4173/vdc-academy/";
const year = String(new Date().getFullYear());
const PDF = Buffer.from("%PDF-1.4\n1 0 obj << /Type /Catalog >> endobj\ntrailer << /Root 1 0 R >>\n%%EOF\n");
const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/;

async function open(page: Page, query = "?mock=1") {
  await page.goto(`apply/${query}`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1500); // let the page hydrate before the first click
}

// A confirmed student whose profile already holds steps 1 and 2.
function seeded() {
  const state = emptyState();
  const id = seedUser(state, "student@example.com", "password123", { full_name: "Seeded Student", current_status: "fresh_grad" });
  Object.assign(state.tables.profiles.find((p) => p.id === id)!, { phone: "+1 555 000 1111", country: "USA", city: "Dallas", degree: "Architecture", university: "UT Arlington", graduation_year: Number(year) });
  return { state, id };
}

async function openAs(page: Page, state: MockState, id: string) {
  await mockSupabase(page, state);
  await loginAs(page, state, id);
  await open(page);
}

const appWrites = (state: MockState) => state.requests.filter((r) => r.path === "/rest/v1/applications" && (r.method === "POST" || r.method === "PATCH"));
const next = (page: Page) => page.getByRole("button", { name: "Continue" }).click();

async function fillStep1(page: Page) {
  await page.getByLabel(/Full name/).fill("Test Student");
  await page.getByLabel(/^Email/).fill("test@example.com");
  await page.getByLabel(/Phone/).fill("+1 555 123 4567");
  await page.getByLabel(/^Country/).fill("USA");
  await page.getByLabel(/^City/).fill("Dallas");
}

async function step2(page: Page, withProof = false) {
  await expect(page.getByText("Your education.")).toBeVisible();
  await page.getByLabel(/Current status/).selectOption("Fresh graduate");
  await page.getByLabel(/^Degree/).selectOption("Architecture");
  await page.getByLabel(/^University/).fill("UT Arlington");
  await page.getByLabel(/Graduation year/).selectOption(year);
  if (withProof) {
    await page.getByLabel(/Proof for your discount/).setInputFiles({ name: "degree.pdf", mimeType: "application/pdf", buffer: PDF });
    await expect(page.getByText("degree.pdf")).toBeVisible();
  }
  await next(page);
}

async function step3(page: Page) {
  await expect(page.getByText("Experience and goals.")).toBeVisible();
  await page.getByLabel(/Years of experience/).selectOption("None");
  await page.getByLabel(/Revit skill level/).selectOption("Beginner");
  await page.getByLabel(/Career goal/).selectOption("BIM Modeler");
  await next(page);
}

async function step4(page: Page) {
  await expect(page.getByText("Choose your program.")).toBeVisible();
  await page.locator('input[name="programs"]').first().check();
  await page.getByLabel(/Preferred format/).selectOption("Online live");
  await page.getByLabel(/Preferred schedule/).selectOption("Evenings");
  await page.getByLabel(/Preferred start/).selectOption("Next cohort");
  await page.getByLabel(/Laptop that can run Revit/).selectOption("Yes");
  await expect(page.getByText("Your estimate")).toBeVisible();
  await next(page);
}

async function step5(page: Page) {
  await expect(page.getByText("Review and submit.")).toBeVisible();
  await page.locator('input[name="consentPrivacy"]').check();
  await page.locator('input[name="consentContact"]').check();
}

const submit = (page: Page) => page.getByRole("button", { name: "Submit application" }).click();

// ---------------------------------------------------------------- gate

test("logged out: the gate with Sign up and Log in tabs, no form", async ({ page }) => {
  await mockSupabase(page);
  await open(page);
  await expect(page.getByRole("heading", { name: "Create an account to apply and track your status." })).toBeVisible();
  await expect(page.getByText("A-700")).toBeVisible();
  await expect(page.getByRole("tab", { name: "Sign up" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("tab", { name: "Log in" })).toBeVisible();
  await expect(page.getByText("STEP 01 / 05")).toHaveCount(0);
  await expect(page.getByLabel(/Full name/)).toBeVisible();
  await expect(page.getByLabel(/^Password/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Create account" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Sign up" })).toHaveAttribute("href", /signup\/\?next=%2Fapply%2F/);
  await expect(page.getByRole("img", { name: /study model/i })).toBeVisible();

  await page.getByRole("tab", { name: "Log in" }).click();
  await expect(page.getByRole("button", { name: "Log in" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Email me a link" })).toBeVisible();
  await expect(page.getByLabel(/Full name/)).toHaveCount(0);
  await expect(page.getByRole("link", { name: /log in/ })).toHaveAttribute("href", /login\/\?next=%2Fapply%2F/);
  expect(page.url()).toMatch(/apply\/\?mock=1$/); // tabs never leave the page
});

test("gate validation: empty sign-up and a short password", async ({ page }) => {
  await mockSupabase(page);
  await open(page);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText("Please enter your full name.")).toBeVisible();
  await expect(page.getByText("Please enter a valid email address.")).toBeVisible();
  await expect(page.getByText("Please use at least 8 characters.")).toBeVisible();
  await expect(page.getByText("Please agree to the Privacy Policy and Terms.")).toBeVisible();
  await page.getByLabel(/^Password/).fill("short");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText("Please use at least 8 characters.")).toBeVisible();
});

test("sign up from the gate: check-your-email, the guest draft survives and is restored after login", async ({ page }) => {
  const state = await mockSupabase(page);
  await page.addInitScript(() => {
    try {
      localStorage.setItem("vdc-apply-draft", JSON.stringify({ values: { fullName: "Guest Draft", email: "guest@example.com", phone: "+1 555 999 0000", country: "USA", city: "Austin" }, step: 0 }));
    } catch {}
  });
  await open(page);
  await page.getByLabel(/Full name/).fill("New Student");
  await page.getByLabel(/^Email/).fill("new@example.com");
  await page.getByLabel(/^Password/).fill("password123");
  await page.getByLabel(/Current status/).selectOption("Fresh graduate");
  await page.locator('input[name="consent"]').check();
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText("Check your email, then come back here.")).toBeVisible();
  await expect(page.getByText(/confirmation link to new@example.com/)).toBeVisible();

  // the sign-up carried the metadata the profile trigger reads, and asked to come back to /apply/
  const signup = state.requests.find((r) => r.path === "/auth/v1/signup");
  expect(signup?.method).toBe("POST");
  const b = signup!.body as { email: string; data: Record<string, unknown>; code_challenge?: string };
  expect(b.email).toBe("new@example.com");
  expect(b.data).toMatchObject({ full_name: "New Student", current_status: "fresh_grad", marketing_opt_in: false });
  const u = state.users.find((x) => x.email === "new@example.com")!;
  expect(u.confirmed).toBe(false);
  expect(state.tables.profiles.some((p) => p.id === u.id && p.full_name === "New Student")).toBe(true);
  // the guest draft is still there
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("vdc-apply-draft") ?? "null")?.values?.fullName)).toBe("Guest Draft");

  // email confirmed, then back on /apply: the gate is gone and the guest answers are in the form
  u.confirmed = true;
  await loginAs(page, state, u.id);
  await open(page);
  await expect(page.getByText("STEP 01 / 05")).toBeVisible();
  await expect(page.getByLabel(/Full name/)).toHaveValue("Guest Draft");
  await expect(page.getByLabel(/^City/)).toHaveValue("Austin");
  await expect(page.getByText("We restored your draft.")).toBeVisible();
});

test("log in from the gate with a password, and the magic link", async ({ page }) => {
  const { state, id } = seeded();
  await mockSupabase(page, state);
  await open(page);
  await page.getByRole("tab", { name: "Log in" }).click();
  await page.getByLabel(/^Email/).fill("student@example.com");
  await page.getByLabel(/^Password/).fill("wrong-password");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.getByText("That email and password do not match.")).toBeVisible();
  await page.getByLabel(/^Password/).fill("password123");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.getByText("STEP 01 / 05")).toBeVisible();
  await expect(page.getByLabel(/Full name/)).toHaveValue("Seeded Student");
  expect(state.session?.userId).toBe(id);

  // magic link from a fresh visitor
  state.session = null;
  await page.context().clearCookies();
  await page.evaluate(() => localStorage.clear());
  await open(page);
  await page.getByRole("tab", { name: "Log in" }).click();
  await page.getByLabel(/^Email/).fill("student@example.com");
  await page.getByRole("button", { name: "Email me a link" }).click();
  await expect(page.getByText(/Check your email for a link to log in/)).toBeVisible();
  const otp = state.requests.find((r) => r.path === "/auth/v1/otp");
  expect(otp?.method).toBe("POST");
  expect((otp!.body as { email: string }).email).toBe("student@example.com");
});

// ---------------------------------------------------------------- logged in

test("a confirmed user sees steps 1 and 2 prefilled from the profile", async ({ page }) => {
  const { state, id } = seeded();
  await openAs(page, state, id);
  await expect(page.getByText("STEP 01 / 05")).toBeVisible();
  await expect(page.getByLabel(/Full name/)).toHaveValue("Seeded Student");
  await expect(page.getByLabel(/^Email/)).toHaveValue("student@example.com");
  await expect(page.getByLabel(/Phone/)).toHaveValue("+1 555 000 1111");
  await expect(page.getByLabel(/^Country/)).toHaveValue("USA");
  await expect(page.getByLabel(/^City/)).toHaveValue("Dallas");
  await next(page);
  await expect(page.getByText("Your education.")).toBeVisible();
  await expect(page.getByLabel(/Current status/)).toHaveValue("Fresh graduate");
  await expect(page.getByLabel(/^Degree/)).toHaveValue("Architecture");
  await expect(page.getByLabel(/^University/)).toHaveValue("UT Arlington");
  await expect(page.getByLabel(/Graduation year/)).toHaveValue(year);
  await expect(page.getByText(/qualify for the fresh graduate discount/)).toBeVisible();
});

test("Continue writes a draft, the profile is updated, and a reload resumes at the saved step", async ({ page }) => {
  const { state, id } = seeded();
  await openAs(page, state, id);
  await page.getByLabel(/^City/).fill("Fort Worth");
  await next(page);
  await expect(page.getByText("Your education.")).toBeVisible();
  await expect(page.getByText("Draft saved")).toBeVisible();

  const w = appWrites(state);
  expect(w.length).toBeGreaterThanOrEqual(1);
  expect(w[0].method).toBe("POST");
  expect(w[0].body).toMatchObject({ status: "draft", full_name: "Seeded Student", city: "Fort Worth" });
  const drafts = state.tables.applications.filter((a) => a.user_id === id);
  expect(drafts).toHaveLength(1);
  expect(drafts[0].status).toBe("draft");
  expect(drafts[0].submitted_at).toBeNull();
  // the profile took the new city, and never a role. The profile sync runs after "Draft saved" (not awaited by the
  // form on purpose), so wait for it instead of reading the row at once: this was the source of the flake.
  const profile = state.tables.profiles.find((p) => p.id === id)!;
  await expect.poll(() => profile.city, { timeout: 5000 }).toBe("Fort Worth");
  expect(profile.role).toBe("student");
  await expect.poll(() => state.requests.some((r) => r.path === "/rest/v1/profiles" && r.method === "POST"), { timeout: 5000 }).toBe(true);
  const profileWrite = state.requests.find((r) => r.path === "/rest/v1/profiles" && r.method === "POST");
  expect(Object.keys((profileWrite?.body ?? {}) as object)).not.toContain("role");

  // second Continue updates the same row instead of creating another
  await page.getByLabel(/Graduation year/).selectOption(year);
  await next(page);
  await expect(page.getByText("Experience and goals.")).toBeVisible();
  expect(state.tables.applications.filter((a) => a.user_id === id)).toHaveLength(1);
  expect(appWrites(state).at(-1)?.method).toBe("PATCH");
  // the local draft remembers step 3 before we reload (written right after the save resolves)
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("vdc-apply-draft") ?? "{}").step), { timeout: 5000 }).toBe(2);

  await page.reload();
  await page.waitForLoadState("networkidle");
  await expect(page.getByText("STEP 03 / 05")).toBeVisible();
  await expect(page.getByText("Experience and goals.")).toBeVisible();
  await expect(page.getByText("We restored your draft.")).toBeVisible();
  // the row's id was reused
  await page.getByLabel(/Years of experience/).selectOption("None");
  await page.getByLabel(/Career goal/).selectOption("BIM Modeler");
  await next(page);
  await expect(page.getByText("Choose your program.")).toBeVisible();
  expect(state.tables.applications.filter((a) => a.user_id === id)).toHaveLength(1);
});

test("Save and finish later writes the draft and goes to the dashboard", async ({ page }) => {
  const { state, id } = seeded();
  await openAs(page, state, id);
  await page.getByRole("button", { name: "Save and finish later" }).click();
  await page.waitForURL(/account\/?(\?.*)?$/);
  const drafts = state.tables.applications.filter((a) => a.user_id === id);
  expect(drafts).toHaveLength(1);
  expect(drafts[0].status).toBe("draft");
});

test("the dashboard's Continue application resumes the latest server draft on another device", async ({ page }) => {
  const { state, id } = seeded();
  // a draft saved elsewhere: up to the experience step
  state.tables.applications.push({ id: "00000000-0000-4000-8000-00000000aaaa", user_id: id, status: "draft", created_at: "2026-10-01T00:00:00Z", updated_at: "2026-10-02T00:00:00Z", submitted_at: null, full_name: "Seeded Student", email: "student@example.com", phone: "+1 555 000 1111", country: "USA", city: "Dallas", degree: "Architecture", university: "UT Arlington", graduation_year: Number(year), current_status: "Fresh graduate", experience_years: "1 to 3 years", career_goal: "VDC Engineer", job_title: "Drafter", programs: [], discount_type: null });
  await openAs(page, state, id);
  await expect(page.getByText("STEP 04 / 05")).toBeVisible();
  await expect(page.getByText("Choose your program.")).toBeVisible();
  await page.getByRole("button", { name: "Back" }).click();
  await expect(page.getByLabel(/Years of experience/)).toHaveValue("1 to 3 years");
  await expect(page.getByLabel(/Current job title/)).toHaveValue("Drafter");
});

test("happy path: prefilled step 1, proof upload, submit, success with the dashboard button", async ({ page }) => {
  const { state, id } = seeded();
  await openAs(page, state, id);
  await next(page);
  await step2(page, true);
  await step3(page);
  await step4(page);
  await step5(page);
  await expect(page.getByText("Seeded Student")).toBeVisible();
  await expect(page.getByText("degree.pdf")).toBeVisible();
  await expect(page.getByText(/Discount: 40%/)).toBeVisible();
  await submit(page);

  await page.waitForURL(/apply\/success\/?$/);
  await expect(page.getByRole("heading", { name: /Thank you, Seeded/ })).toBeVisible();
  await expect(page.getByText("What happens next")).toBeVisible();
  for (const t of ["We review", "Advisor call", "Enroll and pay", "Start learning"]) await expect(page.getByRole("heading", { name: t })).toBeVisible();
  await expect(page.locator("ol p.mono", { hasText: /^01$/ })).toBeVisible();
  await expect(page.getByText("Your discount is pending verification")).toBeVisible();
  await expect(page.getByRole("link", { name: "Go to your dashboard" })).toHaveAttribute("href", /\/account\/$/);

  // one upload into the user's folder of the documents bucket
  const upload = state.requests.find((r) => r.path.startsWith("/storage/v1/object/documents/"));
  expect(upload?.method).toMatch(/^(POST|PUT)$/);
  expect(upload?.path).toMatch(new RegExp(`^/storage/v1/object/documents/${id}/${UUID.source}\\.pdf$`));
  // the draft became the submitted row: one row, everything on it
  const rows = state.tables.applications.filter((a) => a.user_id === id);
  expect(rows).toHaveLength(1);
  const row = rows[0];
  expect(row.status).toBe("submitted");
  expect(row.submitted_at).toBeTruthy();
  expect(row.full_name).toBe("Seeded Student");
  expect(row.email).toBe("student@example.com");
  expect(row.graduation_year).toBe(Number(year));
  expect(row.discount_type).toBe("freshGrad");
  expect(row.discount_percent).toBe(40);
  expect(row.discount_status).toBe("pending");
  expect(row.proof_file_path).toMatch(new RegExp(`^${id}/${UUID.source}\\.pdf$`));
  expect(row.cv_file_path).toBeNull();
  expect(row.consent_privacy).toBe(true);
  expect(row.consent_contact).toBe(true);
  expect((row.programs as string[]).length).toBe(1);
  expect(row.utm).toEqual({ source: null, medium: null, campaign: null });
  expect(row).not.toHaveProperty("utm_source");
  // the email function was called with the row id, the newsletter box was left unchecked
  const fn = state.requests.find((r) => r.path === "/functions/v1/on-application-submitted");
  expect(fn?.method).toBe("POST");
  expect((fn!.body as { application_id: string }).application_id).toBe(row.id);
  expect(state.requests.some((r) => r.path === "/rest/v1/newsletter_subscribers")).toBe(false);
  // the local draft is gone
  expect(await page.evaluate(() => localStorage.getItem("vdc-apply-draft"))).toBeNull();
});

test("upload: a 6 MB file is rejected with a visible message", async ({ page }) => {
  const { state, id } = seeded();
  await openAs(page, state, id);
  await next(page);
  await expect(page.getByText("Your education.")).toBeVisible();
  await page.getByLabel(/Proof for your discount/).setInputFiles({ name: "big.pdf", mimeType: "application/pdf", buffer: Buffer.alloc(6 * 1024 * 1024, 0x20) });
  await expect(page.getByRole("alert").filter({ hasText: "larger than 5 MB" })).toBeVisible();
  await expect(page.getByText("big.pdf")).toHaveCount(0);
  expect(state.requests.some((r) => r.path.startsWith("/storage/"))).toBe(false);
});

test("upload: an .exe is rejected with a visible message", async ({ page }) => {
  const { state, id } = seeded();
  await openAs(page, state, id);
  await next(page);
  await expect(page.getByText("Your education.")).toBeVisible();
  await page.getByLabel(/Proof for your discount/).setInputFiles({ name: "setup.exe", mimeType: "application/x-msdownload", buffer: Buffer.from("MZ") });
  await expect(page.getByRole("alert").filter({ hasText: "file type is not allowed" })).toBeVisible();
  await expect(page.getByText("setup.exe")).toHaveCount(0);
  // a valid file right after clears the error
  await page.getByLabel(/Proof for your discount/).setInputFiles({ name: "id.png", mimeType: "image/png", buffer: Buffer.from("PNG") });
  await expect(page.getByText("id.png")).toBeVisible();
  await expect(page.getByRole("alert").filter({ hasText: "file type is not allowed" })).toHaveCount(0);
});

test("duplicate guard: a submitted application for the same program blocks a second one", async ({ page }) => {
  const { state, id } = seeded();
  await openAs(page, state, id);
  await next(page);
  await step2(page);
  await step3(page);
  await expect(page.getByText("Choose your program.")).toBeVisible();
  const slug = (await page.locator('input[name="programs"]').first().getAttribute("value"))!;
  state.tables.applications.push({ id: "00000000-0000-4000-8000-00000000bbbb", user_id: id, status: "submitted", programs: [slug], created_at: "2026-09-01T00:00:00Z", updated_at: "2026-09-01T00:00:00Z", submitted_at: "2026-09-01T00:00:00Z" });
  await page.locator('input[name="programs"]').first().check();
  await page.getByLabel(/Preferred format/).selectOption("Online live");
  await page.getByLabel(/Preferred schedule/).selectOption("Evenings");
  await page.getByLabel(/Preferred start/).selectOption("Next cohort");
  await page.getByLabel(/Laptop that can run Revit/).selectOption("Yes");
  await next(page);
  await expect(page.getByRole("alert").filter({ hasText: "You already applied for this program." })).toBeVisible();
  await expect(page.getByRole("link", { name: "View your application" })).toHaveAttribute("href", /\/account\/application\/\?id=00000000-0000-4000-8000-00000000bbbb$/);
  await expect(page.getByText("Choose your program.")).toBeVisible(); // did not advance
  expect(state.tables.applications.filter((a) => a.user_id === id && a.status !== "draft")).toHaveLength(1);
  // choosing another program clears it
  await page.locator('input[name="programs"]').first().uncheck();
  await page.locator('input[name="programs"]').nth(1).check();
  await expect(page.getByText("You already applied for this program.")).toHaveCount(0);
  await next(page);
  await expect(page.getByText("Review and submit.")).toBeVisible();
});

test("honeypot filled: nothing is sent on submit", async ({ page }) => {
  const { state, id } = seeded();
  await openAs(page, state, id);
  await next(page);
  await step2(page);
  await step3(page);
  await step4(page);
  await step5(page);
  await page.locator('input[name="website"]').evaluate((el) => {
    (el as HTMLInputElement).value = "http://spam.example";
  });
  const before = state.requests.length;
  await submit(page);
  await page.waitForURL(/apply\/success\/?$/);
  await page.waitForTimeout(500);
  const after = state.requests.slice(before).filter((r) => !r.path.startsWith("/auth/"));
  expect(after).toEqual([]);
  expect(state.tables.applications.filter((a) => a.user_id === id && a.status === "submitted")).toHaveLength(0);
});

test("rate limit: after a failed save, a second submit within 10 s is refused without a request", async ({ page }) => {
  const { state, id } = seeded();
  await openAs(page, state, id);
  await next(page);
  await step2(page);
  await step3(page);
  await step4(page);
  await step5(page);
  // the database refuses the write (later routes win, so this shadows the mock for these two methods)
  await page.route("**/mock.supabase.local/rest/v1/applications**", async (route) => {
    if (route.request().method() === "PATCH" || route.request().method() === "POST") return route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ message: "boom" }) });
    return route.fallback();
  });
  await submit(page);
  await expect(page.getByRole("alert").filter({ hasText: "We could not save your application." })).toBeVisible();
  const before = state.requests.length;
  await submit(page);
  await expect(page.getByRole("alert").filter({ hasText: "Please wait a few seconds before trying again." })).toBeVisible();
  await page.waitForTimeout(300);
  expect(state.requests.slice(before).filter((r) => r.path.startsWith("/rest/") || r.path.startsWith("/storage/"))).toEqual([]);
  expect(page.url()).toMatch(/apply\/\?mock=1$/);
});

// ---------------------------------------------------------------- no backend

test("fallback without mock and keys: Applications open soon with the lead form, nothing saved", async ({ page }) => {
  const hits: string[] = [];
  await page.route("**/mock.supabase.local/**", (route) => {
    hits.push(route.request().url());
    return route.fulfill({ status: 500 });
  });
  await open(page, "");
  await expect(page.getByRole("heading", { name: "Applications open soon." })).toBeVisible();
  await expect(page.getByText("Leave your email and we will notify you.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Notify me" })).toBeVisible();
  await expect(page.getByText("STEP 01 / 05")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Create an account to apply and track your status." })).toHaveCount(0);
  // the lead form is honest too: nothing is saved, so it never says "thank you"
  await page.getByLabel(/^Name/).fill("Test Student");
  await page.getByLabel(/^Email/).fill("test@example.com");
  await page.getByRole("button", { name: "Notify me" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Applications open soon" }).first()).toBeVisible();
  await expect(page.getByText("Thank you. We will be in touch soon.")).toHaveCount(0);
  expect(hits).toEqual([]);
});

test("?preview=1 without keys: the full form, validation, fresh grad detection, honest fallback at submit", async ({ page }) => {
  await open(page, "?preview=1");
  await expect(page.getByText("STEP 01 / 05")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Applications open soon." })).toHaveCount(0);
  await next(page);
  await expect(page.getByText("Please enter your full name.")).toBeVisible();
  await expect(page.getByText("Please enter a valid email address.")).toBeVisible();
  await expect(page.getByText("Please enter your phone number with country code.")).toBeVisible();
  await expect(page.getByText("Please enter your country.")).toBeVisible();
  await expect(page.getByText("Please enter your city.")).toBeVisible();
  await expect(page.getByText("STEP 01 / 05")).toBeVisible(); // did not advance
  await fillStep1(page);
  await next(page);
  await expect(page.getByText("Your education.")).toBeVisible();
  const banner = page.getByText(/qualify for the fresh graduate discount/);
  await page.getByLabel(/Graduation year/).selectOption(String(Number(year) - 6));
  await expect(banner).toHaveCount(0);
  await page.getByLabel(/Graduation year/).selectOption(year);
  await expect(banner).toBeVisible();
  await expect(banner).toContainText("40%");
  await page.getByLabel(/Current status/).selectOption("Current student");
  await expect(banner).toHaveCount(0);
  await page.getByLabel(/Current status/).selectOption("Fresh graduate");
  await page.getByLabel(/^Degree/).selectOption("Architecture");
  await page.getByLabel(/^University/).fill("UT Arlington");
  await next(page);
  await step3(page);
  await step4(page);
  await step5(page);
  await submit(page);
  await expect(page.getByRole("heading", { name: "Applications open soon." })).toBeVisible();
  await expect(page.getByText("was not sent")).toBeVisible();
  await page.getByRole("button", { name: "Back to your answers" }).click();
  await expect(page.getByText("Review and submit.")).toBeVisible();
  await expect(page.getByText("Test Student")).toBeVisible();
  expect(page.url()).toMatch(/apply\/\?preview=1$/);
});

test("?preview=1 with the backend but no account: submit asks for an account and keeps the answers", async ({ page }) => {
  const state = await mockSupabase(page);
  await open(page, "?mock=1&preview=1");
  await expect(page.getByText("STEP 01 / 05")).toBeVisible();
  await fillStep1(page);
  await next(page);
  await step2(page);
  await step3(page);
  await step4(page);
  await step5(page);
  await submit(page);
  await expect(page.getByRole("heading", { name: "Create an account to apply and track your status." })).toBeVisible();
  await expect(page.getByText(/Create an account or log in to submit your application/)).toBeVisible();
  expect(appWrites(state)).toEqual([]);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("vdc-apply-draft") ?? "null")?.values?.fullName)).toBe("Test Student");
});

// ---------------------------------------------------------------- layout

test("layout: gate and step 1 at 1440 and 390", async ({ browser }) => {
  const desk = await browser.newContext({ viewport: { width: 1440, height: 900 }, baseURL: BASE });
  const page = await desk.newPage();
  await mockSupabase(page);
  await open(page);
  const title = await page.getByRole("heading", { name: /Create an account/ }).boundingBox();
  const figure = await page.locator("aside figure").first().boundingBox();
  expect(title && figure).toBeTruthy();
  expect(figure!.x).toBeGreaterThan(title!.x + title!.width); // model panel to the right, no overlap
  await desk.close();

  const desk2 = await browser.newContext({ viewport: { width: 1440, height: 900 }, baseURL: BASE });
  const p1 = await desk2.newPage();
  const { state, id } = seeded();
  await openAs(p1, state, id);
  const field = await p1.getByLabel(/Full name/).boundingBox();
  const model = await p1.locator("aside").first().boundingBox();
  expect(field && model).toBeTruthy();
  expect(model!.x).toBeGreaterThan(field!.x + field!.width);
  await desk2.close();

  const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, baseURL: BASE });
  const p2 = await phone.newPage();
  await mockSupabase(p2);
  await open(p2);
  await expect(p2.getByRole("tab", { name: "Sign up" })).toBeVisible();
  expect((await p2.getByLabel(/Full name/).boundingBox())!.width).toBeGreaterThan(300);
  expect(await p2.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
  await phone.close();
});
