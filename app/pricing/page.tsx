import type { Metadata } from "next";
import { PageHero } from "@/components/ui/PageHero";
import { Button } from "@/components/ui/Button";
import { DiscountCalculator } from "@/components/programs/DiscountCalculator";
import { discounts, earlyBird, earlyBirdStacksWithFreshGrad } from "@/config/discounts";

export const metadata: Metadata = {
  title: "Pricing",
  description: "VDC Academy plans and discounts. Fresh graduates get the biggest discount.",
};

const plans = [
  { name: "Single Course", note: "One program", feats: ["One program of your choice", "Real project files", "Certificate of completion"] },
  { name: "Track Bundle", note: "Several programs, one path", feats: ["Multiple programs", "Portfolio review", "Certificate of completion"], featured: true },
  { name: "VDC Bootcamp", note: "Flagship", feats: ["All core tracks", "Capstone project", "Career support"] },
];

export default function PricingPage() {
  const rows = [...Object.values(discounts), { id: "early", ...earlyBird, who: earlyBird.who, proof: "Automatic by date" }];
  return (
    <>
      <PageHero tag="M-201 · PRICING" title="Simple plans. Big savings for fresh grads." subtitle="Final prices are being confirmed. Discounts below are the planned defaults." />
      <section className="mx-auto max-w-7xl px-4 py-16 md:px-6">
        <ul className="grid gap-5 md:grid-cols-3">
          {plans.map((pl) => (
            <li key={pl.name} className={`rounded-card border bg-bg-elevated p-6 ${pl.featured ? "border-brand-accent" : "border-border"}`}>
              <h2 className="text-lg font-bold">{pl.name}</h2>
              <p className="text-sm text-text-muted">{pl.note}</p>
              <p className="mt-5 font-heading text-3xl"><span className="placeholder-chip">[PRICE]</span></p>
              <ul className="mt-5 space-y-2 text-sm">{pl.feats.map((f) => <li key={f}>✓ {f}</li>)}</ul>
              <Button href="/apply" variant={pl.featured ? "glow" : "secondary"} className="mt-6 w-full">Apply</Button>
            </li>
          ))}
        </ul>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-16 md:px-6">
        <h2 className="mb-6 text-2xl font-bold">Discounts</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-start text-sm">
            <caption className="sr-only">Available discounts</caption>
            <thead>
              <tr className="border-b border-border text-text-muted">
                <th scope="col" className="py-3 pe-4 text-start">Discount</th>
                <th scope="col" className="py-3 pe-4 text-start">Who</th>
                <th scope="col" className="py-3 pe-4 text-start">Off</th>
                <th scope="col" className="py-3 text-start">Proof</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((d) => (
                <tr key={d.label} className={`border-b border-border ${d.label === "Fresh Graduate" ? "bg-surface font-medium" : ""}`}>
                  <th scope="row" className="py-3 pe-4 text-start">{d.emoji} {d.label}</th>
                  <td className="py-3 pe-4">{d.who}</td>
                  <td className="py-3 pe-4 text-brand-warm">{d.percent}%</td>
                  <td className="py-3">{d.proof}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-sm text-text-muted">
          Discounts do not stack{earlyBirdStacksWithFreshGrad ? ", except early bird with the fresh graduate discount" : ""}. Discounts stay pending until documents are verified.
        </p>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-16 md:px-6">
        <h2 className="mb-6 text-2xl font-bold">Discount calculator</h2>
        <DiscountCalculator />
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-24 md:px-6">
        <div className="grid gap-5 md:grid-cols-2">
          <div className="rounded-card border border-border p-6"><h2 className="font-bold">Payment options</h2><p className="mt-2 text-text-muted"><span className="placeholder-chip">[PAYMENT / INSTALLMENT POLICY]</span></p></div>
          <div className="rounded-card border border-border p-6"><h2 className="font-bold">Satisfaction policy</h2><p className="mt-2 text-text-muted"><span className="placeholder-chip">[REFUND POLICY]</span></p></div>
        </div>
      </section>
    </>
  );
}
