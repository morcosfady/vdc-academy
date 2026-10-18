import { expect, test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

// v5 removed the glows, gradient bands, glass and the wide-tracked Michroma labels. None may come back.
const BANNED = [/\bband-both\b/, /\bglow-layer\b/, /\bBlueprintLayer\b/, /\bdisplay-(xl|lg|md)\b/, /className="label\b/, /\bkenburns\b/, /\bdrift\b/, /backdrop-blur/, /—/];
const ALLOW = new Set(["app/globals.css", "app/motion.css"]);
const ROOTS = ["app", "components", "content", "config", "lib"];
const EXT = /\.(tsx?|css)$/;

function files(p: string): string[] {
  if (!fs.existsSync(p)) return [];
  if (fs.statSync(p).isFile()) return [p];
  return fs.readdirSync(p).flatMap((f) => files(path.join(p, f)));
}

test("no old tokens, glows, glass or em dashes in the source", () => {
  const bad: string[] = [];
  for (const f of ROOTS.flatMap(files).filter((f) => EXT.test(f))) {
    const rel = f.replace(/\\/g, "/");
    if (ALLOW.has(rel)) continue;
    const src = fs.readFileSync(f, "utf8");
    for (const re of BANNED) if (re.test(src)) bad.push(`${rel}: ${re}`);
  }
  expect(bad).toEqual([]);
});
