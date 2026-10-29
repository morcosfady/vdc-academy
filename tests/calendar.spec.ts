import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import fs from "node:fs";

// Run against the static export: BASE_URL=http://localhost:4191/vdc-academy/ (default is the config's baseURL).
// The sample events are generated from the build date, so these tests read the page instead of hard-coding dates.

const PLACEHOLDER = /\[[A-Z][A-Z0-9 \/]{1,40}\]|\[approval pending\]/;
const ctMonth = (d = new Date()) => new Intl.DateTimeFormat("en-US", { timeZone: "America/Chicago", month: "long", year: "numeric" }).format(d);

const nextDay = (k: string) => new Date(Date.parse(`${k}T00:00:00Z`) + 86400000).toISOString().slice(0, 10);

async function open(page: Page, query = "") {
  await page.goto(`calendar/${query}`);
  await expect(page.getByTestId("calendar")).toHaveAttribute("data-ready", "true");
}

// Step forward (up to 6 months) until the grid shows at least one event pill.
async function monthWithPills(page: Page) {
  for (let i = 0; i < 6; i++) {
    if ((await page.getByTestId("cal-pill").count()) > 0) return;
    await page.getByRole("button", { name: "Next month" }).click();
  }
}

test("page loads with the sample banner, the heading and a month grid with events", async ({ page }) => {
  await open(page);
  await expect(page.getByRole("heading", { level: 1, name: "What is on." })).toBeVisible();
  const banner = page.getByTestId("sample-banner");
  await expect(banner).toContainText("Sample schedule.");
  await expect(banner).toContainText("real dates are published here once confirmed");
  await expect(page.getByRole("grid")).toBeVisible();
  expect(await page.getByTestId("cal-pill").count()).toBeGreaterThan(0);
  await expect(page.getByTestId("next-card")).toHaveCount(3);
  await expect(page.getByText("C-100").first()).toBeVisible();
});

test("Today goes to the current month and rings today", async ({ page }) => {
  await open(page);
  await page.getByRole("button", { name: "Today" }).click();
  await expect(page.getByTestId("month-label")).toHaveText(ctMonth());
  await expect(page.locator('[role="gridcell"][data-today="true"]')).toHaveCount(1);
});

test("next and previous month change the month", async ({ page }) => {
  await open(page, "?m=2026-11");
  const label = page.getByTestId("month-label");
  await expect(label).toHaveText("November 2026");
  await page.getByRole("button", { name: "Next month" }).click();
  await expect(label).toHaveText("December 2026");
  await expect(page.getByRole("grid")).toHaveAttribute("aria-label", "December 2026, month grid");
  await page.getByRole("button", { name: "Previous month" }).click();
  await page.getByRole("button", { name: "Previous month" }).click();
  await expect(label).toHaveText("October 2026");
  await expect(page).toHaveURL(/m=2026-10/);
});

test("type filter changes which pills show (by tag letter)", async ({ page }) => {
  await open(page);
  await page.getByRole("button", { name: "Workshops" }).click();
  await expect(page.getByRole("button", { name: "Workshops" })).toHaveAttribute("aria-pressed", "true");
  await monthWithPills(page);
  const pills = page.getByTestId("cal-pill");
  expect(await pills.count()).toBeGreaterThan(0);
  const tags = await pills.getByTestId("pill-tag").allTextContents();
  expect(new Set(tags)).toEqual(new Set(["W"]));
  await page.getByRole("button", { name: "Deadlines" }).click();
  await monthWithPills(page);
  expect(new Set(await page.getByTestId("cal-pill").getByTestId("pill-tag").allTextContents())).toEqual(new Set(["D"]));
  await page.getByRole("button", { name: "All", exact: true }).click();
  await expect(page.getByRole("button", { name: "All", exact: true })).toHaveAttribute("aria-pressed", "true");
});

test("program filter keeps only that program", async ({ page }) => {
  await open(page);
  await page.getByLabel("Program", { exact: true }).selectOption("revit-mep");
  await monthWithPills(page);
  const programs = await page.getByTestId("cal-pill").evaluateAll((els) => els.map((e) => e.getAttribute("data-program")));
  expect(programs.length).toBeGreaterThan(0);
  expect(new Set(programs)).toEqual(new Set(["revit-mep"]));
  await expect(page).toHaveURL(/program=revit-mep/);
});

