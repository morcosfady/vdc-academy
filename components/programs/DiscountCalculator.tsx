"use client";

import { useState } from "react";
import { programs } from "@/content/programs";
import { pages } from "@/content/copy-pages";
import { discounts, type DiscountId } from "@/config/discounts";
import { calcPrice } from "@/lib/pricing";
import { Roll } from "@/components/ui/Roll";
import { Chip } from "@/components/ds/Chips";
import { Toggle } from "@/components/ds/Controls";
import { Select } from "@/components/ds/Forms";

const c = pages.pricing.calculator;
const statuses: (DiscountId | null)[] = [null, "freshGrad", "student", "group"];

// Pick a program and who you are; the estimate updates. Discounts stay pending until documents are checked.
export function DiscountCalculator({ initial = "freshGrad" }: { initial?: DiscountId | null }) {
  const [slug, setSlug] = useState(programs[0].slug);
  const [status, setStatus] = useState<DiscountId | null>(initial);
  const [early, setEarly] = useState(false);
  const base = programs.find((p) => p.slug === slug)?.priceFull ?? null;
  const r = calcPrice(base, status, early);
  const titles = programs.map((p) => p.title);

  return (
    <div className="card grid gap-10 p-7 md:grid-cols-2 md:p-10">
      <div className="space-y-8">
        <Select label={c.program} options={titles} value={programs.find((p) => p.slug === slug)?.title} onChange={(e) => setSlug(programs.find((p) => p.title === e.target.value)?.slug ?? programs[0].slug)} />
        <fieldset>
          <legend className="mono mb-3">{c.who}</legend>
          <div className="flex flex-wrap gap-2">
            {statuses.map((s) => (
              <Chip key={s ?? "none"} active={status === s} onClick={() => setStatus(s)}>
                {s ? discounts[s].label : c.standard}
              </Chip>
            ))}
          </div>
        </fieldset>
        <Toggle checked={early} onChange={setEarly} label={c.early} />
      </div>
      <div className="flex flex-col justify-center border-t pt-8 md:border-s md:border-t-0 md:ps-10 md:pt-0" style={{ borderColor: "var(--rule)" }} aria-live="polite">
        <p className="mono">{c.estimate}</p>
        {r.final === null ? (
          <p className="mt-4 text-[1.75rem] font-semibold leading-none tracking-tight text-text">{pages.pricing.onRequest}</p>
        ) : (
          <p className="mt-4 text-[clamp(2.5rem,2rem+2vw,3.75rem)] font-semibold leading-none tracking-tight text-text">
            <Roll value={r.final} prefix="$" />
          </p>
        )}
        <p className="mt-5 text-[1.25rem] font-medium text-warm">
          {r.percent > 0 ? (
            <>
              <Roll value={r.percent} suffix="%" /> off
            </>
          ) : (
            c.none
          )}
        </p>
        {r.saving !== null && r.saving > 0 && (
          <p className="t-small mt-1 text-dim">
            {c.save} <Roll value={r.saving} prefix="$" />
          </p>
        )}
        {r.applied.length > 0 && <p className="mono mt-4">{r.applied.join(" + ")}</p>}
        <p className="t-small mt-5 text-dim">{c.pending}</p>
      </div>
    </div>
  );
}
