import type { NextConfig } from "next";

// Static export for GitHub Pages (GITHUB_PAGES=true). The base path follows NEXT_PUBLIC_BASE_PATH: "/vdc-academy" on
// morcosfady.github.io (the default), "" or "/" on a custom domain (docs/CUSTOM-DOMAIN.md). Local dev and Vercel are unaffected.
const pages = process.env.GITHUB_PAGES === "true";

const raw = process.env.NEXT_PUBLIC_BASE_PATH;
const basePath = pages ? (raw === undefined ? "/vdc-academy" : raw.replace(/\/$/, "")) : "";
process.env.NEXT_PUBLIC_BASE_PATH = basePath;

// Calendar sample dates (content/calendar.ts): the first Monday after the build, fixed here once so the server render
// and the browser read the same value. Set NEXT_PUBLIC_CALENDAR_BASE=YYYY-MM-DD to pin it.
if (!process.env.NEXT_PUBLIC_CALENDAR_BASE) {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: "America/Chicago", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date()).map((x) => [x.type, x.value]));
  const t = new Date(Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day)));
  t.setUTCDate(t.getUTCDate() + (((8 - t.getUTCDay()) % 7) || 7));
  process.env.NEXT_PUBLIC_CALENDAR_BASE = t.toISOString().slice(0, 10);
}

const nextConfig: NextConfig = pages
  ? {
      output: "export",
      ...(basePath ? { basePath, assetPrefix: `${basePath}/` } : {}),
      trailingSlash: true,
      images: { unoptimized: true },
      // experimental.inlineCss was measured (v8) and rejected: Next repeats the CSS in the page data, so the home HTML
      // grew from 18 KB to 77 KB gzipped and blocking time went up. Two cached stylesheet links are cheaper.
    }
  : {};

export default nextConfig;