test("clicking an event opens the modal with the title and the Central Time range", async ({ page }) => {
  await open(page);
  await page.getByRole("button", { name: "Live sessions" }).click();
  await monthWithPills(page);
  const pill = page.getByTestId("cal-pill").first();
  const label = (await pill.getAttribute("aria-label")) ?? "";
  const title = label.split(", ").slice(2).join(", ");
  await pill.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("heading", { name: title })).toBeVisible();
  await expect(dialog.getByTestId("event-time")).toHaveText(/^\d{1,2}:\d{2} (AM|PM) to \d{1,2}:\d{2} (AM|PM) CT$/);
  await expect(dialog.getByRole("link", { name: /Revit|BIM|Navisworks|VDC/ }).first()).toBeVisible();
  await expect(dialog.getByRole("link", { name: "Ask a question" })).toBeVisible();
  const text = await dialog.innerText();
  expect(text).not.toMatch(PLACEHOLDER);
  expect(text).not.toContain("—");
});

test("Escape closes the modal and focus returns to the event", async ({ page }) => {
  await open(page);
  const pill = page.getByTestId("cal-pill").first();
  const label = await pill.getAttribute("aria-label");
  await pill.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => document.activeElement?.getAttribute("aria-label"))).toBe(label);
});

test("the dialog keeps focus inside while open", async ({ page }) => {
  await open(page);
  await page.getByTestId("cal-pill").first().click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press("Tab");
    expect(await dialog.evaluate((d) => d.contains(document.activeElement) || document.activeElement === document.body)).toBe(true);
  }
});

test("Add to calendar downloads an .ics with the event", async ({ page }) => {
  await open(page);
  await page.getByTestId("cal-pill").first().click();
  const dialog = page.getByRole("dialog");
  const title = (await dialog.getByRole("heading").first().textContent()) ?? "";
  await dialog.getByRole("button", { name: "Add to calendar" }).click();
  await expect(dialog.getByRole("link", { name: "Open in Google Calendar" })).toHaveAttribute("href", /^https:\/\/calendar\.google\.com\/calendar\/render\?action=TEMPLATE/);
  const [download] = await Promise.all([page.waitForEvent("download"), dialog.getByRole("button", { name: "Download .ics" }).click()]);
  expect(download.suggestedFilename()).toMatch(/\.ics$/);
  const ics = fs.readFileSync((await download.path())!, "utf8").replace(/\r\n /g, "");
  expect(ics).toContain("BEGIN:VCALENDAR");
  expect(ics).toContain("BEGIN:VEVENT");
  expect(ics.replace(/\\,/g, ",")).toContain(`SUMMARY:${title}`);
  expect(ics).toMatch(/DTSTART(;VALUE=DATE)?:\d{8}/);
  expect(ics).toContain("Sample schedule");
});

test("Download all as .ics follows the filter", async ({ page }) => {
  await open(page);
  await page.getByRole("button", { name: "Workshops" }).click();
  const button = page.getByTestId("download-all");
  const count = Number(/\((\d+)\)/.exec((await button.textContent()) ?? "")?.[1]);
  expect(count).toBeGreaterThan(1);
  const [download] = await Promise.all([page.waitForEvent("download"), button.click()]);
  const ics = fs.readFileSync((await download.path())!, "utf8");
  expect(ics.match(/BEGIN:VEVENT/g)?.length).toBe(count);
  expect(ics).toContain("CATEGORIES:Workshop");
  expect(ics).not.toContain("CATEGORIES:Deadline");
});

