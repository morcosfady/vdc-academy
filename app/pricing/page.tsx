import type { Metadata } from "next";
import { PageHero } from "@/components/ui/PageHero";
import { PricingPlans } from "@/components/programs/PricingPlans";
import { DiscountCalculator } from "@/components/programs/DiscountCalculator";
import { LeadForm } from "@/components/forms/LeadForm";
import { Faq } from "@/components/ds/Faq";
import { DiscountTable, discountRows } from "@/components/programs/DiscountTable";
import { earlyBirdStacksWithFreshGrad } from "@/config/discounts";
import { pricesKnown } from "@/content/plans";
import { pages } from "@/content/copy-pages";

export const metadata: Metadata = {
  title: "Pricing",
  description: "VDC Academy plans and discounts. Fresh graduates get the biggest discount.",
};

const c = pages.pricing;

// Section layout shared down the page: title in columns 1 to 4, content in 5 to 12.
function Row({ id, title, lead, children }: { id: string; title: string; lead?: string; children: React.ReactNode }) {
  return (
    <section className="theme-light section !pt-0" aria-labelledby={id}>
      <div className="wrap">
        <div className="grid-12 gap-y-10">
          <div className="col-span-12 lg:col-span-4">
            <h2 id={id} className="t-h3">
              {title}
            </h2>
            {lead && <p className="t-small mt-4 max-w-sm text-dim">{lead}</p>}
          </div>
          <div className="col-span-12 lg:col-span-8">{children}</div>
        </div>
      </div>
    </section>
  );
}

export default function PricingPage() {
  const rows = discountRows(c.discounts.auto);
  return (
    <>
      <PageHero sheet={c.sheet} eyebrow={c.name} title={[c.title]} subtitle={c.lead} />

      <section className="theme-light section !pt-12 lg:!pt-16">
        <div className="wrap">
          <PricingPlans />
          {!pricesKnown() && (
            <div className="card mt-10 p-7 md:p-10">
              <h2 className="t-h3">{c.finalizing.title}</h2>
              <p className="t-lead mt-3">{c.finalizing.text}</p>
              <div className="mt-8">
                <LeadForm topic={c.finalizing.topic} button={c.finalizing.button} />
              </div>
            </div>
          )}
        </div>
      </section>

      <Row id="discounts" title={c.discounts.title} lead={c.discounts.note(earlyBirdStacksWithFreshGrad)}>
        <DiscountTable rows={rows} cols={{ label: c.discounts.cols[0], who: c.discounts.cols[1], proof: c.discounts.cols[3], off: c.discounts.cols[2] }} title={c.discounts.title} />
      </Row>

      <Row id="calc" title={c.calculator.title} lead={c.calculator.lead}>
        <DiscountCalculator />
      </Row>

      <Row id="pay" title={c.faq.title}>
        <Faq items={c.faq.items} />
      </Row>
    </>
  );
}
