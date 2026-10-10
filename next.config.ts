import type { NextConfig } from "next";

// GitHub Pages build (static export under /vdc-academy). Local dev and Vercel are unaffected.
const pages = process.env.GITHUB_PAGES === "true";

const nextConfig: NextConfig = pages
  ? { output: "export", basePath: "/vdc-academy", assetPrefix: "/vdc-academy/", trailingSlash: true, images: { unoptimized: true } }
  : {};

export default nextConfig;