test("a day opens the day panel and the grid works from the keyboard", async ({ page }) => {
  await open(page);
  const stop = page.locator('[data-testid="cal-day"][tabindex="0"]');
  await expect(stop).toHaveCount(1);
  await stop.focus();
  const before = (await stop.getAttribute("data-day"))!;
  await page.keyboard.press("ArrowRight");
  await expect.poll(() => page.evaluate(() => document.activeElement?.getAttribute("data-day"))).toBe(nextDay(before));
  await page.keyboard.press("ArrowDown");
  await expect.poll(() => page.evaluate(() => document.activeElement?.getAttribute("data-testid"))).toBe("cal-day");
  // open a day that has events
  await page.getByTestId("cal-pill").first().evaluate((el) => el.closest('[role="gridcell"]')!.querySelector<HTMLElement>('[data-testid="cal-day"]')!.focus());
  await page.keyboard.press("Enter");
  const drawer = page.getByRole("dialog");
  await expect(drawer).toBeVisible();
  await expect(drawer.getByRole("button", { name: "Add to calendar" }).first()).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("the address query sets the month, filter and view", async ({ page }) => {
  await open(page, "?type=workshop&view=agenda");
  await expect(page.getByRole("button", { name: "Workshops" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("agenda")).toBeVisible();
  const kinds = await page.getByTestId("agenda-row").evaluateAll((els) => els.map((e) => e.getAttribute("data-type")));
  for (const k of kinds) expect(k).toBe("workshop");
  await open(page, "?m=2031-01");
  await expect(page.getByTestId("month-label")).toHaveText("January 2031");
  await expect(page.getByTestId("calendar-empty")).toBeVisible();
  await expect(page.getByTestId("calendar-empty")).toContainText("Nothing on this month.");
});

test("empty month: filters can be cleared and the next event is one click away", async ({ page }) => {
  await open(page, "?m=2026-01&type=cohort");
  await expect(page.getByTestId("calendar-empty")).toBeVisible();
  await page.getByRole("button", { name: "Go to the next event" }).click();
  await expect(page.getByTestId("calendar-empty")).toHaveCount(0);
  await expect(page.getByTestId("cal-pill").first()).toBeVisible();
});

test.describe("phone", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("agenda is the default view at 390", async ({ page }) => {
    await open(page);
    await expect(page.getByTestId("agenda")).toBeVisible();
    await expect(page.getByRole("radio", { name: "Agenda" })).toHaveAttribute("aria-checked", "true");
    await expect(page.getByRole("grid")).toHaveCount(0);
    expect(await page.getByTestId("agenda-row").count()).toBeGreaterThan(0);
    await page.getByRole("radio", { name: "Month" }).click();
    await expect(page.getByRole("grid")).toBeVisible();
  });

  for (const width of [360, 390]) {
    test(`no horizontal overflow at ${width} in agenda, month grid and with the modal open`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await open(page);
      const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(await overflow()).toBeLessThanOrEqual(0);
      await page.getByRole("radio", { name: "Month" }).click();
      await expect(page.getByRole("grid")).toBeVisible();
      expect(await overflow()).toBeLessThanOrEqual(0);
      await page.locator('[data-testid="cal-day"]:not([aria-label$="no events"])').first().click();
      await expect(page.getByRole("dialog")).toBeVisible();
      expect(await overflow()).toBeLessThanOrEqual(0);
    });
  }
});

test("no bracket placeholders or em dashes on the page", async ({ page }) => {
  await open(page);
  for (const view of ["Month", "Agenda"]) {
    await page.getByRole("radio", { name: view }).click();
    const text = await page.locator("body").innerText();
    expect(text).not.toMatch(PLACEHOLDER);
    expect(text).not.toContain("—");
  }
});

test("search engines: noindex while the dates are a sample, and no Event data", async ({ page }) => {
  const html = await (await page.request.get("calendar/")).text();
  expect(html).toMatch(/<meta name="robots" content="[^"]*noindex/);
  expect(html).not.toContain('"@type":"Event"');
});

test("axe finds nothing serious on the month view, the agenda and an open dialog", async ({ page }) => {
  const serious = async () => {
    const r = await new AxeBuilder({ page }).analyze();
    return r.violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`);
  };
  await open(page);
  await page.waitForTimeout(1500);
  expect(await serious()).toEqual([]);
  await page.getByRole("radio", { name: "Agenda" }).click();
  await page.mouse.move(0, 0);
  await page.waitForTimeout(800);
  expect(await serious()).toEqual([]);
  await page.getByRole("radio", { name: "Month" }).click();
  await page.getByTestId("cal-pill").first().click();
  await page.getByRole("dialog").getByRole("button", { name: "Add to calendar" }).click();
  await page.waitForTimeout(800);
  expect(await serious()).toEqual([]);
});

test("axe on a phone-sized agenda", async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  await open(page);
  await page.waitForTimeout(1500);
  const r = await new AxeBuilder({ page }).analyze();
  expect(r.violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => v.id)).toEqual([]);
  await ctx.close();
});

test("the student dashboard shows an Upcoming card in the demo", async ({ page }) => {
  await page.goto("demo/");
  await page.getByRole("button", { name: "Open the dashboard" }).click();
  await page.waitForURL(/\/account\/$/);
  const card = page.getByTestId("upcoming-card");
  await expect(card).toBeVisible();
  await expect(card.locator("li")).toHaveCount(3);
  await card.getByRole("link", { name: "Open the calendar" }).click();
  await page.waitForURL(/\/calendar\//);
});

test("the demo has a Calendar card, and the menu and footer link to the calendar", async ({ page }) => {
  await page.goto("demo/");
  await expect(page.getByRole("button", { name: "Open the calendar" })).toBeVisible();
  await page.goto("");
  await expect(page.locator("footer").getByRole("link", { name: "Calendar" })).toHaveAttribute("href", /\/calendar\/$/);
});
