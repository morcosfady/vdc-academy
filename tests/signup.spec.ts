import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { emptyState, loginAs, mockSupabase, seedUser, type MockState } from "./helpers/mockSupabase";
import { INSTRUCTOR, PASSWORD, RECRUITER, STUDENT, chooseRole, consent, fillAccount, fillInstructor, fillRecruiter, fillStudent, next, setField, year } from "./helpers/register";

// v9 registration with roles, against the in-memory Supabase (`?mock=1`, tests/helpers/mockSupabase.ts), which
// mirrors supabase/migrations/0005_roles_registration.sql (profile from metadata, grants, guards, visibility).

async function open(page: Page, path: string) {
  await page.goto(`${path}${path.includes("?") ? "&" : "?"}mock=1`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(500);
}

const summary = (page: Page) => page.getByTestId("error-summary");
const serious = async (page: Page) => (await new AxeBuilder({ page }).analyze()).violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => `${v.id} (${v.nodes.length})`);

// A REST call from the page with the signed-in user's token (the mock answers it like PostgREST with RLS).
async function rest(page: Page, method: string, path: string, body?: unknown) {
  return page.evaluate(
    async ({ method, path, body }) => {
      const s = JSON.parse(localStorage.getItem("sb-mock-auth-token") ?? "{}");
      const res = await fetch(`https://mock.supabase.local/rest/v1/${path}`, { method, headers: { apikey: "mock-key", Authorization: `Bearer ${s.access_token}`, "Content-Type": "application/json", Prefer: "return=representation" }, body: body ? JSON.stringify(body) : undefined });
      return { status: res.status, body: await res.json().catch(() => null) };
    },
    { method, path, body },
  );
}

test("step 1 needs a role; the choice shows on later steps with Change", async ({ page }) => {
  await mockSupabase(page);
  await open(page, "signup/");
  await expect(page.getByRole("heading", { name: "Are you a student or an instructor?" })).toBeVisible();
  await expect(page.getByText("STEP 01 / 04")).toBeVisible();
  await next(page);
  await expect(summary(page)).toContainText("Please choose Student or Instructor.");
  await expect(summary(page)).toBeFocused();
  // keyboard: arrow keys move inside the radio group
  await page.locator('input[name="account_type"][value="student"]').focus();
  await page.keyboard.press("ArrowDown");
  await expect(page.locator('input[name="account_type"][value="instructor"]')).toBeChecked();
  await next(page);
  await expect(page.getByTestId("chosen-role")).toContainText("Signing up as: Instructor");
  await page.getByRole("button", { name: "Change" }).click();
  await expect(page.getByText("STEP 01 / 04")).toBeVisible();
});

test("account step: email, password rules, confirmation; recruiters see the free email warning", async ({ page }) => {
  await mockSupabase(page);
  await open(page, "signup/");
  await chooseRole(page, "recruiter");
  await next(page);
  for (const msg of ["Please enter a valid email address.", "Use at least 8 characters.", "Please type the password again."]) await expect(summary(page)).toContainText(msg);
  await page.locator('input[name="email"]').fill("someone@gmail.com");
  await expect(page.getByText(/looks like a personal email/)).toBeVisible();
  await page.locator('input[name="password"]').fill("onlyletters");
  await page.locator('input[name="confirm"]').fill("different1");
  await next(page);
  await expect(summary(page)).toContainText("Add at least one number.");
  await expect(summary(page)).toContainText("The two passwords do not match.");
  await page.locator('input[name="password"]').fill(PASSWORD);
  await page.locator('input[name="confirm"]').fill(PASSWORD);
  await next(page);
  await expect(page.getByText(/· Details/)).toBeVisible();
});

