"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { calcPrice, money } from "@/lib/pricing";
import { discounts, type DiscountId } from "@/config/discounts";
import { cn } from "@/lib/utils";

const options: (DiscountId | null)[] = [null, "freshGrad", "student", "group"];

// Price box with a status picker. Shows the percent now and real dollars once priceFull is set.
export function PriceBox({ slug, priceFull, className }: { slug: string; priceFull: number | null; className?: string }) {
  const [status, setStatus] = useState<DiscountId | null>(null);
  const r = calcPrice(priceFull, status, false);

  return (
    <aside className={cn("rounded-card border border-border bg-bg-elevated p-6", className)} aria-label="Price">
      <p className="font-mono text-xs uppercase tracking-widest text-text-muted">Your price</p>
      <div className="mt-3 flex flex-wrap gap-2" role="radiogroup" aria-label="Who are you?">
        {options.map((o) => (
          <button
            key={o ?? "none"}
            type="button"
            role="radio"
            aria-checked={status === o}
            onClick={() => setStatus(o)}
            className={cn("rounded-btn border px-3 py-2 text-sm", status === o ? "border-brand-accent bg-surface" : "border-border text-text-muted")}
          >
            {o ? `${discounts[o].emoji} ${discounts[o].label}` : "Standard"}
          </button>
        ))}
      </div>
      <p className="mt-5 font-heading text-3xl">
        {priceFull === null ? <span className="placeholder-chip">[PRICE]</span> : money(r.final ?? priceFull)}
      </p>
      {r.percent > 0 && (
        <p className="mt-2 text-brand-warm">
          −{r.percent}% {r.saving !== null && `(you save ${money(r.saving)})`}
        </p>
      )}
      {status && <p className="mt-1 text-xs text-text-muted">Pending verification of: {discounts[status].proof}</p>}
      <Button href={`/apply?program=${slug}`} variant="glow" className="mt-6 w-full">
        Apply to this program
      </Button>
    </aside>
  );
}
