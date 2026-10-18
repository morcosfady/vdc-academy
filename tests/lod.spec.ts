import { expect, test } from "@playwright/test";
import sharp from "sharp";

// Every level of development must change the model visibly. The test screenshots the explorer model at each LOD
// (software WebGL, forced on) and fails if two consecutive levels differ by less than 0.4% of the pixels.
async function diffRatio(a: Buffer, b: Buffer) {
  const [x, y] = await Promise.all([sharp(a).raw().toBuffer({ resolveWithObject: true }), sharp(b).raw().toBuffer({ resolveWithObject: true })]);
  const n = Math.min(x.data.length, y.data.length);
  let changed = 0;
  for (let i = 0; i < n; i += 4) {
    if (Math.abs(x.data[i] - y.data[i]) + Math.abs(x.data[i + 1] - y.data[i + 1]) + Math.abs(x.data[i + 2] - y.data[i + 2]) > 40) changed++;
  }
  return changed / (n / 4);
}

test("each LOD looks different from the previous one", async ({ page }) => {
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("?gl=force");
  await page.waitForTimeout(6000);
  await page.evaluate(() => document.getElementById("explorer")?.scrollIntoView());
  await page.waitForTimeout(2500);
  const model = page.locator("#explorer [role=img]").first();
  const shots: Record<string, Buffer> = {};
  for (const lod of ["100", "200", "300", "350", "400", "500"]) {
    await page.getByRole("radio", { name: lod, exact: true }).click();
    await page.waitForTimeout(1500);
    shots[lod] = await model.screenshot({ type: "png" });
  }
  const levels = Object.keys(shots);
  for (let i = 1; i < levels.length; i++) {
    const r = await diffRatio(shots[levels[i - 1]], shots[levels[i]]);
    expect(r, `LOD ${levels[i - 1]} and ${levels[i]} look the same (${(r * 100).toFixed(2)}% changed)`).toBeGreaterThan(0.004);
  }
});
