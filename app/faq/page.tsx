import type { Metadata } from "next";
import { PageHero } from "@/components/ui/PageHero";
import { Button } from "@/components/ui/Button";
import { Faq } from "@/components/ds/Faq";
import { faqs } from "@/content/faqs";
import { pages } from "@/content/copy-pages";
import { JsonLd } from "@/components/seo/JsonLd";

export const metadata: Metadata = { title: "FAQ", description: "Answers about VDC Academy programs, discounts and applying." };

const c = pages.faq;

export default function FaqPage() {
  const all = [...faqs, ...c.more];
  return (
    <>
      <JsonLd data={{ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: all.map((x) => ({ "@type": "Question", name: x.q, acceptedAnswer: { "@type": "Answer", text: x.a } })) }} />
      <PageHero sheet={c.sheet} eyebrow={c.name} title={[c.title]} subtitle={c.lead}>
        <Button href="/contact" variant="link">
          {c.ask}
        </Button>
      </PageHero>
      <section className="theme-light section !pt-12 lg:!pt-16">
        <div className="wrap">
          <div className="max-w-4xl">
            <Faq items={all} />
          </div>
        </div>
      </section>
    </>
  );
}