test("student details: every field is required, under 16 is refused, the fresh graduate notice appears", async ({ page }) => {
  await mockSupabase(page);
  await open(page, "signup/");
  await chooseRole(page, "student");
  await fillAccount(page, "student77@example.com");
  await fillStudent(page);
  // each required field, emptied on its own, keeps the form on this step with an error
  for (const k of Object.keys(STUDENT)) {
    await setField(page, k, "");
    await next(page);
    await expect(summary(page), `empty ${k}`).toBeVisible();
    await expect(page.getByText(/· Details/), `still on details without ${k}`).toBeVisible();
    await setField(page, k, (STUDENT as Record<string, string>)[k]);
  }
  // WhatsApp becomes required when it is not the phone number
  await page.locator('input[name="whatsapp_same"]').uncheck();
  await next(page);
  await expect(summary(page)).toContainText("Please enter your WhatsApp number");
  await page.locator('input[name="whatsapp"]').fill("+1 555 010 8888");
  // 15 years old
  const young = new Date();
  young.setFullYear(young.getFullYear() - 15);
  await setField(page, "date_of_birth", young.toISOString().slice(0, 10));
  await next(page);
  await expect(summary(page)).toContainText("You need to be 16 or older");
  await setField(page, "date_of_birth", STUDENT.date_of_birth);
  // graduated last year: the 40% notice; ten years ago: none
  await expect(page.getByTestId("fresh-notice")).toContainText("You may qualify for 40% off");
  await setField(page, "graduation_year", String(year - 10));
  await expect(page.getByTestId("fresh-notice")).toHaveCount(0);
  await setField(page, "graduation_year", STUDENT.graduation_year);
  await next(page);
  await expect(page.getByText(/· Review/)).toBeVisible();
});

test("student sign-up: review, consents required, success screen, a complete profile from the metadata", async ({ page }) => {
  const state = await mockSupabase(page);
  await open(page, "signup/");
  await chooseRole(page, "student");
  await fillAccount(page, "student78@example.com");
  await fillStudent(page);
  await next(page);
  await expect(page.getByTestId("review")).toContainText("Sample Student 77");
  await expect(page.getByTestId("review")).toContainText("Fresh graduate");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(summary(page)).toContainText("Please agree to the Terms and Privacy Policy.");
  await expect(summary(page)).toContainText("Please agree so we can contact you about your account.");
  expect(state.users).toHaveLength(0);
  // Edit jumps back to the details
  await page.getByRole("button", { name: "Edit Details" }).click();
  await expect(page.getByText(/· Details/)).toBeVisible();
  await setField(page, "city", "Arlington");
  await next(page);
  await consent(page);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByTestId("check-email")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Check your email to verify your account." })).toBeVisible();
  await expect(page.getByRole("button", { name: "Resend the email" })).toBeDisabled(); // rate limited
  const signup = state.requests.find((r) => r.path === "/auth/v1/signup")!;
  const meta = (signup.body as { data: Record<string, unknown> }).data;
  expect(meta).toMatchObject({ account_type: "student", full_name: "Sample Student 77", city: "Arlington", date_of_birth: "2001-05-14", consent_terms: true, consent_contact: true });
  expect(Object.keys(meta)).not.toContain("role");
  expect(JSON.stringify(meta)).not.toContain(PASSWORD);
  const u = state.users.find((x) => x.email === "student78@example.com")!;
  const p = state.tables.profiles.find((x) => x.id === u.id)!;
  expect(p).toMatchObject({ role: "student", account_type: "student", onboarding_complete: true, degree_field: "architecture" });
  // the draft is gone after success
  expect(await page.evaluate(() => localStorage.getItem("vdc-signup-draft"))).toBeNull();
});

