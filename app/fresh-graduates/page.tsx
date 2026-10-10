import type { Metadata } from "next";
import { PageHero } from "@/components/ui/PageHero";
import { Button } from "@/components/ui/Button";
import { Counter } from "@/components/ui/Counter";
import { DiscountCalculator } from "@/components/programs/DiscountCalculator";
import { discounts, freshGradMonths } from "@/config/discounts";

export const metadata: Metadata = {
  title: "Fresh Graduates",
  description: "Graduated in the last 24 months? Save up to 40% on VDC Academy BIM and VDC programs.",
};

const steps = [
  { n: "1", t: "Apply", d: "Fill in the application and pick your program." },
  { n: "2", t: "Upload proof", d: `Add your ${discounts.freshGrad.proof.toLowerCase()}.` },
  { n: "3", t: "We verify", d: "We review it in 1 to 2 business days and confirm your discount." },
];

export default function FreshGradsPage() {
  return (
    <>
      <PageHero tag="G-701 · FRESH GRADUATES" title="🎓 Just graduated? This is your launchpad." subtitle={`Graduated within the last ${freshGradMonths} months? You get our biggest discount.`}>
        <Button href="/apply" variant="glow">Claim my discount</Button>
      </PageHero>

      <section className="mx-auto max-w-7xl px-4 py-16 md:px-6">
        <div className="grid items-center gap-10 md:grid-cols-2">
          <div className="text-center">
            <div className="font-heading text-8xl font-bold text-brand-warm md:text-9xl" aria-label={`Up to ${discounts.freshGrad.percent} percent off`}>
              <Counter to={discounts.freshGrad.percent} suffix="%" />
            </div>
            <p className="text-text-muted">off, up to. Early bird can stack on top.</p>
          </div>
          <ol className="space-y-4">
            {steps.map((s) => (
              <li key={s.n} className="flex gap-4 rounded-card border border-border bg-bg-elevated p-5">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-cta font-heading text-cta-text">{s.n}</span>
                <div><p className="font-bold">{s.t}</p><p className="text-sm text-text-muted">{s.d}</p></div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-24 md:px-6">
        <h2 className="mb-6 text-2xl font-bold">See your price</h2>
        <DiscountCalculator />
      </section>
    </>
  );
}
