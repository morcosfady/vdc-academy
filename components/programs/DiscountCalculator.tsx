"use client";

import { useState } from "react";
import { programs } from "@/content/programs";
import { discounts, earlyBird, type DiscountId } from "@/config/discounts";
import { calcPrice, money } from "@/lib/pricing";
import { cn } from "@/lib/utils";

const statuses: (DiscountId | null)[] = [null, "freshGrad", "student", "group"];

export function DiscountCalculator() {
  const [slug, setSlug] = useState(programs[0].slug);
  const [status, setStatus] = useState<DiscountId | null>("freshGrad");
  const [early, setEarly] = useState(false);
  const base = programs.find((p) => p.slug === slug)?.priceFull ?? null;
  const r = calcPrice(base, status, early);

  return (
    <div className="rounded-card border border-border bg-bg-elevated p-6 md:p-8">
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-5">
          <label className="block text-sm">
            Program
            <select value={slug} onChange={(e) => setSlug(e.target.value)} className="mt-2 w-full rounded-btn border border-border bg-bg px-3 py-3">
              {programs.map((p) => (
                <option key={p.slug} value={p.slug}>{p.title}</option>
              ))}
            </select>
          </label>
          <fieldset>
            <legend className="mb-2 text-sm">Who are you?</legend>
            <div className="flex flex-wrap gap-2">
              {statuses.map((s) => (
                <button
                  key={s ?? "none"}
                  type="button"
                  aria-pressed={status === s}
                  onClick={() => setStatus(s)}
                  className={cn("rounded-btn border px-3 py-2 text-sm", status === s ? "border-brand-accent bg-surface" : "border-border text-text-muted")}
                >
                  {s ? `${discounts[s].emoji} ${discounts[s].label}` : "Standard"}
                </button>
              ))}
            </div>
          </fieldset>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={early} onChange={(e) => setEarly(e.target.checked)} className="size-4 accent-[var(--brand-accent)]" />
            {earlyBird.emoji} {earlyBird.who}
          </label>
        </div>
        <div className="rounded-card bg-surface p-6" aria-live="polite">
          <p className="font-mono text-xs uppercase tracking-widest text-text-muted">Estimate</p>
          <p className="mt-3 font-heading text-4xl">
            {r.final === null ? <span className="placeholder-chip">[PRICE]</span> : money(r.final)}
          </p>
          <p className="mt-3 text-2xl font-bold text-brand-warm">{r.percent > 0 ? `−${r.percent}%` : "No discount"}</p>
          {r.saving !== null && r.saving > 0 && <p className="text-sm text-text-muted">You save {money(r.saving)}</p>}
          {r.applied.length > 0 && <p className="mt-2 text-sm text-text-muted">{r.applied.join(" + ")}</p>}
          <p className="mt-4 text-xs text-text-muted">Discounts stay pending until we verify your documents.</p>
        </div>
      </div>
    </div>
  );
}
