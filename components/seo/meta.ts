import type { Metadata } from "next";
import { SITE_URL } from "@/config/site";

// Page metadata in one place: canonical, Open Graph and Twitter. URLs are built from SITE_URL so a custom domain
// only needs NEXT_PUBLIC_SITE_URL. OG images live in public/og (scripts/og.mjs).
export const ogImage = (name: string, alt: string) => ({ url: `${SITE_URL}/og/${name}.png`, width: 1200, height: 630, alt });

export function pageMeta({
  title,
  description,
  path,
  og = "home",
  ogAlt,
  absoluteTitle = false,
  robots,
}: {
  title: string;
  description: string;
  path: string; // "/" or "/programs/" with a trailing slash
  og?: string;
  ogAlt?: string;
  absoluteTitle?: boolean;
  robots?: Metadata["robots"];
}): Metadata {
  const full = absoluteTitle ? title : `${title} | VDC Academy`;
  const image = ogImage(og, ogAlt ?? full);
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: { canonical: `${SITE_URL}${path}` },
    openGraph: { type: "website", siteName: "VDC Academy", locale: "en_US", url: `${SITE_URL}${path}`, title: full, description, images: [image] },
    twitter: { card: "summary_large_image", title: full, description, images: [image.url] },
    ...(robots ? { robots } : {}),
  };
}
