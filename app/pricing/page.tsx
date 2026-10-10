import type { Metadata } from "next";
import { PageHero } from "@/components/ui/PageHero";
import { PricingPlans } from "@/components/programs/PricingPlans";
import { DiscountCalculator } from "@/components/programs/DiscountCalculator";
import { LeadForm } from "@/components/forms/LeadForm";
import { discounts, earlyBird, earlyBirdStacksWithFreshGrad } from "@/config/discounts";
import { pricesKnown } from "@/content/plans";

export const metadata: Metadata = {
  title: "Pricing",
  description: "VDC Academy plans and discounts. Fresh graduates get the biggest discount.",
};

export default function PricingPage() {
  const rows = [
    ...Object.values(discounts).map((d) => ({ key: d.id, emoji: d.emoji, label: d.label, who: d.who, percent: d.percent, proof: d.proof })),
    { key: "early", emoji: earlyBird.emoji, label: earlyBird.label, who: earlyBird.who, percent: earlyBird.percent, proof: "Automatic by date" },
  ];
  return (
    <>
      <PageHero eyebrow="Pricing" title={["Simple plans.", "Big savings for fresh grads."]} subtitle="Pick a plan, then see what you save." />

      <section className="mx-auto max-w-[1280px] px-5 pb-24 md:px-10">
        <PricingPlans />
        {!pricesKnown() && (
          <div className="glass mt-10 p-7 md:p-10">
            <h2 className="display-md !text-2xl">Pricing is being finalized.</h2>
            <p className="mb-6 mt-3 max-w-xl text-muted">Apply to get the price list first, or leave your email and we will send it.</p>
            <LeadForm topic="Send me the price list" button="Send price list" />
          </div>
        )}
      </section>

      <section className="mx-auto max-w-[1280px] px-5 pb-24 md:px-10">
        <h2 className="display-md mb-8">Discounts</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] text-sm">
            <caption className="sr-only">Available discounts</caption>
            <thead>
              <tr className="border-b border-border">
                {["Discount", "Who", "Off", "Proof"].map((h) => <th key={h} scope="col" className="meta py-3 pe-4 text-start">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map((d) => (
                <tr key={d.key} className={`border-b border-border ${d.key === "freshGrad" ? "bg-accent/10" : ""}`}>
                  <th scope="row" className="py-4 pe-4 text-start font-medium">{d.emoji} {d.label}</th>
                  <td className="py-4 pe-4 text-muted">{d.who}</td>
                  <td className="py-4 pe-4 font-semibold text-warm">{d.percent}%</td>
                  <td className="py-4 text-muted">{d.proof}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-sm text-muted">
          Discounts do not stack{earlyBirdStacksWithFreshGrad ? ", except early bird with the fresh graduate discount" : ""}. They stay pending until we check your documents.
        </p>
      </section>

      <section className="mx-auto max-w-[1280px] px-5 pb-32 md:px-10">
        <h2 className="display-md mb-8">Discount calculator</h2>
        <DiscountCalculator />
      </section>
    </>
  );
}
