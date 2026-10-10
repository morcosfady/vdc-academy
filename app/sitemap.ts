import type { MetadataRoute } from "next";
import { programs } from "@/content/programs";
import { hasInstructors, hasStudentWork } from "@/content/site";

export const dynamic = "force-static";

const base = "https://morcosfady.github.io/vdc-academy";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = ["", "programs", "pricing", "fresh-graduates", "learning-path", "for-companies", "about", "contact", "faq", "apply", "privacy", "terms", "accessibility"];
  if (hasInstructors()) pages.push("instructors");
  if (hasStudentWork()) pages.push("student-work");
  return [...pages.map((p) => `${base}/${p}${p ? "/" : ""}`), ...programs.map((p) => `${base}/programs/${p.slug}/`)].map((url) => ({ url, lastModified: new Date() }));
}
