// Structured data for search engines. Pass a plain object, it is rendered as JSON-LD.
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\u003c") }} />;
}

export const orgLd = {
  "@context": "https://schema.org",
  "@type": "EducationalOrganization",
  name: "VDC Academy",
  url: "https://morcosfady.github.io/vdc-academy/",
  parentOrganization: { "@type": "Organization", name: "Bay BIM Designs", url: "https://baybimdesigns.com/" },
  address: { "@type": "PostalAddress", addressLocality: "Fort Worth", addressRegion: "TX", addressCountry: "US" },
};
