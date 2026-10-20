import type { MetadataRoute } from "next";
import { PRIVATE_ROUTES, SITE_URL } from "@/config/site";

export const dynamic = "force-static";

// Private screens and tools are disallowed here and carry `robots: noindex` in their page metadata too.
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", allow: "/", disallow: PRIVATE_ROUTES }, sitemap: `${SITE_URL}/sitemap.xml`, host: SITE_URL };
}
