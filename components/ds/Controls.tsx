"use client";

import { useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const ruleBorder = { borderColor: "var(--rule)" } as const;

// Tabs: underline style, arrow keys move between tabs.
export function Tabs({
  tabs,
  value,
  onChange,
  label,
  className,
}: {
  tabs: { id: string; label: string }[];
  value: string;
  onChange: (id: string) => void;
  label: string;
  className?: string;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  function key(e: React.KeyboardEvent, i: number) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    const n = (i + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length;
    refs.current[n]?.focus();
    onChange(tabs[n].id);
  }
  return (
    <div role="tablist" aria-label={label} className={cn("flex flex-wrap gap-x-7 border-b", className)} style={ruleBorder}>
      {tabs.map((t, i) => (
        <button
          key={t.id}
          ref={(el) => {
            refs.current[i] = el;
          }}
          role="tab"
          type="button"
          aria-selected={value === t.id}
          tabIndex={value === t.id ? 0 : -1}
          onClick={() => onChange(t.id)}
          onKeyDown={(e) => key(e, i)}
          className={cn(
            "relative h-12 text-[15px] font-medium transition-colors duration-200",
            value === t.id ? "text-text" : "text-dim hover:text-text",
          )}
        >
          {t.label}
          <span
            aria-hidden
            className="absolute inset-x-0 -bottom-px h-0.5 origin-left bg-accent transition-transform duration-300 ease-[cubic-bezier(.2,.7,.1,1)]"
            style={{ transform: value === t.id ? "scaleX(1)" : "scaleX(0)" }}
          />
        </button>
      ))}
    </div>
  );
}

// Segmented control (LOD 100 to 500, billing period, etc.)
export function SegmentedControl({
  options,
  value,
  onChange,
  label,
  className,
}: {
  options: { id: string; label: string }[];
  value: string;
  onChange: (id: string) => void;
  label: string;
  className?: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className={cn("inline-flex rounded-[8px] border p-1", className)} style={ruleBorder}>
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={value === o.id}
          onClick={() => onChange(o.id)}
          className={cn(
            "mono h-10 min-w-[52px] rounded-[5px] px-3 transition-colors duration-200",
            value === o.id ? "bg-cta !text-cta-text" : "hover:!text-text",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// Toggle switch (fresh graduate pricing)
export function Toggle({
  checked,
  onChange,
  label,
  className,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  className?: string;
}) {
  const id = useId();
  return (
    <label htmlFor={id} className={cn("inline-flex min-h-11 cursor-pointer items-center gap-3 text-[15px] text-text", className)}>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn("relative h-7 w-12 shrink-0 rounded-full border transition-colors duration-200", checked ? "border-transparent bg-cta" : "")}
        style={checked ? undefined : ruleBorder}
      >
        <span
          aria-hidden
          className="absolute top-0.5 size-[22px] rounded-full transition-[left,background-color] duration-200"
          style={{ left: checked ? 22 : 2, background: checked ? "#fff" : "var(--text-dim)" }}
        />
      </button>
      {label}
    </label>
  );
}

// Accordion styled as a drawing index: mono number, title, plus/minus
export function Accordion({ items, className }: { items: { q: string; a: React.ReactNode }[]; className?: string }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className={cn("border-t", className)} style={ruleBorder}>
      {items.map((it, i) => {
        const on = open === i;
        return (
          <div key={it.q} className="border-b" style={ruleBorder}>
            <h3 className="!text-base !font-medium !tracking-normal">
              <button
                type="button"
                aria-expanded={on}
                aria-controls={`acc-${i}`}
                onClick={() => setOpen(on ? null : i)}
                className="flex min-h-16 w-full items-center gap-5 py-4 text-start text-text"
              >
                <span className="mono w-8 shrink-0">{String(i + 1).padStart(2, "0")}</span>
                <span className="flex-1 text-[1.0625rem]">{it.q}</span>
                <span aria-hidden className="relative size-3.5 shrink-0">
                  <span className="absolute inset-x-0 top-1/2 h-px bg-current" />
                  <span className="absolute inset-y-0 left-1/2 w-px bg-current transition-transform duration-200" style={{ transform: on ? "scaleY(0)" : "none" }} />
                </span>
              </button>
            </h3>
            <div id={`acc-${i}`} role="region" hidden={!on} className="pb-6 ps-[3.25rem] pe-10 text-muted">
              {it.a}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Stepper: STEP 02 / 05 with a thin progress rule
export function Stepper({ step, total, labels, className }: { step: number; total: number; labels?: string[]; className?: string }) {
  return (
    <div className={className} role="group" aria-label={`Step ${step} of ${total}`}>
      <p className="mono !text-text">
        STEP {String(step).padStart(2, "0")} / {String(total).padStart(2, "0")}
        {labels?.[step - 1] && <span className="!text-dim"> · {labels[step - 1]}</span>}
      </p>
      <div className="mt-3 flex gap-1.5" aria-hidden>
        {Array.from({ length: total }, (_, i) => (
          <span key={i} className="h-0.5 flex-1 transition-colors duration-300" style={{ background: i < step ? "var(--accent)" : "var(--rule)" }} />
        ))}
      </div>
    </div>
  );
}
