import type { MetadataRoute } from "next";
import { programs } from "@/content/programs";
import { hasInstructors, hasStudentWork } from "@/content/site";
import { PRIVATE_ROUTES, SITE_URL } from "@/config/site";

export const dynamic = "force-static";

// Public routes only. Anything in PRIVATE_ROUTES (account, admin, demo, tools) never appears here.
export default function sitemap(): MetadataRoute.Sitemap {
  const pages = ["", "programs", "pricing", "fresh-graduates", "learning-path", "for-companies", "about", "contact", "faq", "apply", "privacy", "terms", "accessibility"];
  if (hasInstructors()) pages.push("instructors");
  if (hasStudentWork()) pages.push("student-work");
  const urls = [...pages.map((p) => `/${p}${p ? "/" : ""}`), ...programs.map((p) => `/programs/${p.slug}/`)].filter((u) => !PRIVATE_ROUTES.some((r) => u.startsWith(r)));
  const weight = (u: string) => (u === "/" ? 1 : u.startsWith("/programs/") || u === "/apply/" || u === "/fresh-graduates/" ? 0.8 : /privacy|terms|accessibility/.test(u) ? 0.3 : 0.6);
  return urls.map((u) => ({ url: `${SITE_URL}${u}`, lastModified: new Date(), changeFrequency: "weekly" as const, priority: weight(u) }));
}
