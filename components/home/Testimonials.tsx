"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { SectionHeader } from "@/components/ui/SectionHeader";

// From the Bay BIM Designs website. Needs the owner's approval before launch (see TODO-content.md).
const quotes = [
  {
    text: "We spent about 6 months working with Bay BIM Designs to kick start our BIM practice inside our Low Voltage Electrical-Design Build Firm. In that time, we were able to successfully train up our Design team in the use BIM modeling, create an entire suite of custom electrical families, and onboard BIM design into our everyday use at the firm.",
    who: "COO at a Technology Design Firm",
  },
];

export function Testimonials() {
  const [i, setI] = useState(0);
  const q = quotes[i];
  return (
    <section className="border-y border-border bg-bg-elevated py-24">
      <div className="mx-auto max-w-4xl px-4 md:px-6">
        <SectionHeader tag="J-1001 · TESTIMONIALS" title="What clients say about Bay BIM Designs training" />
        <div aria-live="polite" className="min-h-[220px]">
          <AnimatePresence mode="wait">
            <motion.figure key={i} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.35 }}>
              <blockquote className="text-lg">&ldquo;{q.text}&rdquo;</blockquote>
              <figcaption className="mt-4 text-sm text-text-muted">
                {q.who} · From Bay BIM Designs clients <span className="placeholder-chip">[approval pending]</span>
              </figcaption>
            </motion.figure>
          </AnimatePresence>
        </div>
        <p className="mt-4 text-sm text-text-muted">Student testimonials will appear here after the first cohort.</p>
        {quotes.length > 1 && (
          <div className="mt-6 flex gap-2">
            <button type="button" aria-label="Previous testimonial" onClick={() => setI((i + quotes.length - 1) % quotes.length)} className="grid size-10 place-items-center rounded-btn border border-border"><ArrowLeft size={18} aria-hidden /></button>
            <button type="button" aria-label="Next testimonial" onClick={() => setI((i + 1) % quotes.length)} className="grid size-10 place-items-center rounded-btn border border-border"><ArrowRight size={18} aria-hidden /></button>
          </div>
        )}
      </div>
    </section>
  );
}