test("recruiter details: every field required, URLs checked, at least one role, authorisation required; pending review note", async ({ page }) => {
  const state = await mockSupabase(page);
  await open(page, "signup/");
  await chooseRole(page, "recruiter");
  await fillAccount(page, "recruiter77@example.com");
  await fillRecruiter(page, {}, []);
  await next(page);
  await expect(summary(page)).toContainText("Please choose at least one role you hire for.");
  await page.locator('input[name="hiring_roles"][value="bim_modeler"]').check();
  for (const k of Object.keys(RECRUITER)) {
    await setField(page, k, "");
    await next(page);
    await expect(summary(page), `empty ${k}`).toBeVisible();
    await setField(page, k, (RECRUITER as Record<string, string>)[k]);
  }
  await setField(page, "company_website", "example");
  await setField(page, "linkedin_url", "https://example.com/in/someone");
  await next(page);
  await expect(summary(page)).toContainText("Please enter the full website address");
  await expect(summary(page)).toContainText("Please enter your LinkedIn profile link");
  await setField(page, "company_website", RECRUITER.company_website);
  await setField(page, "linkedin_url", RECRUITER.linkedin_url);
  await next(page);
  await consent(page, false);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(summary(page)).toContainText("Please confirm you can recruit for this company.");
  await page.locator('input[name="authorised_confirmed"]').check();
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText("Your company account will be reviewed by our team within 2 working days.")).toBeVisible();
  const u = state.users.find((x) => x.email === "recruiter77@example.com")!;
  expect(state.tables.profiles.find((x) => x.id === u.id)).toMatchObject({ role: "recruiter", account_type: "recruiter", onboarding_complete: true });
  expect(state.tables.recruiter_profiles.find((x) => x.id === u.id)).toMatchObject({ verification_status: "pending", hiring_roles: ["bim_modeler"], authorised_confirmed: true, company_name: "Sample Company Z" });
});

test("autosave keeps the answers across a reload and never stores the password", async ({ page }) => {
  await mockSupabase(page);
  await open(page, "signup/");
  await chooseRole(page, "student");
  await page.locator('input[name="email"]').fill("student79@example.com");
  await page.locator('input[name="password"]').fill(PASSWORD);
  await page.locator('input[name="confirm"]').fill(PASSWORD);
  await next(page);
  await setField(page, "full_name", "Sample Student 79");
  await page.waitForTimeout(700);
  const stored = await page.evaluate(() => JSON.stringify(Object.fromEntries(Object.keys(localStorage).map((k) => [k, localStorage.getItem(k)]))));
  expect(stored).toContain("Sample Student 79");
  expect(stored).not.toContain(PASSWORD);
  const draft = await page.evaluate(() => JSON.parse(localStorage.getItem("vdc-signup-draft") ?? "{}"));
  expect(Object.keys(draft.v)).not.toContain("password");
  expect(Object.keys(draft.v)).not.toContain("confirm");
  await page.reload();
  await page.waitForLoadState("networkidle");
  await expect(page.getByText(/· Details/)).toBeVisible();
  await expect(page.locator('input[name="full_name"]')).toHaveValue("Sample Student 79");
  await expect(page.getByText("We restored your answers. Your password is never saved.")).toBeVisible();
  // the password must be typed again
  await page.getByRole("button", { name: "Back" }).click();
  await expect(page.locator('input[name="password"]')).toHaveValue("");
});

// ---------------------------------------------------------------- onboarding gate

function incomplete(accountType: "student" | "recruiter" | null) {
  const state = emptyState();
  const id = seedUser(state, "half@example.com", PASSWORD, { full_name: "Half Done" }, accountType ?? "student", { onboarding: false, profile: { account_type: accountType, city: "Austin" } });
  return { state, id };
}

test("an incomplete profile is sent to /onboarding/ from account, apply and admin", async ({ page }) => {
  const { state, id } = incomplete(null);
  await mockSupabase(page, state);
  await loginAs(page, state, id);
  for (const path of ["account/", "apply/", "admin/"]) {
    await page.goto(`${path}?mock=1`);
    await expect(page, `from /${path}`).toHaveURL(/\/onboarding\/\?next=/);
  }
  // no account type yet (Google, magic link): the role question first, prefilled name
  await expect(page.getByRole("heading", { name: "A few details before you continue." })).toBeVisible();
  await chooseRole(page, "student");
  await expect(page.locator('input[name="full_name"]')).toHaveValue("Half Done");
  await expect(page.locator('input[name="city"]')).toHaveValue("Austin");
  await fillStudent(page);
  await next(page);
  await consent(page);
  await page.getByRole("button", { name: "Finish setup" }).click();
  await expect(page).not.toHaveURL(/onboarding/);
  expect(state.tables.profiles.find((x) => x.id === id)).toMatchObject({ account_type: "student", onboarding_complete: true, degree_field: "architecture" });
});

