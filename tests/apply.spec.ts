import { expect, test, type Page, type Route } from "@playwright/test";

// The apply form against the static export. `?mock=1` makes lib/submit.ts talk to https://mock.supabase.local,
// which these tests intercept. Without `mock` and without keys the form must fall back honestly.

const year = String(new Date().getFullYear());
const PDF = Buffer.from("%PDF-1.4\n1 0 obj << /Type /Catalog >> endobj\ntrailer << /Root 1 0 R >>\n%%EOF\n");

type Hit = { method: string; url: string; body: string | null };

// Records every call to the mock backend and answers like Supabase would (201 for REST inserts, 200 for uploads).
async function mockBackend(page: Page) {
  const hits: Hit[] = [];
  await page.route("**/mock.supabase.local/**", async (route: Route) => {
    const req = route.request();
    const cors = { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*" };
    if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
    hits.push({ method: req.method(), url: req.url(), body: req.postData() });
    if (req.url().includes("/rest/v1/")) return route.fulfill({ status: 201, headers: cors, body: "" });
    if (req.url().includes("/storage/v1/")) return route.fulfill({ status: 200, headers: cors, contentType: "application/json", body: JSON.stringify({ Key: "applications/x" }) });
    return route.fulfill({ status: 404, headers: cors, body: "" });
  });
  return hits;
}

async function open(page: Page, query = "") {
  await page.goto(`apply/${query}`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1500); // let the page hydrate before the first click
}

const next = (page: Page) => page.getByRole("button", { name: "Continue" }).click();

async function step1(page: Page) {
  await page.getByLabel(/Full name/).fill("Test Student");
  await page.getByLabel(/^Email/).fill("test@example.com");
  await page.getByLabel(/Phone/).fill("+1 555 123 4567");
  await page.getByLabel(/^Country/).fill("USA");
  await page.getByLabel(/^City/).fill("Dallas");
  await next(page);
  await expect(page.getByText("Your education.")).toBeVisible();
}

async function step2(page: Page, withProof = false) {
  await page.getByLabel(/Current status/).selectOption("Fresh graduate");
  await page.getByLabel(/^Degree/).selectOption("Architecture");
  await page.getByLabel(/^University/).fill("UT Arlington");
  await page.getByLabel(/Graduation year/).selectOption(year);
  if (withProof) {
    await page.getByLabel(/Proof for your discount/).setInputFiles({ name: "degree.pdf", mimeType: "application/pdf", buffer: PDF });
    await expect(page.getByText("degree.pdf")).toBeVisible();
  }
  await next(page);
  await expect(page.getByText("Experience and goals.")).toBeVisible();
}

async function step3(page: Page) {
  await page.getByLabel(/Years of experience/).selectOption("None");
  await page.getByLabel(/Revit skill level/).selectOption("Beginner");
  await page.getByLabel(/Career goal/).selectOption("BIM Modeler");
  await next(page);
  await expect(page.getByText("Choose your program.")).toBeVisible();
}

async function step4(page: Page) {
  await page.locator('input[name="programs"]').first().check();
  await page.getByLabel(/Preferred format/).selectOption("Online live");
  await page.getByLabel(/Preferred schedule/).selectOption("Evenings");
  await page.getByLabel(/Preferred start/).selectOption("Next cohort");
  await page.getByLabel(/Laptop that can run Revit/).selectOption("Yes");
  await expect(page.getByText("Your estimate")).toBeVisible();
  await next(page);
  await expect(page.getByText("Review and submit.")).toBeVisible();
}

async function step5(page: Page) {
  await page.locator('input[name="consentPrivacy"]').check();
  await page.locator('input[name="consentContact"]').check();
}

async function walkToReview(page: Page, withProof = false) {
  await step1(page);
  await step2(page, withProof);
  await step3(page);
  await step4(page);
  await step5(page);
}

const submit = (page: Page) => page.getByRole("button", { name: "Submit application" }).click();

test("happy path: five steps, upload, submit, success timeline", async ({ page }) => {
  const hits = await mockBackend(page);
  await open(page, "?mock=1");
  await expect(page.getByText("STEP 01 / 05")).toBeVisible();
  await walkToReview(page, true);
  // the review step shows what was entered
  await expect(page.getByText("Test Student")).toBeVisible();
  await expect(page.getByText("degree.pdf")).toBeVisible();
  await submit(page);

  await page.waitForURL(/apply\/success\/?$/);
  await expect(page.getByRole("heading", { name: /Thank you, Test/ })).toBeVisible();
  await expect(page.getByText("What happens next")).toBeVisible();
  for (const t of ["We review", "Advisor call", "Enroll and pay", "Start learning"]) await expect(page.getByRole("heading", { name: t })).toBeVisible();
  await expect(page.locator("ol p.mono", { hasText: /^01$/ })).toBeVisible(); // mono step numbers
  await expect(page.getByText("Your discount is pending verification")).toBeVisible();

  // one upload to proof/<uuid>.pdf, one insert into applications with the right discount
  const upload = hits.find((h) => h.url.includes("/storage/v1/object/applications/proof/"));
  expect(upload?.method).toBe("POST");
  expect(upload?.url).toMatch(/proof\/[0-9a-f-]{36}\.pdf$/);
  const insert = hits.find((h) => h.url.endsWith("/rest/v1/applications"));
  expect(insert?.method).toBe("POST");
  const row = JSON.parse(insert!.body!);
  expect(row.full_name).toBe("Test Student");
  expect(row.email).toBe("test@example.com");
  expect(row.graduation_year).toBe(Number(year));
  expect(row.discount_type).toBe("freshGrad");
  expect(row.proof_file_path).toMatch(/^proof\/[0-9a-f-]{36}\.pdf$/);
  expect(row.consent_privacy).toBe(true);
  expect(row.programs.length).toBe(1);
  expect(hits.some((h) => h.url.endsWith("/rest/v1/newsletter_subscribers"))).toBe(false); // box left unchecked
});

test("step 1 validation errors", async ({ page }) => {
  await open(page, "?mock=1");
  await next(page);
  await expect(page.getByText("Please enter your full name.")).toBeVisible();
  await expect(page.getByText("Please enter a valid email address.")).toBeVisible();
  await expect(page.getByText("Please enter your phone number with country code.")).toBeVisible();
  await expect(page.getByText("Please enter your country.")).toBeVisible();
  await expect(page.getByText("Please enter your city.")).toBeVisible();
  await expect(page.getByText("STEP 01 / 05")).toBeVisible(); // did not advance
  await page.getByLabel(/^Email/).fill("not-an-email");
  await next(page);
  await expect(page.getByText("Please enter a valid email address.")).toBeVisible();
});

test("fresh graduate detection by graduation year", async ({ page }) => {
  await open(page, "?mock=1");
  await step1(page);
  const banner = page.getByText(/qualify for the fresh graduate discount/);
  await page.getByLabel(/Graduation year/).selectOption(String(Number(year) - 6));
  await expect(banner).toHaveCount(0);
  await page.getByLabel(/Graduation year/).selectOption(year);
  await expect(banner).toBeVisible();
  await expect(banner).toContainText("40%");
  // a current student gets the student discount instead, not the fresh graduate one
  await page.getByLabel(/Current status/).selectOption("Current student");
  await expect(banner).toHaveCount(0);
});

test("upload: a 6 MB file is rejected with a visible message", async ({ page }) => {
  await open(page, "?mock=1");
  await step1(page);
  await page.getByLabel(/Proof for your discount/).setInputFiles({ name: "big.pdf", mimeType: "application/pdf", buffer: Buffer.alloc(6 * 1024 * 1024, 0x20) });
  await expect(page.getByRole("alert").filter({ hasText: "larger than 5 MB" })).toBeVisible();
  await expect(page.getByText("big.pdf")).toHaveCount(0);
});

test("upload: an .exe is rejected with a visible message", async ({ page }) => {
  await open(page, "?mock=1");
  await step1(page);
  await page.getByLabel(/Proof for your discount/).setInputFiles({ name: "setup.exe", mimeType: "application/x-msdownload", buffer: Buffer.from("MZ") });
  await expect(page.getByRole("alert").filter({ hasText: "file type is not allowed" })).toBeVisible();
  await expect(page.getByText("setup.exe")).toHaveCount(0);
  // a valid file right after clears the error
  await page.getByLabel(/Proof for your discount/).setInputFiles({ name: "id.png", mimeType: "image/png", buffer: Buffer.from("PNG") });
  await expect(page.getByText("id.png")).toBeVisible();
  await expect(page.getByRole("alert").filter({ hasText: "file type is not allowed" })).toHaveCount(0);
});

test("fallback without keys: the form works up to submit, then asks for an email instead", async ({ page }) => {
  const hits = await mockBackend(page); // must stay empty: mock is off, keys are absent
  await open(page);
  await expect(page.getByText("STEP 01 / 05")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Applications open soon." })).toHaveCount(0);
  await walkToReview(page);
  await submit(page);
  await expect(page.getByRole("heading", { name: "Applications open soon." })).toBeVisible();
  await expect(page.getByText("Leave your email and we will notify you.")).toBeVisible();
  await expect(page.getByText("was not sent")).toBeVisible();
  await expect(page.getByLabel(/^Name/)).toBeVisible();
  await expect(page.getByLabel(/^Email/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Notify me" })).toBeVisible();
  // the lead form is honest too: nothing is saved, so it never says "thank you"
  await page.getByLabel(/^Name/).fill("Test Student");
  await page.getByLabel(/^Email/).fill("test@example.com");
  await page.getByRole("button", { name: "Notify me" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Applications open soon" }).first()).toBeVisible();
  await expect(page.getByText("Thank you. We will be in touch soon.")).toHaveCount(0);
  // the answers are still there
  await page.getByRole("button", { name: "Back to your answers" }).click();
  await expect(page.getByText("Review and submit.")).toBeVisible();
  await expect(page.getByText("Test Student")).toBeVisible();
  expect(hits).toEqual([]);
  expect(page.url()).toMatch(/apply\/?$/);
});

test("honeypot filled: nothing is sent", async ({ page }) => {
  const hits = await mockBackend(page);
  await open(page, "?mock=1");
  await walkToReview(page);
  await page.locator('input[name="website"]').evaluate((el) => {
    (el as HTMLInputElement).value = "http://spam.example";
  });
  await submit(page);
  await page.waitForURL(/apply\/success\/?$/);
  await page.waitForTimeout(500);
  expect(hits).toEqual([]);
});

test("?preview=1 still shows the full form", async ({ page }) => {
  await open(page, "?preview=1");
  await expect(page.getByText("STEP 01 / 05")).toBeVisible();
  await expect(page.getByLabel(/Full name/)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Applications open soon." })).toHaveCount(0);
});

test("autosave: a draft can be resumed after reload", async ({ page }) => {
  await open(page, "?mock=1");
  await page.getByLabel(/Full name/).fill("Draft Person");
  await page.getByLabel(/^Email/).fill("draft@example.com");
  await page.waitForTimeout(900); // debounce
  await page.reload();
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Resume" }).click();
  await expect(page.getByLabel(/Full name/)).toHaveValue("Draft Person");
});

test("layout: model beside the form at 1440, full-width fields at 390", async ({ browser }) => {
  const desk = await browser.newContext({ viewport: { width: 1440, height: 900 }, baseURL: process.env.BASE_URL ?? "http://localhost:4173/vdc-academy/" });
  const page = await desk.newPage();
  await open(page, "?preview=1");
  const field = await page.getByLabel(/Full name/).boundingBox();
  const model = await page.locator("aside").first().boundingBox();
  expect(field && model).toBeTruthy();
  expect(model!.x).toBeGreaterThan(field!.x + field!.width); // model to the right, no overlap
  await desk.close();

  const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, baseURL: process.env.BASE_URL ?? "http://localhost:4173/vdc-academy/" });
  const p2 = await phone.newPage();
  await open(p2, "?preview=1");
  const f2 = await p2.getByLabel(/Full name/).boundingBox();
  expect(f2!.width).toBeGreaterThan(300);
  expect(await p2.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
  await phone.close();
});
