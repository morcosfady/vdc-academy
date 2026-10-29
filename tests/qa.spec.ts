import { expect, test, type Browser, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { emptyState, loginAs, mockSupabase, seedUser } from "./helpers/mockSupabase";
import { fillStudent } from "./helpers/register";

// v8 cross-browser QA (runs in every project of playwright.config.ts: Chromium, Firefox, WebKit).
// Layout at four widths, the modal dialog, file and select inputs, reduced motion, Comfort mode, keyboard-only use
// of apply, login, signup, dashboard and the admin table, and every page with JavaScript turned off.

const BASE = process.env.BASE_URL ?? "http://localhost:4173/vdc-academy/";
const WIDTHS = [1440, 1024, 390, 360];
const PAGES = ["", "programs/", "programs/revit-mep/", "pricing/", "fresh-graduates/", "apply/?preview=1", "login/", "signup/", "demo/"];

async function ctxAt(browser: Browser, width: number, extra: Parameters<Browser["newContext"]>[0] = {}) {
  return browser.newContext({ baseURL: BASE, viewport: { width, height: width > 800 ? 900 : 780 }, ...extra });
}

for (const w of WIDTHS) {
  test(`layout at ${w}: no horizontal overflow, headline visible`, async ({ browser }) => {
    const ctx = await ctxAt(browser, w);
    const page = await ctx.newPage();
    for (const r of PAGES) {
      await page.goto(r, { waitUntil: "load" });
      await page.waitForTimeout(300);
      const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(over, `horizontal overflow on /${r} at ${w}`).toBeLessThanOrEqual(1);
      await expect(page.locator("h1").first(), `h1 on /${r}`).toBeVisible();
    }
    await ctx.close();
  });
}

test("fresh graduate discount is a static 40% from first paint, on every engine", async ({ browser }) => {
  for (const reducedMotion of ["no-preference", "reduce"] as const) {
    const ctx = await browser.newContext({ baseURL: BASE, reducedMotion });
    const page = await ctx.newPage();
    for (const r of ["fresh-graduates/", ""]) {
      // sample the visible number many times while the page loads and scrolls: it must never read anything but 40
      const seen = new Set<string>();
      await page.goto(r, { waitUntil: "commit" });
      for (let i = 0; i < 12; i++) {
        const t = await page.locator("[data-discount]").first().textContent({ timeout: 10000 });
        seen.add((t ?? "").replace("%", "").trim());
        await page.mouse.wheel(0, 400);
        await page.waitForTimeout(80);
      }
      expect([...seen], `discount text on /${r}`).toEqual(["40"]);
      expect(await page.locator("[data-countup]").count()).toBe(0);
    }
    await ctx.close();
  }
});

test("quiz modal opens as a dialog, traps focus and closes with Escape", async ({ page }) => {
  await page.goto("fresh-graduates/");
  await page.waitForLoadState("networkidle");
  const open = page.getByRole("button", { name: /qualify/i }).first();
  await open.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  for (let i = 0; i < 8; i++) await page.keyboard.press("Tab");
  expect(await page.evaluate(() => !!document.activeElement?.closest("dialog, [role=dialog]"))).toBe(true);
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});

test("apply preview: selects and the file input work", async ({ page }) => {
  await page.goto("apply/?preview=1");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(800);
  await page.getByLabel(/Full name/).fill("Sample Student 99");
  await page.getByLabel(/^Email/).fill("student99@example.com");
  await page.getByLabel(/Phone/).fill("+1 555 010 9999");
  await page.getByLabel(/^Country/).fill("USA");
  await page.getByLabel(/^City/).fill("Fort Worth");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText("Your education.")).toBeVisible();
  await page.getByLabel(/Current status/).selectOption("Fresh graduate");
  await expect(page.getByLabel(/Current status/)).toHaveValue("Fresh graduate");
  await page.getByLabel(/Graduation year/).selectOption(String(new Date().getFullYear()));
  await page.getByLabel(/Proof for your discount/).setInputFiles({ name: "degree.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4\n%%EOF\n") });
  await expect(page.getByText("degree.pdf")).toBeVisible();
});

test("Comfort mode and reduced motion leave the page static and readable", async ({ browser }) => {
  const ctx = await browser.newContext({ baseURL: BASE, reducedMotion: "reduce" });
  const page = await ctx.newPage();
  await page.goto("");
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Comfort mode").check();
  await expect(page.locator("html")).toHaveClass(/comfort/);
  await page.reload();
  await expect(page.locator("html")).toHaveClass(/comfort/);
  const running = await page.evaluate(() => document.getAnimations().filter((a) => a.playState === "running" && (a.effect as KeyframeEffect | null)?.getComputedTiming().iterations === Infinity).length);
  expect(running, "no endless animations in Comfort mode with reduced motion").toBe(0);
  await expect(page.locator("h1").first()).toBeVisible();
  await ctx.close();
});

// ---- keyboard only

