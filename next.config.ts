import type { NextConfig } from "next";

// Static export for GitHub Pages (GITHUB_PAGES=true). The base path follows NEXT_PUBLIC_BASE_PATH: "/vdc-academy" on
// morcosfady.github.io (the default), "" or "/" on a custom domain (docs/CUSTOM-DOMAIN.md). Local dev and Vercel are unaffected.
const pages = process.env.GITHUB_PAGES === "true";

const raw = process.env.NEXT_PUBLIC_BASE_PATH;
const basePath = pages ? (raw === undefined ? "/vdc-academy" : raw.replace(/\/$/, "")) : "";
process.env.NEXT_PUBLIC_BASE_PATH = basePath;

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
