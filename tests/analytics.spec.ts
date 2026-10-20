import { expect, test, type Page } from "@playwright/test";
import { emptyState, loginAs, mockSupabase, seedUser } from "./helpers/mockSupabase";

// Analytics (lib/analytics.ts, docs/ANALYTICS.md). The test build has no NEXT_PUBLIC_ANALYTICS_* vars, so no provider
// script may load. With localStorage["vdc-track-debug"] = "1" the cleaned events land on window.__vdcEvents even
// though nothing is sent, which lets us check what would be sent: the right events, and never personal data.

const year = String(new Date().getFullYear());
type Entry = { event: string; props: Record<string, string | number | boolean> };

const debug = (page: Page) =>
  page.addInitScript(() => {
    try {
      localStorage.setItem("vdc-track-debug", "1");
    } catch {}
  });

const events = (page: Page) => page.evaluate(() => (window as unknown as { __vdcEvents?: Entry[] }).__vdcEvents ?? []);

function seeded() {
  const state = emptyState();
  const id = seedUser(state, "student@example.com", "password123", { full_name: "Seeded Student", current_status: "fresh_grad" });
  Object.assign(state.tables.profiles.find((p) => p.id === id)!, { phone: "+1 555 000 1111", country: "USA", city: "Dallas", degree: "Architecture", university: "UT Arlington", graduation_year: Number(year) });
  return { state, id };
}

test("unconfigured build: no analytics script on the home page", async ({ page }) => {
  await page.goto("");
  await page.waitForLoadState("networkidle");
  await expect(page.locator("#vdc-analytics, script[data-website-id], script[data-domain], script[src*='umami'], script[src*='plausible']")).toHaveCount(0);
  const csp = await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute("content");
  expect(csp).not.toMatch(/umami|plausible/);
});

test("apply: started and two completed steps are recorded, with no personal data", async ({ page }) => {
  const { state, id } = seeded();
  await debug(page);
  await mockSupabase(page, state);
  await loginAs(page, state, id);
  await page.goto("apply/?mock=1");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1500); // hydrate before the first click
  await expect(page.getByText("STEP 01 / 05")).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText("Your education.")).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText("Experience and goals.")).toBeVisible();

  await expect.poll(async () => (await events(page)).filter((e) => e.event === "apply_step_completed").length).toBe(2);
  const log = await events(page);
  expect(log.filter((e) => e.event === "apply_started")).toEqual([{ event: "apply_started", props: {} }]);
  expect(log.filter((e) => e.event === "apply_step_completed").map((e) => e.props)).toEqual([{ step: 1 }, { step: 2 }]);
  // nothing but whitelisted props: no email, no name, no phone, no city
  const values = log.flatMap((e) => Object.values(e.props).map(String));
  for (const v of values) {
    expect(v).not.toContain("@");
    expect(v).not.toMatch(/Seeded|Student|Dallas|555/);
  }
  expect(await page.locator("#vdc-analytics").count()).toBe(0);
});

test("a program page records program_viewed with its slug only", async ({ page }) => {
  await debug(page);
  await page.goto("programs/revit-mep/");
  await page.waitForLoadState("networkidle");
  await expect.poll(async () => (await events(page)).filter((e) => e.event === "program_viewed")).toEqual([{ event: "program_viewed", props: { slug: "revit-mep" } }]);
});
