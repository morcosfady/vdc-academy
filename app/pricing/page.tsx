import type { Metadata } from "next";
import { PageHero } from "@/components/ui/PageHero";
import { PricingPlans } from "@/components/programs/PricingPlans";
import { DiscountCalculator } from "@/components/programs/DiscountCalculator";
import { LeadForm } from "@/components/forms/LeadForm";
import { Faq } from "@/components/ds/Faq";
import { SectionHeader } from "@/components/ds/Sections";
import { discounts, earlyBird, earlyBirdStacksWithFreshGrad } from "@/config/discounts";
import { pricesKnown } from "@/content/plans";
import { pages } from "@/content/copy-pages";

export const metadata: Metadata = {
  title: "Pricing",
  description: "VDC Academy plans and discounts. Fresh graduates get the biggest discount.",
};

const c = pages.pricing;
const rule = { borderColor: "var(--rule)" } as const;

export default function PricingPage() {
  const rows = [
    ...Object.values(discounts).map((d) => ({ key: d.id, label: d.label, who: d.who, percent: d.percent, proof: d.proof })),
    { key: "early", label: earlyBird.label, who: earlyBird.who, percent: earlyBird.percent, proof: c.discounts.auto },
  ];
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

      <section className="theme-light section !pt-0" aria-labelledby="discounts">
        <div className="wrap">
          <div className="grid-12 gap-y-10">
            <div className="col-span-12 lg:col-span-4">
              <h2 id="discounts" className="t-h3">
                {c.discounts.title}
              </h2>
              <p className="t-small mt-4 max-w-sm text-dim">{c.discounts.note(earlyBirdStacksWithFreshGrad)}</p>
            </div>
            <div className="col-span-12 overflow-x-auto lg:col-span-8">
              <table className="w-full min-w-[560px] border-collapse text-[15px]">
                <caption className="sr-only">{c.discounts.title}</caption>
                <thead>
                  <tr>
                    {c.discounts.cols.map((h) => (
                      <th key={h} scope="col" className="mono border-b pb-3 pe-4 text-start font-normal" style={rule}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((d) => (
                    <tr key={d.key}>
                      <th scope="row" className="border-b py-4 pe-4 text-start font-medium text-text" style={rule}>
                        {d.label}
                      </th>
                      <td className="border-b py-4 pe-4 text-muted" style={rule}>
                        {d.who}
                      </td>
                      <td className={`border-b py-4 pe-4 font-semibold tabular-nums ${d.key === "freshGrad" ? "text-warm" : "text-text"}`} style={rule}>
                        {d.percent}%
                      </td>
                      <td className="border-b py-4 text-muted" style={rule}>
                        {d.proof}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      <section className="theme-light section !pt-0" aria-labelledby="calc">
        <div className="wrap">
          <SectionHeader title={<span id="calc">{c.calculator.title}</span>} lead={c.calculator.lead} />
          <div className="mt-10">
            <DiscountCalculator />
          </div>
        </div>
      </section>

      <section className="theme-light section !pt-0" aria-labelledby="pay">
        <div className="wrap">
          <div className="grid-12 gap-y-10">
            <div className="col-span-12 lg:col-span-4">
              <h2 id="pay" className="t-h3">
                {c.faq.title}
              </h2>
            </div>
            <div className="col-span-12 lg:col-span-8">
              <Faq items={c.faq.items} />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
