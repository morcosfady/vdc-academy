import { test, type Page } from "@playwright/test";
import fs from "node:fs";
import { loginAs, mockSupabase } from "./helpers/mockSupabase";
import { demoAdminId, demoTalentStudentId, demoVerifiedRecruiterId, seedDemo } from "../lib/demo/seed";

// Screenshots of the evaluation screens on the demo seed, for looking at them. Off by default:
//   SHOTS=1 BASE_URL=http://localhost:4192/vdc-academy/ pnpm exec playwright test tests/evaluations-shots.spec.ts --project=chromium
// Writes to tmp-shots/ (untracked).
const OUT = "tmp-shots";
test.skip(process.env.SHOTS !== "1", "screenshot capture, run with SHOTS=1");

async function shoot(page: Page, name: string, o: { full?: boolean; selector?: string } = {}) {
  fs.mkdirSync(OUT, { recursive: true });
  await page.waitForTimeout(700);
  if (o.selector) await page.locator(o.selector).first().screenshot({ path: `${OUT}/${name}.png` });
  else await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: o.full ?? false });
}

for (const width of [1440, 390]) {
  test(`evaluation screens at ${width}`, async ({ browser }) => {
    const state = seedDemo();
    const open = async (userId: string | null, path: string) => {
      const ctx = await browser.newContext({ viewport: { width, height: width > 700 ? 900 : 844 } });
      const page = await ctx.newPage();
      await mockSupabase(page, state);
      if (userId) await loginAs(page, state, userId);
      await page.goto(`${path}${path.includes("?") ? "&" : "?"}mock=1`);
      await page.waitForLoadState("networkidle");
      return page;
    };
    const recruiter = demoVerifiedRecruiterId(state)!;
    const student = demoTalentStudentId(state)!;
    const admin = demoAdminId(state)!;
    const studentB = state.users.find((u) => u.email === "studentb@example.com")!.id;

    // recruiter: the talent list and the form
    let page = await open(recruiter, "account/#talent");
    await page.locator('[data-testid="talent-card"]').first().waitFor();
    await shoot(page, `eval-${width}-recruiter-talent`, { selector: "#talent" });
    await shoot(page, `eval-${width}-recruiter-my-evaluations`, { selector: "#evaluations" });
    await page.context().close();

    page = await open(recruiter, `account/evaluate/?student=${studentB}&context=interview`);
    await page.locator("form#evaluation-form").waitFor();
    await shoot(page, `eval-${width}-form-empty`, { full: true });
    await page.locator('select[name="context"]').selectOption("interview");
    for (const [k, n] of [["modeling", 4], ["coordination", 3], ["standards", 5], ["communication", 4], ["professionalism", 5], ["portfolio", 4]] as const) await page.locator(`label:has(input[name="score-${k}"][value="${n}"])`).click();
    await page.locator('label:has(input[name="overall"][value="4"])').click();
    await page.locator('select[name="recommendation"]').selectOption("yes");
    await page.locator('textarea[name="strengths"]').fill("Clear explanations and a tidy model. The clash report was easy to follow.");
    await page.locator('textarea[name="improvements"]').fill("Practice presenting trade-offs to a senior reviewer.");
    await page.locator('textarea[name="private_note"]').fill("Would like a second interview next month.");
    await shoot(page, `eval-${width}-form-filled`, { full: true });
    await page.context().close();

    // unverified recruiter
    page = await open(state.users.find((u) => u.email === "recruiter01@example.com")!.id, "account/#talent");
    await shoot(page, `eval-${width}-recruiter-unverified`, { selector: "#talent" });
    await page.context().close();

    // student: the dashboard card and the switch
    page = await open(student, "account/#evaluations");
    await page.locator('[data-testid="evaluation-card"]').first().waitFor();
    await shoot(page, `eval-${width}-student-card`, { selector: "#evaluations" });
    await page.context().close();
    page = await open(state.users.find((u) => u.email === "studentf@example.com")!.id, "account/#evaluations");
    await shoot(page, `eval-${width}-student-empty-hidden`, { selector: "#evaluations" });
    await page.context().close();
    page = await open(student, "account/profile/#visibility");
    await shoot(page, `eval-${width}-student-switch`, { selector: "#visibility" });
    await page.context().close();

    // admin: the table, the drawer, the overview card
    page = await open(admin, "admin/evaluations/");
    await page.locator('[data-testid="evaluation-row"]').first().waitFor();
    await shoot(page, `eval-${width}-admin-table`, { full: true });
    await page.locator('[data-testid="open-evaluation"]').first().click();
    await page.locator('[data-testid="evaluation-detail"]').waitFor();
    await shoot(page, `eval-${width}-admin-drawer`);
    await page.context().close();
    page = await open(admin, "admin/");
    await shoot(page, `eval-${width}-admin-overview`, { full: true });
    await page.context().close();
  });
}
