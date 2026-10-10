"use client";

import { useState } from "react";
import { AnimatePresence, m } from "motion/react";
import { Button } from "@/components/ui/Button";
import { Roll } from "@/components/ui/Roll";
import { plans } from "@/content/plans";
import { calcPrice } from "@/lib/pricing";
import { discounts } from "@/config/discounts";
import { cn } from "@/lib/utils";

export function PricingPlans() {
  const [grad, setGrad] = useState(true);
  return (
    <div>
      <button type="button" role="switch" aria-checked={grad} onClick={() => setGrad(!grad)} className="mb-10 flex items-center gap-4">
        <span className={cn("relative h-7 w-14 border transition-colors", grad ? "border-accent bg-accent/30" : "border-border")}>
          <span className={cn("absolute top-0.5 size-5 bg-text transition-all duration-300", grad ? "start-8" : "start-0.5")} />
        </span>
        <span>🎓 I am a fresh graduate</span>
      </button>

      <ul className="grid gap-5 md:grid-cols-3">
        {plans.map((p) => {
          const r = calcPrice(p.price, grad ? "freshGrad" : null, false);
          return (
            <li key={p.id} className={cn("glass relative flex min-h-[460px] flex-col p-8", p.featured && "border-accent shadow-[0_0_50px_var(--glow)]")}>
              <AnimatePresence>
                {grad && (
                  <m.span
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute -top-3 end-6 bg-warm px-3 py-1 text-xs font-medium uppercase tracking-widest text-[#1a1208]"
                  >
                    −<Roll value={discounts.freshGrad.percent} suffix="%" />
                  </m.span>
                )}
              </AnimatePresence>
              <p className="label">{p.note}</p>
              <h3 className="display-md mt-3 !text-[1.6rem]">{p.name}</h3>
              <div className="mt-8 min-h-[72px]" aria-live="polite">
                {p.price === null ? (
                  <p className="font-display text-xl">Price on request</p>
                ) : (
                  <>
                    {grad && <p className="text-sm text-muted line-through">${p.price.toLocaleString("en-US")}</p>}
                    <p className="font-display text-4xl"><Roll value={r.final ?? p.price} prefix="$" /></p>
                  </>
                )}
                {grad && <p className="mt-2 text-sm text-warm">Fresh graduate discount, pending check</p>}
              </div>
              <ul className="mt-6 flex-1 space-y-3 border-t border-border pt-6 text-sm text-muted">
                {p.feats.map((f) => <li key={f}>✓ {f}</li>)}
              </ul>
              <Button href={`/apply${grad ? "?status=freshGrad" : ""}`} variant={p.featured ? "glow" : "outline"} className="mt-8 w-full">Apply</Button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
