// Prints a one-line summary for every Lighthouse JSON in a folder. Usage: node scripts/lh-summary.mjs docs/audit/v2
import fs from "node:fs";

const dir = process.argv[2] ?? "docs/audit/v2";
for (const f of fs.readdirSync(dir).filter((x) => x.startsWith("lh-") && x.endsWith(".json"))) {
  const j = JSON.parse(fs.readFileSync(`${dir}/${f}`, "utf8"));
  const cats = Object.entries(j.categories).map(([k, v]) => `${k.slice(0, 4)}:${Math.round(v.score * 100)}`).join(" ");
  const a = j.audits;
  console.log(f.padEnd(40), cats, "LCP", a["largest-contentful-paint"].displayValue, "TBT", a["total-blocking-time"].displayValue, "CLS", a["cumulative-layout-shift"].displayValue);
}
