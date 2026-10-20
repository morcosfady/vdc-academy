import type { Metadata } from "next";
import { PageHero } from "@/components/ui/PageHero";
import { Button } from "@/components/ui/Button";
import { FaqBrowser } from "@/components/ds/FaqBrowser";
import { faqs } from "@/content/faqs";
import { pages } from "@/content/copy-pages";
import { JsonLd, breadcrumbLd, faqLd } from "@/components/seo/JsonLd";
import { pageMeta } from "@/components/seo/meta";

export const metadata: Metadata = pageMeta({ title: "BIM Training FAQ: Programs, Pricing, Applying", description: "Answers about VDC Academy BIM and VDC programs, fresh graduate and student discounts, applying, the laptop you need for Revit and team training.", path: "/faq/", og: "faq" });

const c = pages.faq;

export default function FaqPage() {
  return (
    <>
      <JsonLd data={faqLd(faqs)} />
      <JsonLd data={breadcrumbLd([{ name: "FAQ", path: "/faq/" }])} />
      <PageHero sheet={c.sheet} eyebrow={c.name} title={[c.title]} subtitle={c.lead}>
        <Button href="/contact" variant="link">
          {c.ask}
        </Button>
      </PageHero>
      <section className="theme-light section !pt-12 lg:!pt-16">
        <div className="wrap">
          <FaqBrowser className="max-w-4xl" />
        </div>
      </section>
    </>
  );
}
