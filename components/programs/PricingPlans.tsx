"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Roll } from "@/components/ui/Roll";
import { Toggle } from "@/components/ds/Controls";
import { Tag } from "@/components/ds/Chips";
import { plans } from "@/content/plans";
import { pages } from "@/content/copy-pages";
import { calcPrice, money } from "@/lib/pricing";
import { cn } from "@/lib/utils";

const c = pages.pricing;
const rule = { borderColor: "var(--rule)" } as const;

// Three plans as cards on paper. The toggle above recomputes every price; the recommended plan has a blueprint border.
export function PricingPlans() {
  const [grad, setGrad] = useState(false);
  return (
    <div>
      <Toggle checked={grad} onChange={setGrad} label={c.toggle} />
      <ul className="mt-10 grid gap-6 md:grid-cols-3">
        {plans.map((p) => {
          const r = calcPrice(p.price, grad ? "freshGrad" : null, false);
          return (
            <li key={p.id} className={cn("card flex flex-col p-7 md:p-8", p.featured && "!border-accent")}>
              <div className="flex min-h-6 items-center justify-between gap-4">
                <p className="mono">{p.note}</p>
                {p.featured && <Tag tone="blueprint">{c.recommended}</Tag>}
              </div>
              <h3 className="mt-5 !text-[1.5rem]">{p.name}</h3>
              <div className="mt-6 min-h-[84px]" aria-live="polite">
                {p.price === null ? (
                  <p className="text-[1.75rem] font-semibold leading-none tracking-tight text-text">{c.onRequest}</p>
                ) : (
                  <>
                    <p className="text-[clamp(2.25rem,1.8rem+1.4vw,3rem)] font-semibold leading-none tracking-tight text-text">
                      <Roll value={r.final ?? p.price} prefix="$" />
                    </p>
                    <p className="t-small mt-3 text-dim">
                      {grad ? (
                        <>
                          <span className="text-warm">{c.pending}</span>
                          <span className="ms-2 line-through">{money(p.price)}</span>
                        </>
                      ) : (
                        c.was
                      )}
                    </p>
                  </>
                )}
              </div>
              <ul className="mt-6 flex-1 space-y-3 border-t pt-6 text-[15px] text-muted" style={rule}>
                {p.feats.map((f) => (
                  <li key={f} className="flex gap-3">
                    <span aria-hidden className="mt-3 h-px w-4 shrink-0 bg-current opacity-50" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button href={`/apply${grad ? "?status=freshGrad" : ""}`} variant={p.featured ? "primary" : "secondary"} className="mt-8 w-full">
                {c.apply}
              </Button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
