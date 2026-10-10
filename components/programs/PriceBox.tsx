"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Roll } from "@/components/ui/Roll";
import { calcPrice } from "@/lib/pricing";
import { discounts, type DiscountId } from "@/config/discounts";
import { cn } from "@/lib/utils";

const options: (DiscountId | null)[] = [null, "freshGrad", "student", "group"];

// Sticky price card. With no price set it says so honestly and still shows the saving for each group.
export function PriceBox({ slug, priceFull, className }: { slug: string; priceFull: number | null; className?: string }) {
  const [status, setStatus] = useState<DiscountId | null>("freshGrad");
  const r = calcPrice(priceFull, status, false);

  return (
    <aside className={cn("glass p-7", className)} aria-label="Price">
      <p className="label mb-4">Who are you?</p>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Who are you?">
        {options.map((o) => (
          <button
            key={o ?? "none"}
            type="button"
            role="radio"
            aria-checked={status === o}
            onClick={() => setStatus(o)}
            className={cn("rounded-lg border px-3 py-2 text-[13px] font-medium transition-colors", status === o ? "border-accent bg-accent/15 text-accent-text" : "border-border text-muted hover:text-text")}
          >
            {o ? `${discounts[o].emoji} ${discounts[o].label}` : "Standard"}
          </button>
        ))}
      </div>

      <div className="mt-7 min-h-[88px]" aria-live="polite">
        {priceFull === null ? (
          <>
            <p className="font-display text-2xl">Price on request</p>
            {r.percent > 0 && <p className="mt-2 text-warm">You save <Roll value={r.percent} suffix="%" /></p>}
          </>
        ) : (
          <>
            <p className="font-display text-4xl"><Roll value={r.final ?? priceFull} prefix="$" /></p>
            {r.percent > 0 && <p className="mt-2 text-warm">−{r.percent}% · you save <Roll value={r.saving ?? 0} prefix="$" /></p>}
          </>
        )}
        {status && <p className="mt-3 text-xs text-muted">Pending check of: {discounts[status].proof.toLowerCase()}</p>}
      </div>

      <Button href={`/apply?program=${slug}${status === "freshGrad" ? "&status=freshGrad" : ""}`} variant="glow" className="mt-6 w-full">
        Apply to this program
      </Button>
    </aside>
  );
}
