import { SITE_URL } from "@/config/site";
import { content, shown } from "@/content/site";
import { pricesConfirmed, schedulesConfirmed, type Program } from "@/content/programs";
import type { FaqItem } from "@/content/faqs";

// Structured data for search engines. Pass a plain object, it is rendered as JSON-LD.
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "<") }} />;
}

const ctx = "https://schema.org";
const orgId = `${SITE_URL}/#organization`;
const linkedin = shown(content.social.linkedin);

export const orgLd = {
  "@context": ctx,
  "@type": "EducationalOrganization",
  "@id": orgId,
  name: "VDC Academy",
  url: `${SITE_URL}/`,
  parentOrganization: { "@type": "Organization", name: "Bay BIM Designs", url: "https://baybimdesigns.com/" },
  address: { "@type": "PostalAddress", addressLocality: "Fort Worth", addressRegion: "TX", addressCountry: "US" },
  // Only once the owner approves the LinkedIn page in content/site.ts.
  ...(linkedin ? { sameAs: [linkedin] } : {}),
};

// Short reference to the organization above, used as the course provider.
const provider = { "@type": "EducationalOrganization", "@id": orgId, name: "VDC Academy", url: `${SITE_URL}/` };

// ISO date for schema.org, or null when the text is not a real date.
const isoDate = (s: string | null) => {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
};

// A Course. Schedules and offers are added only when the owner has confirmed them (content/site.ts `confirmed`).
export function courseLd(p: Program, withContext = true) {
  const start = isoDate(p.nextCohortDate);
  const instance =
    schedulesConfirmed && (p.format || start)
      ? {
          hasCourseInstance: {
            "@type": "CourseInstance",
            ...(p.format ? { courseMode: p.format } : {}),
            ...(start ? { startDate: start } : {}),
            ...(p.hours !== null ? { courseWorkload: `PT${p.hours}H` } : {}),
            location: { "@type": "Place", name: "Fort Worth, TX" },
          },
        }
      : {};
  const offers =
    pricesConfirmed && p.priceFull !== null
      ? { offers: { "@type": "Offer", price: p.priceFull, priceCurrency: "USD", category: "Paid", url: `${SITE_URL}/apply/` } }
      : {};
  return {
    ...(withContext ? { "@context": ctx } : {}),
    "@type": "Course",
    name: p.title,
    description: p.summary,
    url: `${SITE_URL}/programs/${p.slug}/`,
    provider,
    educationalLevel: p.level,
    teaches: p.outcomes,
    ...instance,
    ...offers,
  };
}

// The catalog as an ItemList of courses, for /programs.
export function courseListLd(list: Program[]) {
  return {
    "@context": ctx,
    "@type": "ItemList",
    itemListElement: list.map((p, i) => ({ "@type": "ListItem", position: i + 1, item: courseLd(p, false) })),
  };
}

export function faqLd(items: FaqItem[]) {
  return {
    "@context": ctx,
    "@type": "FAQPage",
    mainEntity: items.map((x) => ({ "@type": "Question", name: x.q, acceptedAnswer: { "@type": "Answer", text: x.a } })),
  };
}

// Home is always the first crumb. Paths are site paths with a trailing slash, for example "/programs/".
export function breadcrumbLd(items: { name: string; path: string }[]) {
  const all = [{ name: "Home", path: "/" }, ...items];
  return {
    "@context": ctx,
    "@type": "BreadcrumbList",
    itemListElement: all.map((x, i) => ({ "@type": "ListItem", position: i + 1, name: x.name, item: `${SITE_URL}${x.path}` })),
  };
}
