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
import { Button } from "@/components/ui/Button";
import { CompareTray } from "./CompareTray";
import { sheetOf } from "./sheet";

const c = pages.programs;
const levels = ["Beginner", "Intermediate", "Advanced"] as const;
const disciplines = [...new Set(Object.values(programMeta).flatMap((m) => m.disciplines))];
const software = [...new Set(programs.flatMap((p) => p.software))];
const formats = [...new Set(programs.map((p) => p.format).filter((f): f is string => f !== null))];

function FilterRow({ label, options, value, onChange }: { label: string; options: readonly string[]; value: string | null; onChange: (v: string | null) => void }) {
  return (
    <div className="grid gap-3 border-t py-5 md:grid-cols-[120px_1fr] md:items-start" style={{ borderColor: "var(--rule)" }}>
      <p className="mono pt-3">{label}</p>
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

// All programs as drawing sheets. Filter above, compare tray below (up to three).
export function Catalog() {
  const [level, setLevel] = useState<string>(c.filters.all);
  const [disc, setDisc] = useState<string | null>(null);
  const [soft, setSoft] = useState<string | null>(null);
  const [format, setFormat] = useState<string | null>(null);
  const [picked, setPicked] = useState<string[]>([]);

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
  const filtered = level !== c.filters.all || disc || soft || format;
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
      <Tabs label={c.filters.level} value={level} onChange={setLevel} tabs={[c.filters.all, ...levels].map((l) => ({ id: l, label: l }))} />
      <div className="mt-2">
        <FilterRow label={c.filters.discipline} options={disciplines} value={disc} onChange={setDisc} />
        <FilterRow label={c.filters.software} options={software} value={soft} onChange={setSoft} />
        {formats.length > 1 && <FilterRow label={c.filters.format} options={formats} value={format} onChange={setFormat} />}
      </div>

      <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t pt-6" style={{ borderColor: "var(--rule)" }}>
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
        <ul key={[level, disc, soft, format].join("|")} className="mt-8 grid gap-x-6 gap-y-10 md:grid-cols-2 lg:grid-cols-3">
          {list.map((p, i) => {
            const on = picked.includes(p.slug);
            const id = `cmp-${p.slug}`;
            return (
              <li key={p.slug} className="fan-in flex flex-col" style={{ "--i": i } as React.CSSProperties}>
                <ProgramCard
                  className="flex-1"
                  href={`/programs/${p.slug}`}
                  sheet={sheetOf(p)}
                  title={p.title}
                  line={p.summary}
                  level={p.level}
                  software={p.software.slice(0, 3)}
                  photo={cover(p.slug).photo}
                  pos={cover(p.slug).pos}
                  price={p.priceFull !== null ? money(p.priceFull) : undefined}
                />
                <label htmlFor={id} className={`mt-3 inline-flex min-h-11 w-fit cursor-pointer items-center gap-3 text-[15px] ${!on && full ? "cursor-not-allowed text-dim" : "text-text"}`}>
                  <input id={id} type="checkbox" checked={on} disabled={!on && full} onChange={() => toggle(p.slug)} className="size-4 accent-[var(--accent)]" />
                  <span className="mono !text-current">{!on && full ? c.compare.full : c.compare.add}</span>
                </label>
              </li>
            );
          })}
        </ul>
      )}

      <CompareTray slugs={picked} onRemove={(s) => setPicked((x) => x.filter((y) => y !== s))} onClear={() => setPicked([])} />
    </div>
  );
}
