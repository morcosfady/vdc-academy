import { expect, test } from "@playwright/test";
import { SITE_URL } from "../config/site";
import { confirmed } from "../content/site";

// SEO and sharing checks on the static export. SITE_URL must match the build (NEXT_PUBLIC_SITE_URL, default github.io).
type Ld = Record<string, unknown>;

const pages: { path: string; types: string[] }[] = [
  { path: "/", types: ["EducationalOrganization"] },
  { path: "/programs/", types: ["EducationalOrganization", "BreadcrumbList", "ItemList"] },
  { path: "/programs/revit-mep/", types: ["EducationalOrganization", "BreadcrumbList", "Course"] },
  { path: "/faq/", types: ["EducationalOrganization", "BreadcrumbList", "FAQPage"] },
  { path: "/pricing/", types: ["EducationalOrganization", "BreadcrumbList"] },
  { path: "/fresh-graduates/", types: ["EducationalOrganization", "BreadcrumbList"] },
  { path: "/apply/", types: ["EducationalOrganization", "BreadcrumbList"] },
];

// Every Course object anywhere in a JSON-LD tree (the /programs ItemList nests them).
function courses(x: unknown, out: Ld[] = []): Ld[] {
  if (Array.isArray(x)) x.forEach((y) => courses(y, out));
  else if (x && typeof x === "object") {
    const o = x as Ld;
    if (o["@type"] === "Course") out.push(o);
    Object.values(o).forEach((y) => courses(y, out));
  }
  return out;
}

for (const { path, types } of pages) {
  test(`seo tags and structured data on ${path}`, async ({ page }) => {
    await page.goto(path.slice(1));

    const title = await page.title();
    expect(title.length).toBeGreaterThan(0);
    expect(title.length).toBeLessThanOrEqual(60);

    const description = (await page.locator('meta[name="description"]').getAttribute("content")) ?? "";
    expect(description.length).toBeGreaterThanOrEqual(50);
    expect(description.length).toBeLessThanOrEqual(155);

    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `${SITE_URL}${path}`);
    await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute("content", "summary_large_image");

    // og:image is absolute, under SITE_URL, and the file exists in the export.
    const og = (await page.locator('meta[property="og:image"]').first().getAttribute("content")) ?? "";
    expect(og).toMatch(/^https?:\/\//);
    expect(og.startsWith(`${SITE_URL}/og/`)).toBe(true);
    const res = await page.request.get(og.slice(SITE_URL.length + 1));
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("image/png");

    const blocks = (await page.locator('script[type="application/ld+json"]').allTextContents()).map((t) => JSON.parse(t) as Ld);
    const found = blocks.map((b) => b["@type"]);
    for (const t of types) expect(found).toContain(t);
    if (path === "/") expect(found).not.toContain("BreadcrumbList");

    // No offers until the owner confirms prices.
    if (!confirmed.prices) for (const c of courses(blocks)) expect(c).not.toHaveProperty("offers");
    if (path.startsWith("/programs/")) expect(courses(blocks).length).toBeGreaterThan(0);
  });
}

for (const path of ["login/", "account/", "admin/", "demo/", "styleguide/", "poster/"]) {
  test(`noindex on /${path}`, async ({ page }) => {
    // Raw HTML, so client redirects on private screens do not matter.
    const html = await (await page.request.get(path)).text();
    expect(html).toMatch(/<meta name="robots" content="[^"]*noindex/);
  });
}

test("robots.txt disallows private routes", async ({ page }) => {
  const txt = await (await page.request.get("robots.txt")).text();
  for (const r of ["/account/", "/admin/", "/demo/"]) expect(txt).toContain(`Disallow: ${r}`);
});

test("sitemap.xml lists no private routes", async ({ page }) => {
  const xml = await (await page.request.get("sitemap.xml")).text();
  expect(xml).toContain(`${SITE_URL}/programs/`);
  for (const r of ["/account/", "/admin/", "/demo/", "/login/"]) expect(xml).not.toContain(`${SITE_URL}${r}`);
});