test("a v7 student is prefilled, keeps the locked account type and cannot switch it", async ({ page }) => {
  const { state, id } = incomplete("student");
  await mockSupabase(page, state);
  await loginAs(page, state, id);
  await open(page, "onboarding/");
  await expect(page.getByText("Account type: Student. It was set when the account was created.")).toBeVisible();
  await expect(page.locator('input[name="account_type"]')).toHaveCount(0);
  await expect(page.getByText("STEP 01 / 02")).toBeVisible();
  // the mock refuses an account type switch and a premature onboarding_complete, like the database
  const sw = await rest(page, "PATCH", `profiles?id=eq.${id}`, { account_type: "recruiter" });
  expect(sw.status).toBe(400);
  expect(JSON.stringify(sw.body)).toContain("chosen once");
  const early = await rest(page, "PATCH", `profiles?id=eq.${id}`, { onboarding_complete: true });
  expect(early.status).toBe(400);
  expect(JSON.stringify(early.body)).toContain("profile_complete");
  const promote = await rest(page, "PATCH", `profiles?id=eq.${id}`, { role: "admin" });
  expect(promote.status).toBe(400);
  expect(state.tables.profiles.find((x) => x.id === id)).toMatchObject({ role: "student", account_type: "student", onboarding_complete: false });
});

// ---------------------------------------------------------------- super admin, recruiters and RLS in the mock

function withGrant(): MockState {
  const state = emptyState();
  state.roleGrants = [{ email: "owner@vdc.test", role: "super_admin" }];
  return state;
}

test("team sign-up: the grant applies only after the email is confirmed, then the admin screens open", async ({ page }) => {
  const state = withGrant();
  await mockSupabase(page, state);
  await open(page, "signup/");
  await page.getByTestId("team-account").click();
  await fillAccount(page, "Owner@vdc.test");
  await expect(page.getByRole("heading", { name: "Academy team account." })).toBeVisible();
  await setField(page, "full_name", "Sample Owner");
  await setField(page, "phone", "+1 555 010 0001");
  await next(page);
  await consent(page);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByTestId("check-email")).toBeVisible();
  const u = state.users.find((x) => x.email === "owner@vdc.test")!;
  const p = () => state.tables.profiles.find((x) => x.id === u.id)!;
  expect(p().role).toBe("student"); // unconfirmed: no grant yet
  expect(p().onboarding_complete).toBe(false);
  const meta = (state.requests.find((r) => r.path === "/auth/v1/signup")!.body as { data: Record<string, unknown> }).data;
  expect(Object.keys(meta)).not.toContain("role");
  // confirmed: the next request applies the grant
  u.confirmed = true;
  await loginAs(page, state, u.id);
  await open(page, "admin/");
  expect(p()).toMatchObject({ role: "super_admin", onboarding_complete: true });
  await expect(page.getByText("The academy at a glance.")).toBeVisible();
});