async function tabTo(page: Page, match: (el: { tag: string; name: string; type: string; text: string }) => boolean, max = 60) {
  for (let i = 0; i < max; i++) {
    await page.keyboard.press("Tab");
    const el = await page.evaluate(() => {
      const a = document.activeElement as HTMLElement | null;
      return { tag: a?.tagName.toLowerCase() ?? "", name: a?.getAttribute("name") ?? "", type: a?.getAttribute("type") ?? "", text: (a?.getAttribute("aria-label") || a?.textContent || "").trim().slice(0, 60) };
    });
    if (match(el)) return el;
  }
  throw new Error("element not reachable with Tab");
}

async function focusVisible(page: Page) {
  await page.waitForTimeout(350); // focus styles fade in over 200 ms
  return page.evaluate(() => {
    const a = document.activeElement as HTMLElement | null;
    if (!a) return false;
    const s = getComputedStyle(a);
    if ((s.outlineStyle !== "none" && parseFloat(s.outlineWidth) > 0) || s.boxShadow !== "none") return true;
    // design-system fields: the border turns to the accent on focus (components/ds/Forms.tsx `focus:border-accent`)
    const probe = document.createElement("span");
    probe.style.color = "var(--accent)";
    (a.parentElement ?? document.body).appendChild(probe);
    const accentRgb = getComputedStyle(probe).color;
    probe.remove();
    return parseFloat(s.borderTopWidth) > 0 && s.borderTopColor === accentRgb;
  });
}

test("keyboard: log in reaches email, password and the button, focus is visible, Enter submits", async ({ page }) => {
  await mockSupabase(page);
  await page.goto("login/?mock=1");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(600);
  await tabTo(page, (e) => e.name === "email");
  expect(await focusVisible(page)).toBe(true);
  await page.keyboard.type("nobody@example.com");
  await tabTo(page, (e) => e.name === "password", 6);
  await page.keyboard.type("wrong-password");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("alert").or(page.getByText(/not right|invalid|incorrect|check/i)).first()).toBeVisible();
});

test("keyboard: sign up picks a role, fills the account and checks a consent with the keyboard only", async ({ page }) => {
  await mockSupabase(page);
  await page.goto("signup/?mock=1");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(600);
  await tabTo(page, (e) => e.name === "account_type");
  await page.keyboard.press("Space");
  await expect(page.locator('input[name="account_type"][value="student"]')).toBeChecked();
  await page.keyboard.press("Enter");
  await expect(page.getByText(/STEP 02 \/ 04/)).toBeVisible();
  await tabTo(page, (e) => e.name === "email");
  expect(await focusVisible(page)).toBe(true);
  await page.keyboard.type("student90@example.com");
  await tabTo(page, (e) => e.name === "password", 6);
  await page.keyboard.type("Str0ng-pass1");
  await tabTo(page, (e) => e.name === "confirm", 6);
  await page.keyboard.type("Str0ng-pass1");
  await page.keyboard.press("Enter");
  await expect(page.getByText(/· Details/)).toBeVisible();
  await fillStudent(page);
  await page.getByRole("button", { name: "Continue" }).click();
  await tabTo(page, (e) => e.name === "consent_terms", 40);
  await page.keyboard.press("Space");
  await expect(page.locator('input[name="consent_terms"]')).toBeChecked();
  expect(await focusVisible(page)).toBe(true);
});

test("keyboard: apply moves to step 2 with Tab and Enter only", async ({ page }) => {
  const state = emptyState();
  const id = seedUser(state, "student42@example.com", "demo-password-1", { full_name: "Sample Student 42" });
  Object.assign(state.tables.profiles.find((p) => p.id === id)!, { phone: "+1 555 010 4242", country: "USA", city: "Dallas" });
  await mockSupabase(page, state);
  await loginAs(page, state, id);
  await page.goto("apply/?mock=1");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1200);
  await tabTo(page, (e) => e.tag === "button" && /^Continue/.test(e.text), 80);
  expect(await focusVisible(page)).toBe(true);
  await page.keyboard.press("Enter");
  await expect(page.getByText("Your education.")).toBeVisible();
});

