"use client";

import { useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { SceneSlot } from "@/components/three/SceneSlot";
import { programs, type Program } from "@/content/programs";
import { floors, programMeta } from "@/content/floors";
import { newState } from "@/lib/modelState";
import { discounts } from "@/config/discounts";
import { cn } from "@/lib/utils";
import { ProgramCard } from "./ProgramCard";

type Mode = "floors" | "filter";
const levels = ["Beginner", "Intermediate", "Advanced"] as const;
const allDisciplines = [...new Set(Object.values(programMeta).flatMap((m) => m.disciplines))];
const allSoftware = [...new Set(programs.flatMap((p) => p.software))];

const bySlug = (slug: string) => programs.find((p) => p.slug === slug) as Program;

function Toggle({ on, onChange, children }: { on: boolean; onChange: (v: boolean) => void; children: React.ReactNode }) {
  return (
    <button type="button" role="switch" aria-checked={on} onClick={() => onChange(!on)} className="flex items-center gap-3 text-sm">
      <span className={cn("relative h-6 w-11 border transition-colors", on ? "border-accent bg-accent/30" : "border-border")}>
        <span className={cn("absolute top-0.5 size-4 bg-text transition-all", on ? "start-6" : "start-0.5")} />
      </span>
      {children}
    </button>
  );
}

function Chips<T extends string>({ label, options, value, onChange }: { label: string; options: readonly T[]; value: T | null; onChange: (v: T | null) => void }) {
  return (
    <div>
      <p className="label mb-3">{label}</p>
      <div className="flex flex-wrap gap-2" role="group" aria-label={label}>
        {options.map((o) => (
          <button
            key={o}
            type="button"
            aria-pressed={value === o}
            onClick={() => onChange(value === o ? null : o)}
            className={cn("border px-3.5 py-2 text-xs uppercase tracking-[0.1em] transition-colors", value === o ? "border-accent bg-accent/15 text-accent-text" : "border-border text-muted hover:text-text")}
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}

export function Finder({ compact = false }: { compact?: boolean }) {
  const [mode, setMode] = useState<Mode>("floors");
  const [floor, setFloor] = useState(1);
  const [level, setLevel] = useState<(typeof levels)[number] | null>(null);
  const [disc, setDisc] = useState<string | null>(null);
  const [soft, setSoft] = useState<string | null>(null);
  const [grad, setGrad] = useState(false);
  const state = useRef(newState({ highlight: 1, lod: 300 }));

  function pick(n: number) {
    setFloor(n);
    state.current.highlight = n;
  }

  const results = useMemo(
    () =>
      programs.filter(
        (p) =>
          (!level || p.level === level || p.level === "All levels") &&
          (!disc || programMeta[p.slug]?.disciplines.includes(disc)) &&
          (!soft || p.software.includes(soft)),
      ),
    [level, disc, soft],
  );

  const f = floors[floor];
  const tab = (m: Mode, text: string) => (
    <button
      type="button"
      role="tab"
      aria-selected={mode === m}
      onClick={() => setMode(m)}
      className={cn("border-b-2 px-1 pb-3 text-[12px] uppercase tracking-[0.16em] transition-colors", mode === m ? "border-accent text-text" : "border-transparent text-muted hover:text-text")}
    >
      {text}
    </button>
  );

  return (
    <div>
      <div role="tablist" aria-label="How do you want to find a program?" className="mb-10 flex gap-8 border-b border-border">
        {tab("floors", "Browse by floor")}
        {tab("filter", "I know what I need")}
      </div>

      {mode === "floors" ? (
        <div className="grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <div className="relative">
              {!compact && (
                <SceneSlot
                  stateRef={state}
                  autoRotate
                  label="Stepped building where each floor is a level of the learning path"
                  className="pointer-events-none absolute end-0 top-0 hidden h-[480px] w-[38%] lg:block"
                />
              )}
              <ol className="relative z-10 flex flex-col-reverse gap-2 lg:w-[62%]">
                {floors.map((fl, i) => (
                  <li key={fl.n} style={{ marginInlineStart: `${[0, 18, 6, 22, 10, 26][i]}px` }}>
                    <button
                      type="button"
                      onClick={() => pick(i)}
                      onMouseEnter={() => (state.current.highlight = i)}
                      onFocus={() => (state.current.highlight = i)}
                      aria-pressed={floor === i}
                      className={cn(
                        "glass flex w-full items-baseline justify-between gap-4 px-5 py-4 text-start transition-[border-color,box-shadow,background-color]",
                        floor === i ? "border-accent bg-accent/10 shadow-[0_0_30px_var(--glow)]" : "hover:border-text/40",
                        i === 5 && "shadow-[0_0_40px_var(--glow)]",
                      )}
                    >
                      <span>
                        <span className="label block">Floor {i + 1}</span>
                        <span className="mt-1 block">{fl.title}</span>
                      </span>
                      <span className="label hidden sm:block">{fl.note}</span>
                    </button>
                  </li>
                ))}
              </ol>
            </div>
          </div>

          <div className="lg:col-span-7">
            <p className="label mb-2">Floor {floor + 1}</p>
            <h3 className="display-md mb-8">{f.title}</h3>
            <AnimatePresence mode="wait">
              <motion.ul
                key={floor}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                className="grid gap-5 sm:grid-cols-2"
              >
                {f.slugs.map((s) => (
                  <li key={s}><ProgramCard p={bySlug(s)} freshGrad={grad} /></li>
                ))}
              </motion.ul>
            </AnimatePresence>
            <p className="mt-6 text-sm text-muted">🎓 Fresh grads save up to {discounts.freshGrad.percent}% on every program.</p>
          </div>
        </div>
      ) : (
        <div>
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            <Chips label="Level" options={levels} value={level} onChange={setLevel} />
            <Chips label="Discipline" options={allDisciplines} value={disc} onChange={setDisc} />
            <Chips label="Software" options={allSoftware} value={soft} onChange={setSoft} />
            <div>
              <p className="label mb-3">Price</p>
              <Toggle on={grad} onChange={setGrad}>🎓 Fresh grad price</Toggle>
            </div>
          </div>
          <p className="sr-only" aria-live="polite">{results.length} programs match</p>
          <motion.ul layout className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence>
              {results.map((p) => (
                <motion.li key={p.slug} layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }} transition={{ duration: 0.4 }}>
                  <ProgramCard p={p} freshGrad={grad} />
                </motion.li>
              ))}
            </AnimatePresence>
          </motion.ul>
          {results.length === 0 && <p className="mt-10 text-muted">No program matches all filters. Clear one to see more.</p>}
        </div>
      )}
    </div>
  );
}
