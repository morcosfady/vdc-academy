"use client";

import { useMemo, useState } from "react";
import { programs } from "@/content/programs";
import { programMeta } from "@/content/floors";
import { cover } from "@/content/media";
import { pages } from "@/content/copy-pages";
import { money } from "@/lib/pricing";
import { ProgramCard } from "@/components/ds/Cards";
import { Chip } from "@/components/ds/Chips";
import { Tabs } from "@/components/ds/Controls";
import { Drawer } from "@/components/ds/Overlays";
import { Button } from "@/components/ui/Button";
import { CompareTray } from "./CompareTray";
import { sheetOf } from "./sheet";
import { cn } from "@/lib/utils";

const c = pages.programs;
const levels = ["Beginner", "Intermediate", "Advanced"] as const;
const disciplines = [...new Set(Object.values(programMeta).flatMap((m) => m.disciplines))];
const software = [...new Set(programs.flatMap((p) => p.software))];
const formats = [...new Set(programs.map((p) => p.format).filter((f): f is string => f !== null))];

function FilterGroup({ label, options, value, onChange }: { label: string; options: readonly string[]; value: string | null; onChange: (v: string | null) => void }) {
  return (
    <div className="border-t py-5 first:border-t-0 first:pt-0" style={{ borderColor: "var(--rule)" }}>
      <p className="mono mb-3">{label}</p>
      <div className="flex flex-wrap gap-2" role="group" aria-label={label}>
        {options.map((o) => (
          <Chip key={o} active={value === o} onClick={() => onChange(value === o ? null : o)}>
            {o}
          </Chip>
        ))}
      </div>
    </div>
  );
}

// All programs as drawing sheets. Level tabs inline, the other filters in a drawer, compare inside each card.
export function Catalog() {
  const [level, setLevel] = useState<string>(c.filters.all);
  const [disc, setDisc] = useState<string | null>(null);
  const [soft, setSoft] = useState<string | null>(null);
  const [format, setFormat] = useState<string | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const [drawer, setDrawer] = useState(false);

  const list = useMemo(
    () =>
      programs.filter(
        (p) =>
          (level === c.filters.all || p.level === level || p.level === "All levels") &&
          (!disc || programMeta[p.slug]?.disciplines.includes(disc)) &&
          (!soft || p.software.includes(soft)) &&
          (!format || p.format === format),
      ),
    [level, disc, soft, format],
  );
  const active = [disc, soft, format].filter(Boolean).length;
  const filtered = level !== c.filters.all || active > 0;
  const full = picked.length >= 3;

  function toggle(slug: string) {
    setPicked((s) => (s.includes(slug) ? s.filter((x) => x !== slug) : full ? s : [...s, slug]));
  }
  function clear() {
    setLevel(c.filters.all);
    setDisc(null);
    setSoft(null);
    setFormat(null);
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <Tabs className="flex-1" label={c.filters.level} value={level} onChange={setLevel} tabs={[c.filters.all, ...levels].map((l) => ({ id: l, label: l }))} />
        <Button variant="secondary" className="!h-11 !px-5" onClick={() => setDrawer(true)} aria-haspopup="dialog" aria-expanded={drawer}>
          <svg aria-hidden width="16" height="12" viewBox="0 0 16 12">
            <path d="M0 1h16M3 6h10M6 11h4" stroke="currentColor" strokeWidth="1.5" />
          </svg>
          {c.filters.button}
          {active > 0 && <span className="mono ms-1 rounded-[4px] bg-cta px-1.5 !text-cta-text">{active}</span>}
        </Button>
      </div>

      <Drawer
        open={drawer}
        onClose={() => setDrawer(false)}
        title={c.filters.drawerTitle}
        footer={
          <div className="flex items-center justify-between gap-4">
            <Button variant="link" onClick={() => { setDisc(null); setSoft(null); setFormat(null); }}>
              {c.filters.reset}
            </Button>
            <Button onClick={() => setDrawer(false)}>{c.filters.show(list.length)}</Button>
          </div>
        }
      >
        <FilterGroup label={c.filters.discipline} options={disciplines} value={disc} onChange={setDisc} />
        <FilterGroup label={c.filters.software} options={software} value={soft} onChange={setSoft} />
        {formats.length > 1 && <FilterGroup label={c.filters.format} options={formats} value={format} onChange={setFormat} />}
      </Drawer>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <p className="mono" aria-live="polite">
          {c.count(list.length, programs.length)}
        </p>
        {filtered && (
          <Button variant="link" onClick={clear}>
            {c.clear}
          </Button>
        )}
      </div>

      {list.length === 0 ? (
        <p className="t-lead mt-10">{c.empty}</p>
      ) : (
        <ul key={[level, disc, soft, format].join("|")} className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {list.map((p, i) => {
            const on = picked.includes(p.slug);
            const id = `cmp-${p.slug}`;
            const feat = p.featured && list.length > 1;
            return (
              <li key={p.slug} className={cn("fan-in", feat && "md:col-span-2")} style={{ "--i": i } as React.CSSProperties}>
                <ProgramCard
                  href={`/programs/${p.slug}`}
                  sheet={sheetOf(p)}
                  title={p.title}
                  line={p.summary}
                  level={p.level}
                  software={p.software.slice(0, 3)}
                  photo={cover(p.slug).photo}
                  pos={cover(p.slug).pos}
                  price={p.priceFull !== null ? money(p.priceFull) : undefined}
                  featured={feat}
                  footer={
                    <label htmlFor={id} className={cn("inline-flex min-h-9 cursor-pointer items-center gap-3 text-[15px]", !on && full ? "cursor-not-allowed text-dim" : "text-text")}>
                      <input id={id} type="checkbox" checked={on} disabled={!on && full} onChange={() => toggle(p.slug)} className="size-4 accent-[var(--accent)]" />
                      <span className="mono !text-current">{!on && full ? c.compare.full : c.compare.add}</span>
                    </label>
                  }
                />
              </li>
            );
          })}
        </ul>
      )}

      <CompareTray slugs={picked} onRemove={(s) => setPicked((x) => x.filter((y) => y !== s))} onClear={() => setPicked([])} />
    </div>
  );
}