test("a recruiter reads no applications or student profiles and sees the hiring message on /apply", async ({ page }) => {
  const state = emptyState();
  const student = seedUser(state, "student80@example.com", PASSWORD, { full_name: "Sample Student 80" });
  state.tables.applications.push({ id: "aaaaaaaa-0000-4000-8000-000000000080", user_id: student, status: "submitted", programs: ["revit-mep"], full_name: "Sample Student 80", email: "student80@example.com", created_at: new Date().toISOString() });
  const rec = seedUser(state, "recruiter80@example.com", PASSWORD, { full_name: "Sample Recruiter 80" }, "recruiter");
  await mockSupabase(page, state);
  await loginAs(page, state, rec);
  await open(page, "apply/");
  await expect(page.getByTestId("recruiter-apply")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Applications are for students." })).toBeVisible();
  expect((await rest(page, "GET", "applications?select=*")).body).toEqual([]);
  expect((await rest(page, "GET", `profiles?select=*&id=eq.${student}`)).body).toEqual([]);
  const ins = await rest(page, "POST", "applications", { status: "draft", full_name: "x", programs: ["revit-mep"] });
  expect(ins.status).toBe(403);
  // and cannot approve itself
  await rest(page, "PATCH", `recruiter_profiles?id=eq.${rec}`, { verification_status: "approved", job_title: "Head of BIM" });
  expect(state.tables.recruiter_profiles.find((x) => x.id === rec)).toMatchObject({ verification_status: "pending", job_title: "Head of BIM" });
});

// ---------------------------------------------------------------- accessibility and copy

test("axe and copy: every registration step and onboarding", async ({ page }) => {
  await mockSupabase(page);
  await open(page, "signup/");
  const check = async (label: string) => {
    expect(await serious(page), label).toEqual([]);
    const text = await page.locator("main").innerText();
    expect(text, label).not.toContain("—");
    expect(text, label).not.toMatch(/\[[A-Z][A-Z0-9 \/]{1,40}\]/);
  };
  await check("role");
  await chooseRole(page, "instructor");
  await check("account");
  await fillAccount(page, "instructor83@example.com");
  await check("instructor details");
  await next(page); // the error summary is part of the check too
  await check("instructor details with errors");
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await page.getByRole("button", { name: "Change" }).click();
  await chooseRole(page, "student");
  await next(page);
  await fillStudent(page);
  await check("student details");
  await next(page);
  await check("review");
  const { state, id } = incomplete(null);
  await page.unrouteAll({ behavior: "ignoreErrors" });
  await mockSupabase(page, state);
  await loginAs(page, state, id);
  await open(page, "onboarding/");
  await check("onboarding");
});

for (const w of [390, 360]) {
  test(`registration fits ${w} px: one column, 48 px inputs, no overflow`, async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: w, height: 800 }, baseURL: process.env.BASE_URL ?? "http://localhost:4173/vdc-academy/" });
    const page = await ctx.newPage();
    await mockSupabase(page);
    await open(page, "signup/");
    await chooseRole(page, "instructor");
    await fillAccount(page, "instructor84@example.com");
    const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(over).toBeLessThanOrEqual(1);
    const heights = await page.locator("main form input:not([type=checkbox]):not([type=radio]):not([name=website]), main form select").evaluateAll((els) => els.map((e) => (e as HTMLElement).getBoundingClientRect().height));
    expect(Math.min(...heights)).toBeGreaterThanOrEqual(48);
    const lefts = await page.locator('select[name="industry_years"], select[name="teaching_years"]').evaluateAll((els) => els.map((e) => Math.round((e as HTMLElement).getBoundingClientRect().left)));
    expect(new Set(lefts).size).toBe(1); // stacked
    await ctx.close();
  });
}

// ---------------------------------------------------------------- v11: instructors replace recruiters at sign-up

test("step 1 offers Student and Instructor only (no Recruiter card)", async ({ page }) => {
  await mockSupabase(page);
  await open(page, "signup/");
  await expect(page.locator('input[name="account_type"]')).toHaveCount(2);
  await expect(page.locator('input[name="account_type"][value="student"]')).toHaveCount(1);
  await expect(page.locator('input[name="account_type"][value="instructor"]')).toHaveCount(1);
  await expect(page.getByText("Recruiter", { exact: true })).toHaveCount(0);
  await expect(page.getByText("I teach BIM and VDC courses.")).toBeVisible();
});

