import type { Metadata } from "next";
import { PageHero } from "@/components/ui/PageHero";
import { FreshGradChapter } from "@/components/home/FreshGradChapter";
import { DiscountCalculator } from "@/components/programs/DiscountCalculator";
import { Faq } from "@/components/home/Closing";
import { discounts, freshGradMonths } from "@/config/discounts";

export const metadata: Metadata = {
  title: "Fresh Graduates",
  description: "Graduated in the last 24 months? Save up to 40% on VDC Academy BIM and VDC programs.",
};

const steps = [
  { n: "01", t: "Apply", d: "Fill in the application and pick your program." },
  { n: "02", t: "Upload proof", d: `Add your ${discounts.freshGrad.proof.toLowerCase()}.` },
  { n: "03", t: "We check it", d: "We review it in 1 to 2 business days and confirm your discount." },
];

const faq = [
  { q: "Who counts as a fresh graduate?", a: `Anyone who graduated within the last ${freshGradMonths} months, from any degree. Engineering, architecture and construction degrees are the best fit.` },
  { q: "What proof do I need?", a: "Your graduation certificate or an official transcript, as a PDF, JPG or PNG up to 5 MB." },
  { q: "Can I combine it with another discount?", a: "Early bird can stack with the fresh graduate discount. Other discounts do not combine." },
  { q: "When do I know if I got it?", a: "Your discount stays pending until we check your document. We reply within 1 to 2 business days." },
];

export default function FreshGradsPage() {
  return (
    <>
      <PageHero eyebrow="Fresh graduates" title={["Just graduated?", "Start strong."]} subtitle="Our biggest discount is for people taking their first step into BIM and VDC." />
      <FreshGradChapter />

      <section className="mx-auto max-w-[1280px] px-5 py-24 md:px-10">
        <h2 className="display-md mb-10">How it works</h2>
        <ol className="grid gap-px border border-border bg-border md:grid-cols-3">
          {steps.map((s) => (
            <li key={s.n} className="bg-bg p-8">
              <p className="label !text-accent-text">{s.n}</p>
              <p className="display-md mt-4 !text-2xl">{s.t}</p>
              <p className="mt-3 text-muted">{s.d}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mx-auto max-w-[1280px] px-5 pb-24 md:px-10">
        <h2 className="display-md mb-8">See your price</h2>
        <DiscountCalculator />
      </section>

      <section className="mx-auto max-w-4xl px-5 pb-32 md:px-10">
        <h2 className="display-md mb-8">Questions</h2>
        <Faq items={faq} />
      </section>
    </>
  );
}
