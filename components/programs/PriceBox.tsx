"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Roll } from "@/components/ui/Roll";
import { Toggle } from "@/components/ds/Controls";
import { calcPrice, money } from "@/lib/pricing";
import { discounts } from "@/config/discounts";
import { pages } from "@/content/copy-pages";
import { cn } from "@/lib/utils";

const c = pages.program.enroll;
const rule = { borderColor: "var(--rule)" } as const;

// Sticky enrollment card. The fresh graduate toggle recomputes the price; nothing is shown that is not known.
export function PriceBox({
  slug,
  priceFull,
  nextCohort,
  seats,
  schedule,
  className,
}: {
  slug: string;
  priceFull: number | null;
  nextCohort: string | null;
  seats: number | null;
  schedule: string | null;
  className?: string;
}) {
  const [grad, setGrad] = useState(false);
  const r = calcPrice(priceFull, grad ? "freshGrad" : null, false);
  const details = [nextCohort && { k: c.cohort, v: nextCohort }, seats !== null && { k: c.seats, v: seats }, schedule && { k: c.schedule, v: schedule }].filter(Boolean) as { k: string; v: React.ReactNode }[];

  return (
    <aside className={cn("card p-7 md:p-8", className)} aria-label={c.label}>
      <p className="mono">{c.label}</p>
      <div className="mt-6 min-h-[88px]" aria-live="polite">
        {priceFull === null ? (
          <>
            <p className="text-[2rem] font-semibold leading-none tracking-tight text-text">{c.onRequest}</p>
            <p className="t-small mt-3 text-dim">{c.onRequestNote}</p>
          </>
        ) : (
          <>
            <p className="text-[clamp(2.5rem,2rem+1.5vw,3.25rem)] font-semibold leading-none tracking-tight text-text">
              <Roll value={r.final ?? priceFull} prefix="$" />
            </p>
            <p className="t-small mt-3 text-dim">
              {grad ? (
                <>
                  <span className="text-warm">{c.save(discounts.freshGrad.percent)}</span>
                  <span className="ms-2 line-through">{money(priceFull)}</span>
                </>
              ) : (
                c.full
              )}
            </p>
          </>
        )}
      </div>
      <Toggle className="mt-6" checked={grad} onChange={setGrad} label={c.toggle} />
      {grad && (
        <p className="t-small mt-2 text-dim" role="status">
          {c.pending}
        </p>
      )}

      {details.length > 0 && (
        <dl className="mt-7 border-t" style={rule}>
          {details.map((d) => (
            <div key={d.k} className="flex items-baseline justify-between gap-4 border-b py-3" style={rule}>
              <dt className="mono">{d.k}</dt>
              <dd className="text-[15px] text-text">{d.v}</dd>
            </div>
          ))}
        </dl>
      )}

      <Button href={`/apply?program=${slug}${grad ? "&status=freshGrad" : ""}`} className="mt-7 w-full">
        {c.apply}
      </Button>
      <Button href="/contact" variant="link" className="mt-5">
        {c.ask}
      </Button>
    </aside>
  );
}