test("keyboard: dashboard and admin table are reachable and open with Enter", async ({ page, browserName }) => {
  // Safari's default (and Playwright's WebKit) moves Tab between form controls only; links take Option+Tab, which
  // is an OS shortcut on Windows. Chromium and Firefox cover link navigation; WebKit runs the form-field tests above.
  test.skip(browserName === "webkit", "Safari does not Tab to links by default");
  const state = emptyState();
  const admin = seedUser(state, "admin@example.com", "demo-password-1", { full_name: "Sample Admin" }, "admin");
  const s1 = seedUser(state, "student01@example.com", "demo-password-1", { full_name: "Sample Student 01" });
  state.tables.applications.push({ id: "aaaaaaaa-0000-4000-8000-000000000001", user_id: s1, status: "submitted", created_at: new Date().toISOString(), updated_at: new Date().toISOString(), submitted_at: new Date().toISOString(), full_name: "Sample Student 01", email: "student01@example.com", programs: ["revit-mep"], discount_type: null, discount_status: "none", discount_percent: 0, country: "USA" });
  // the student dashboard is checked as a student (the academy team is sent to /admin/ from /account/)
  const sp = await page.context().newPage();
  await sp.bringToFront();
  await mockSupabase(sp, state);
  await loginAs(sp, state, s1);
  await sp.goto("account/?mock=1");
  await sp.waitForLoadState("networkidle");
  await sp.waitForTimeout(800);
  await tabTo(sp, (e) => e.tag === "a" && /Edit profile|View/.test(e.text));
  expect(await focusVisible(sp)).toBe(true);
  await sp.close();
  await page.bringToFront();
  await mockSupabase(page, state);
  await loginAs(page, state, admin);
  await page.goto("admin/applications/?mock=1");
  await page.locator('[data-testid="app-row"]').first().waitFor();
  await tabTo(page, (e) => e.tag === "a" && /Sample Student 01|Open/.test(e.text), 80);
  expect(await focusVisible(page)).toBe(true);
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/admin\/application\/\?id=/);
});

// ---- JavaScript off

test("JavaScript off: every page is readable and forms say they need JavaScript", async ({ browser }) => {
  const ctx = await browser.newContext({ baseURL: BASE, javaScriptEnabled: false });
  const page = await ctx.newPage();
  const routes = ["", "programs/", "programs/revit-mep/", "pricing/", "fresh-graduates/", "learning-path/", "for-companies/", "about/", "contact/", "faq/", "privacy/", "terms/", "accessibility/", "apply/", "login/", "signup/", "account/", "demo/"];
  for (const r of routes) {
    await page.goto(r);
    const h1 = page.locator("h1").first();
    if (r === "account/" || r === "apply/") {
      // client screens: the skeleton says why it is empty
      await expect(page.getByText(/needs JavaScript/).first(), `noscript note on /${r}`).toBeVisible();
      continue;
    }
    await expect(h1, `h1 on /${r}`).toBeVisible();
    const words = (await page.locator("main").innerText()).split(/\s+/).length;
    expect(words, `readable text on /${r}`).toBeGreaterThan(30);
    const forms = await page.locator("main form").count();
    if (forms > 0) {
      const msg = await page.locator("main form").first().evaluate((f) => getComputedStyle(f, "::before").content);
      expect(msg, `form message on /${r}`).toContain("needs JavaScript");
      // the fields are hidden, so nothing can be submitted into the URL
      expect(await page.locator("main form input:visible").count()).toBe(0);
    }
  }
  await ctx.close();
});

// ---- axe on the pages tests/site.spec.ts does not scan, plus the signed-in screens through the demo

const serious = async (page: Page) => (await new AxeBuilder({ page }).analyze()).violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => `${v.id} (${v.nodes.length})`);

for (const r of ["learning-path/", "for-companies/", "about/", "privacy/", "terms/", "accessibility/", "instructors/", "student-work/", "apply/success/", "nothing-here/", "login/", "signup/", "demo/", "content-status/"]) {
  test(`axe: no serious or critical issues on /${r}`, async ({ page }) => {
    await page.goto(r);
    await page.waitForTimeout(1500);
    expect(await serious(page)).toEqual([]);
  });
}

test("axe: no serious or critical issues on the dashboard, profile, application and the admin screens (demo)", async ({ page }) => {
  const open = async (card: string, url: RegExp) => {
    await page.goto("demo/");
    await page.getByRole("button", { name: card }).click();
    await page.waitForURL(url);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(800);
  };
  await open("Open the dashboard", /account\/$/);
  expect(await serious(page), "dashboard").toEqual([]);
  await open("Open the profile", /profile/);
  expect(await serious(page), "profile").toEqual([]);
  await page.goto("account/application/?id=aaaaaaaa-0000-4000-8000-000000000001");
  await page.waitForTimeout(1200);
  expect(await serious(page), "application").toEqual([]);
  await open("Open the admin", /admin\/$/);
  expect(await serious(page), "admin overview").toEqual([]);
  await page.goto("admin/applications/");
  await page.locator('[data-testid="app-row"]').first().waitFor();
  expect(await serious(page), "admin table").toEqual([]);
  await open("Open the application", /admin\/application\//);
  expect(await serious(page), "admin detail").toEqual([]);
  await page.goto("admin/leads/");
  await page.waitForTimeout(1200);
  expect(await serious(page), "admin leads").toEqual([]);
  await page.goto("admin/instructors/");
  await page.locator('[data-testid="instructor-card"]').first().waitFor();
  expect(await serious(page), "admin instructors").toEqual([]);
  await page.goto("admin/assignments/");
  await page.locator('[data-testid="instructor-group"]').first().waitFor();
  expect(await serious(page), "admin assignments").toEqual([]);
});
