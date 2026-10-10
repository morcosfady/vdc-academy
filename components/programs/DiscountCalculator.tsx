"use client";

import { useState } from "react";
import { programs } from "@/content/programs";
import { discounts, earlyBird, type DiscountId } from "@/config/discounts";
import { calcPrice } from "@/lib/pricing";
import { Roll } from "@/components/ui/Roll";
import { cn } from "@/lib/utils";

const statuses: (DiscountId | null)[] = [null, "freshGrad", "student", "group"];

export function DiscountCalculator({ initial = "freshGrad" }: { initial?: DiscountId | null }) {
  const [slug, setSlug] = useState(programs[0].slug);
  const [status, setStatus] = useState<DiscountId | null>(initial);
  const [early, setEarly] = useState(false);
  const base = programs.find((p) => p.slug === slug)?.priceFull ?? null;
  const r = calcPrice(base, status, early);

  return (
    <div className="glass grid gap-8 p-7 md:grid-cols-2 md:p-10">
      <div className="space-y-6">
        <label className="block">
          <span className="meta mb-2 block">Program</span>
          <select value={slug} onChange={(e) => setSlug(e.target.value)} className="h-14 w-full border border-border bg-transparent px-4">
            {programs.map((p) => (
              <option key={p.slug} value={p.slug} className="bg-[#0a1d23] text-white">{p.title}</option>
            ))}
          </select>
        </label>
        <fieldset>
          <legend className="meta mb-2">Who are you?</legend>
          <div className="flex flex-wrap gap-2">
            {statuses.map((s) => (
              <button
                key={s ?? "none"}
                type="button"
                aria-pressed={status === s}
                onClick={() => setStatus(s)}
                className={cn("min-h-11 rounded-lg border px-4 py-2 text-[14px] font-medium", status === s ? "border-accent bg-accent/15 text-accent-text" : "border-border text-muted hover:text-text")}
              >
                {s ? `${discounts[s].emoji} ${discounts[s].label}` : "Standard"}
              </button>
            ))}
          </div>
        </fieldset>
        <label className="flex items-center gap-3 text-sm">
          <input type="checkbox" checked={early} onChange={(e) => setEarly(e.target.checked)} className="size-4 accent-[var(--accent)]" />
          {earlyBird.emoji} {earlyBird.who}
        </label>
      </div>
      <div className="flex flex-col justify-center border-t border-border pt-8 md:border-s md:border-t-0 md:ps-10 md:pt-0" aria-live="polite">
        <p className="meta mb-3">Your estimate</p>
        {r.final === null ? (
          <p className="font-semibold text-2xl">Price on request</p>
        ) : (
          <p className="font-semibold text-5xl"><Roll value={r.final} prefix="$" /></p>
        )}
        <p className="mt-4 font-semibold text-3xl text-warm">{r.percent > 0 ? <>−<Roll value={r.percent} suffix="%" /></> : "No discount"}</p>
        {r.saving !== null && r.saving > 0 && <p className="mt-1 text-sm text-muted">You save <Roll value={r.saving} prefix="$" /></p>}
        {r.applied.length > 0 && <p className="mt-2 text-sm text-muted">{r.applied.join(" + ")}</p>}
        <p className="mt-5 text-sm text-muted">Discounts stay pending until we check your documents.</p>
      </div>
    </div>
  );
}