test("instructor details: every field required, LinkedIn checked, a subject and a real bio needed, confirmation required; pending review note", async ({ page }) => {
  const state = await mockSupabase(page);
  await open(page, "signup/");
  await chooseRole(page, "instructor");
  await fillAccount(page, "instructor77@example.com");
  await fillInstructor(page, {}, []);
  await next(page);
  await expect(summary(page)).toContainText("Please choose at least one program you can teach.");
  await page.locator('input[name="subjects"][value="revit-mep"]').check();
  for (const k of Object.keys(INSTRUCTOR)) {
    if (k === "bio") await page.locator('textarea[name="bio"]').fill("");
    else await setField(page, k, "");
    await next(page);
    await expect(summary(page), `empty ${k}`).toBeVisible();
    if (k === "bio") await page.locator('textarea[name="bio"]').fill(INSTRUCTOR.bio);
    else await setField(page, k, (INSTRUCTOR as Record<string, string>)[k]);
  }
  await page.locator('textarea[name="bio"]').fill("Too short.");
  await setField(page, "linkedin_url", "https://example.com/in/someone");
  await next(page);
  await expect(summary(page)).toContainText("Please write at least 40 characters about your background.");
  await expect(summary(page)).toContainText("Please enter your LinkedIn profile link");
  await page.locator('textarea[name="bio"]').fill(INSTRUCTOR.bio);
  await setField(page, "linkedin_url", INSTRUCTOR.linkedin_url);
  await next(page);
  await consent(page, false);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(summary(page)).toContainText("Please confirm your details are accurate and that you can teach this material.");
  await page.locator('input[name="authorised_confirmed"]').check();
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText("Your instructor profile will be reviewed by our team within 2 working days.")).toBeVisible();
  const u = state.users.find((x) => x.email === "instructor77@example.com")!;
  expect(state.tables.profiles.find((x) => x.id === u.id)).toMatchObject({ role: "instructor", account_type: "instructor", onboarding_complete: true });
  expect(state.tables.instructor_profiles.find((x) => x.id === u.id)).toMatchObject({ verification_status: "pending", subjects: ["revit-mep"], info_confirmed: true, employer: "Sample Company Y" });
  const meta = (state.requests.find((r) => r.path === "/auth/v1/signup")!.body as { data: Record<string, unknown> }).data;
  expect(Object.keys(meta)).not.toContain("role");
});

test("an instructor reads no applications or student profiles, cannot apply, cannot approve itself or switch type", async ({ page }) => {
  const state = emptyState();
  const student = seedUser(state, "student81@example.com", PASSWORD, { full_name: "Sample Student 81" });
  state.tables.applications.push({ id: "aaaaaaaa-0000-4000-8000-000000000081", user_id: student, status: "submitted", programs: ["revit-mep"], full_name: "Sample Student 81", email: "student81@example.com", created_at: new Date().toISOString() });
  const ins = seedUser(state, "instructor81@example.com", PASSWORD, { full_name: "Sample Instructor 81" }, "instructor");
  await mockSupabase(page, state);
  await loginAs(page, state, ins);
  await open(page, "account/");
  expect((await rest(page, "GET", "applications?select=*")).body).toEqual([]);
  expect((await rest(page, "GET", `profiles?select=*&id=eq.${student}`)).body).toEqual([]);
  expect((await rest(page, "POST", "applications", { status: "draft", full_name: "x", programs: ["revit-mep"] })).status).toBe(403);
  await rest(page, "PATCH", `instructor_profiles?id=eq.${ins}`, { verification_status: "approved", job_title: "Head of BIM" });
  expect(state.tables.instructor_profiles.find((x) => x.id === ins)).toMatchObject({ verification_status: "pending", job_title: "Head of BIM" });
  expect((await rest(page, "PATCH", `profiles?id=eq.${ins}`, { role: "admin" })).status).toBe(400);
  expect((await rest(page, "PATCH", `profiles?id=eq.${ins}`, { account_type: "student" })).status).toBe(400);
  expect(state.tables.profiles.find((x) => x.id === ins)).toMatchObject({ role: "instructor", account_type: "instructor" });
});

test("an instructor with an incomplete profile is sent to /onboarding/ and finishes it there", async ({ page }) => {
  const state = emptyState();
  const id = seedUser(state, "instructor82@example.com", PASSWORD, { full_name: "Sample Instructor 82" }, "instructor", { onboarding: false, profile: { phone: null } });
  await mockSupabase(page, state);
  await loginAs(page, state, id);
  await open(page, "account/");
  await expect(page).toHaveURL(/\/onboarding\//);
  await expect(page.getByText("Account type: Instructor.")).toBeVisible();
  await fillInstructor(page, { full_name: "Sample Instructor 82" });
  await next(page);
  await consent(page, true);
  await page.getByRole("button", { name: "Finish setup" }).click();
  await expect(page).toHaveURL(/\/account\//);
  expect(state.tables.profiles.find((x) => x.id === id)).toMatchObject({ onboarding_complete: true, account_type: "instructor" });
  expect(state.tables.instructor_profiles.find((x) => x.id === id)).toMatchObject({ employer: "Sample Company Y", info_confirmed: true, verification_status: "pending" });
});
