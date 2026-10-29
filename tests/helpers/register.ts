import { expect, type Page } from "@playwright/test";

// Drive the v9 registration (/signup and /onboarding/) by field name. Values are fictional.

export const year = new Date().getFullYear();
export const PASSWORD = "Str0ng-pass1";

export const STUDENT = {
  full_name: "Sample Student 77",
  phone: "+1 555 010 7777",
  country: "USA",
  city: "Fort Worth",
  date_of_birth: "2001-05-14",
  current_status: "fresh_grad",
  degree_field: "architecture",
  degree_level: "bachelor",
  university: "Sample University",
  graduation_year: String(year - 1),
  experience_years: "lt1",
  revit_level: "beginner",
  career_goal: "bim_coordinator",
  preferred_format: "online",
  heard_from: "linkedin",
};

export const RECRUITER = {
  full_name: "Sample Recruiter 77",
  job_title: "Talent lead",
  company_name: "Sample Company Z",
  company_website: "https://example.com",
  company_type: "general_contractor",
  company_size: "51-200",
  phone: "+1 555 020 7777",
  country: "USA",
  city: "Dallas",
  linkedin_url: "https://www.linkedin.com/in/sample-recruiter-77",
  expected_hires: "2-5",
  heard_from: "google",
};

export const INSTRUCTOR = {
  full_name: "Sample Instructor 77",
  job_title: "BIM Manager",
  employer: "Sample Company Y",
  phone: "+1 555 030 7777",
  country: "USA",
  city: "Dallas",
  industry_years: "10-15",
  teaching_years: "2-5",
  teaching_format: "either",
  availability: "evenings",
  linkedin_url: "https://www.linkedin.com/in/sample-instructor-77",
  bio: "Sample instructor. Ten years of BIM delivery on commercial projects and a few years teaching Revit to new modelers.",
  heard_from: "bay_bim",
};

export const SELECTS = new Set(["industry_years", "teaching_years", "teaching_format", "availability", "current_status", "degree_field", "degree_level", "graduation_year", "experience_years", "revit_level", "career_goal", "preferred_format", "heard_from", "company_type", "company_size", "expected_hires"]);

export const next = (page: Page) => page.getByRole("button", { name: "Continue" }).click();

export async function setField(page: Page, name: string, value: string) {
  if (SELECTS.has(name)) await page.locator(`select[name="${name}"]`).selectOption(value);
  else await page.locator(`input[name="${name}"]`).fill(value);
}

export async function fillFields(page: Page, values: Record<string, string>) {
  for (const [k, v] of Object.entries(values)) if (v !== undefined) await setField(page, k, v);
}

// "recruiter" is not a card any more (v11): the old path is still there through ?as=recruiter.
export async function chooseRole(page: Page, role: "student" | "instructor" | "recruiter") {
  if (role === "recruiter") {
    await page.evaluate(() => localStorage.removeItem("vdc-signup-draft"));
    await page.goto("signup/?mock=1&as=recruiter");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(400);
  } else {
    await page.locator(`input[name="account_type"][value="${role}"]`).check();
  }
  await next(page);
}

export async function fillAccount(page: Page, email: string, password = PASSWORD) {
  await expect(page.getByText(/STEP 02 \/ 04/)).toBeVisible();
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.locator('input[name="confirm"]').fill(password);
  await next(page);
}

export async function fillStudent(page: Page, over: Partial<typeof STUDENT> = {}) {
  await expect(page.getByText(/· Details/)).toBeVisible();
  await fillFields(page, { ...STUDENT, ...over });
}

export async function fillRecruiter(page: Page, over: Partial<typeof RECRUITER> = {}, roles = ["bim_coordinator", "vdc_engineer"]) {
  await expect(page.getByText(/· Details/)).toBeVisible();
  await fillFields(page, { ...RECRUITER, ...over });
  for (const r of roles) await page.locator(`input[name="hiring_roles"][value="${r}"]`).check();
}

export async function fillInstructor(page: Page, over: Partial<typeof INSTRUCTOR> = {}, subjects = ["revit-architecture", "bim-fundamentals-revit"]) {
  await expect(page.getByText(/· Details/)).toBeVisible();
  await page.locator('textarea[name="bio"]').fill(over.bio ?? INSTRUCTOR.bio);
  await fillFields(page, { ...INSTRUCTOR, ...over, bio: undefined } as unknown as Record<string, string>);
  for (const s of subjects) await page.locator(`input[name="subjects"][value="${s}"]`).check();
}

export async function consent(page: Page, recruiter = false) {
  await expect(page.getByText(/· Review/)).toBeVisible();
  await page.locator('input[name="consent_terms"]').check();
  await page.locator('input[name="consent_contact"]').check();
  if (recruiter) await page.locator('input[name="authorised_confirmed"]').check();
}

// The whole student sign-up, ending on the "Check your email" screen.
export async function registerStudent(page: Page, email: string, over: Partial<typeof STUDENT> = {}) {
  await chooseRole(page, "student");
  await fillAccount(page, email);
  await fillStudent(page, over);
  await next(page);
  await consent(page);
  await page.getByRole("button", { name: "Create account" }).click();
}

export async function registerInstructor(page: Page, email: string, over: Partial<typeof INSTRUCTOR> = {}) {
  await chooseRole(page, "instructor");
  await fillAccount(page, email);
  await fillInstructor(page, over);
  await next(page);
  await consent(page, true);
  await page.getByRole("button", { name: "Create account" }).click();
}

export async function registerRecruiter(page: Page, email: string, over: Partial<typeof RECRUITER> = {}) {
  await chooseRole(page, "recruiter");
  await fillAccount(page, email);
  await fillRecruiter(page, over);
  await next(page);
  await consent(page, true);
  await page.getByRole("button", { name: "Create account" }).click();
}
