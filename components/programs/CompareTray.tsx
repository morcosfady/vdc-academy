"use client";

import { useState } from "react";
import Link from "next/link";
import { programs } from "@/content/programs";
import { pages } from "@/content/copy-pages";
import { money } from "@/lib/pricing";
import { Software } from "@/components/ds/Chips";
import { Button } from "@/components/ui/Button";

const c = pages.programs.compare;
const rule = { borderColor: "var(--rule)" } as const;

// Sticky tray at the bottom of /programs. Shows the picked programs and, on request, a side by side table.
export function CompareTray({ slugs, onRemove, onClear }: { slugs: string[]; onRemove: (slug: string) => void; onClear: () => void }) {
  const [open, setOpen] = useState(false);
  const list = slugs.map((s) => programs.find((p) => p.slug === s)!).filter(Boolean);
  if (list.length === 0) return null;

  const rows: { k: string; v: (p: (typeof list)[number]) => React.ReactNode }[] = [
    { k: c.rows.duration, v: (p) => (p.durationWeeks !== null ? pages.program.facts.weeks(p.durationWeeks) : c.onRequest) },
    { k: c.rows.hours, v: (p) => (p.hours !== null ? String(p.hours) : c.onRequest) },
    { k: c.rows.level, v: (p) => p.level },
    { k: c.rows.format, v: (p) => p.format ?? c.onRequest },
    {
      k: c.rows.software,
      v: (p) => (
        <span className="flex flex-wrap gap-1.5">
          {p.software.map((s) => (
            <Software key={s}>{s}</Software>
          ))}
        </span>
      ),
    },
    { k: c.rows.price, v: (p) => <span className="font-medium text-text">{p.priceFull !== null ? money(p.priceFull) : c.onRequest}</span> },
    { k: c.rows.cohort, v: (p) => p.nextCohortDate ?? c.onRequest },
  ];

  return (
    <>
      {/* keeps the last cards clear of the tray */}
      <div aria-hidden className="h-24" />
      <aside aria-label={c.title} className="theme-light fixed inset-x-0 bottom-0 z-40 border-t bg-paper" style={{ ...rule, boxShadow: "0 -12px 32px rgba(10,29,35,0.08)" }}>
        {open && (
          <div className="wrap max-h-[60svh] overflow-auto border-b py-6" style={rule}>
            <table className="w-full min-w-[640px] border-collapse text-[15px]">
              <caption className="sr-only">{c.title}</caption>
              <thead>
                <tr>
                  <th scope="col" className="mono w-36 border-b py-3 text-start font-normal" style={rule}>
                    {c.title}
                  </th>
                  {list.map((p) => (
                    <th key={p.slug} scope="col" className="border-b py-3 pe-6 text-start align-top" style={rule}>
                      <Link prefetch={false} href={`/programs/${p.slug}`} className="ul-draw pb-0.5 text-[1.0625rem] font-semibold text-text">
                        {p.title}
                      </Link>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.k}>
                    <th scope="row" className="mono border-b py-3 text-start font-normal" style={rule}>
                      {r.k}
                    </th>
                    {list.map((p) => (
                      <td key={p.slug} className="border-b py-3 pe-6 align-top text-muted" style={rule}>
                        {r.v(p)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="wrap flex flex-wrap items-center gap-x-6 gap-y-3 py-3">
          <p className="mono !text-text" aria-live="polite">
            {c.tray(list.length)}
          </p>
          <ul className="flex flex-1 flex-wrap gap-2">
            {list.map((p) => (
              <li key={p.slug}>
                <button
                  type="button"
                  onClick={() => onRemove(p.slug)}
                  aria-label={c.remove(p.title)}
                  className="inline-flex h-11 items-center gap-2 rounded-[4px] border px-3 text-[15px] text-text hover:border-accent hover:text-accent-text"
                  style={rule}
                >
                  <span className="max-w-[12rem] truncate sm:max-w-none">{p.title}</span>
                  <svg aria-hidden width="10" height="10" viewBox="0 0 10 10">
                    <path d="M1 1l8 8M9 1 1 9" stroke="currentColor" strokeWidth="1.5" fill="none" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
          <div className="flex items-center gap-3">
            <Button variant="secondary" className="!h-11 !px-5" onClick={onClear}>
              {c.clear}
            </Button>
            <Button className="!h-11 !px-5" onClick={() => setOpen((o) => !o)} aria-expanded={open} disabled={list.length < 2}>
              {open ? c.close : c.open}
            </Button>
          </div>
        </div>
      </aside>
    </>
  );
}
