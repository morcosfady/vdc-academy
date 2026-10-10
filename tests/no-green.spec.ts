import { expect, test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

// The brand is ink, slate and pale blue with a steel blue accent. No green, mint or teal-green anywhere.
// Brand colors that sit in the cyan range are allowed explicitly.
const ALLOWED = new Set(["#365b62", "#0a1d23", "#000e12", "#deeffd", "#a9bcc4", "#3d5359", "#10272f", "#050f14", "#07181d", "#102a31", "#0d2329", "#f3f8fc", "#e6f0f8", "#f2f7fb", "#cfe3f5", "#b4c6ce", "#8ba2ab", "#06141a", "#eaf2f7", "#eef5fb", "#e3edf6", "#52666d", "#f4f8fc"]);
const ROOTS = ["app", "components", "lib", "content", "config", "scripts/make-images.mjs"];
const EXT = /\.(tsx?|css|mjs|svg)$/;

function files(p: string): string[] {
  if (!fs.existsSync(p)) return [];
  if (fs.statSync(p).isFile()) return [p];
  return fs.readdirSync(p).flatMap((f) => files(path.join(p, f)));
}

function hsl(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, d = max - min;
  if (d === 0) return { h: 0, s: 0, l };
  const s = d / (1 - Math.abs(2 * l - 1));
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { h: (h * 60 + 360) % 360, s, l };
}

test("no green, mint or teal-green colors in the source", () => {
  const bad: string[] = [];
  for (const f of ROOTS.flatMap(files).filter((f) => EXT.test(f))) {
    const src = fs.readFileSync(f, "utf8");
    for (const m of src.matchAll(/#[0-9a-fA-F]{6}\b/g)) {
      const hex = m[0].toLowerCase();
      if (ALLOWED.has(hex)) continue;
      const { h, s, l } = hsl(hex);
      if (h >= 75 && h <= 200 && s > 0.2 && l > 0.08 && l < 0.95) bad.push(`${f} ${hex}`);
    }
    for (const m of src.matchAll(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/g)) {
      const hex = "#" + [m[1], m[2], m[3]].map((n) => Number(n).toString(16).padStart(2, "0")).join("");
      const { h, s, l } = hsl(hex);
      if (!ALLOWED.has(hex) && h >= 75 && h <= 200 && s > 0.2 && l > 0.08 && l < 0.95) bad.push(`${f} ${m[0]})`);
    }
  }
  expect(bad).toEqual([]);
});
