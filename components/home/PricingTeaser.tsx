"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Button } from "@/components/ui/Button";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { site } from "@/config/site";
import { cn } from "@/lib/utils";

const plans = [
  { name: "Single Course", note: "One program, at your pace" },
  { name: "Track Bundle", note: "Several programs, one path", featured: true },
  { name: "VDC Bootcamp", note: "Flagship, with capstone and career support" },
];

export function PricingTeaser() {
  const [grad, setGrad] = useState(false);
  return (
    <section className="mx-auto max-w-7xl px-4 py-24 md:px-6">
      <SectionHeader tag="K-1101 · PRICING" title="Simple plans, big savings for fresh grads" />
      <div className="mb-8 flex items-center gap-3">
        <button
          type="button"
          role="switch"
          aria-checked={grad}
          aria-label="I am a fresh graduate"
          onClick={() => setGrad(!grad)}
          className={cn("relative h-7 w-12 rounded-full border border-border transition", grad ? "bg-cta" : "bg-surface")}
        >
          <span className={cn("absolute top-0.5 size-5 rounded-full bg-white transition-all", grad ? "start-6" : "start-0.5")} />
        </button>
        <span>🎓 I&apos;m a fresh graduate</span>
      </div>
      <ul className="grid gap-5 md:grid-cols-3">
        {plans.map((p) => (
          <li key={p.name} className={cn("relative rounded-card border bg-bg-elevated p-6", p.featured ? "border-brand-accent" : "border-border")}>
            <AnimatePresence>
              {grad && (
                <motion.span initial={{ scale: 0, rotate: -12 }} animate={{ scale: 1, rotate: -6 }} exit={{ scale: 0 }} className="absolute -top-3 end-4 rounded-btn bg-brand-warm px-3 py-1 text-sm font-bold text-[#0a1d23]">
                  −{site.freshGradMaxDiscount}%
                </motion.span>
              )}
            </AnimatePresence>
            <h3 className="text-lg font-bold">{p.name}</h3>
            <p className="mt-1 text-sm text-text-muted">{p.note}</p>
            <p className="mt-6 font-heading text-3xl">
              {grad && <span className="me-2 text-lg text-text-muted line-through"><span className="placeholder-chip">[PRICE]</span></span>}
              <span className="placeholder-chip">[PRICE]</span>
            </p>
            {grad && <p className="mt-1 text-sm text-brand-warm">Fresh graduate discount applied, pending verification</p>}
            <Button href="/apply" variant={p.featured ? "glow" : "secondary"} className="mt-6 w-full">Apply</Button>
          </li>
        ))}
      </ul>
    </section>
  );
}
