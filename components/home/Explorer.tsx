"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { loadGsap } from "@/lib/gsap";
import { SceneSlot } from "@/components/three/SceneSlot";
import { SegmentedControl } from "@/components/ds/Controls";
import { Software } from "@/components/ds/Chips";
import { SheetTag } from "@/components/ds/Devices";
import { LODS, lodNotes, newState, type Isolate } from "@/lib/modelState";
import { disciplines } from "@/content/floors";
import { copy } from "@/content/copy";
import { useReduceMotion } from "@/hooks/useReduceMotion";
import { cn } from "@/lib/utils";

const WEEKS = 40;
const items: { id: Isolate; label: string }[] = [{ id: "all", label: "Whole model" }, ...disciplines.map((d) => ({ id: d.id, label: d.label }))];

// S2. Ink, full bleed. The model in night mode in the middle, a drawing index on the left, one info panel on the right.
export function Explorer() {
  const state = useRef(newState({ lod: 300, mood: 1 }));
  const tl = useRef<{ kill: () => void } | null>(null);
  const reduce = useReduceMotion();
  const [active, setActive] = useState<Isolate>("all");
  const [lod, setLod] = useState<number>(300);
  const [week, setWeek] = useState(0);
  const [resolved, setResolved] = useState(false);
  const current = disciplines.find((d) => d.id === active);
  const c = copy.explorer;

  useEffect(() => () => void tl.current?.kill(), []);

  async function select(id: Isolate) {
    const s = state.current;
    tl.current?.kill();
    Object.assign(s, { isolate: id, clash: -1, sim: -1, focus: 0 });
    setActive(id);
    setResolved(false);
    const { gsap } = await loadGsap();
    if (id === "clash") {
      if (reduce) {
        Object.assign(s, { clash: 0.2, focus: 1 });
      } else {
        const t = gsap.timeline({ repeat: -1, repeatDelay: 1 });
        gsap.to(s, { focus: 1, duration: 1.2, ease: "power3.inOut" });
        t.fromTo(s, { clash: 0 }, { clash: 0.5, duration: 1.4, ease: "none" })
          .to(s, { clash: 1, duration: 1.4, ease: "power2.inOut", onStart: () => setResolved(true) })
          .to({}, { duration: 1.6 })
          .call(() => setResolved(false));
        tl.current = t;
      }
    }
    if (id === "4d") {
      if (reduce) {
        s.sim = 1;
        setWeek(WEEKS);
      } else {
        s.sim = 0;
        setWeek(0);
        tl.current = gsap.to(s, { sim: 1, duration: 7, ease: "none", onUpdate: () => setWeek(Math.round(s.sim * WEEKS)) });
      }
    }
  }

  function scrub(w: number) {
    tl.current?.kill();
    setWeek(w);
    state.current.sim = w / WEEKS;
  }

  const rule = { borderColor: "var(--rule)" };

  return (
    <section id="explorer" aria-labelledby="explorer-title" className="theme-dark relative overflow-hidden pb-20 pt-14 lg:pb-24 lg:pt-16">
      <div className="wrap">
        <div className="flex items-end justify-between gap-6">
          <SheetTag sheet={c.sheet} name={c.name} />
          <p className="mono hidden sm:block">{c.hint}</p>
        </div>
        <h2 id="explorer-title" className="sr-only">
          {c.title}
        </h2>

        <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-6">
          {/* Drawing index (desktop: vertical list, phones: chip row) */}
          <div role="group" aria-label="Isolate a discipline" className="order-2 min-w-0 lg:order-1 lg:col-span-3">
            <ol className="fade-edges -mx-5 flex gap-2 overflow-x-auto px-5 pb-1 lg:mx-0 lg:block lg:overflow-visible lg:px-0 lg:[mask-image:none]">
              {items.map((b, i) => (
                <li key={b.id} className="shrink-0 lg:border-b" style={rule}>
                  <button
                    type="button"
                    aria-pressed={active === b.id}
                    onClick={() => select(b.id)}
                    className={cn(
                      "flex h-11 items-center gap-4 rounded-[4px] border px-4 text-[15px] transition-colors duration-200 lg:h-14 lg:w-full lg:rounded-none lg:border-0 lg:px-0",
                      active === b.id ? "border-accent text-text lg:border-l-2 lg:ps-4" : "text-muted hover:text-text",
                    )}
                    style={active === b.id ? { borderColor: "var(--accent)" } : rule}
                  >
                    <span className="mono hidden lg:inline">{String(i).padStart(2, "0")}</span>
                    {b.label}
                  </button>
                </li>
              ))}
            </ol>
          </div>

          {/* The model */}
          <div className="relative order-1 min-w-0 lg:order-2 lg:col-span-6">
            <SceneSlot stateRef={state} interactive autoRotate={active === "all"} rotateSpeed={0.08} fit={1} label={c.modelAlt} className="h-[56svh] min-h-[380px] lg:h-[min(62svh,680px)]" />
            {active === "clash" && (
              <p className="absolute start-0 top-0 flex items-center gap-3 rounded-[4px] border bg-ink/85 px-4 py-2.5 text-[14px] text-text" style={rule} role="status">
                <span
                  aria-hidden
                  className={cn("inline-block size-3 rounded-full border-2", resolved ? "border-accent" : "animate-pulse border-clash")}
                />
                <span className="mono !text-text">{c.clash.id}</span>
                <span className="text-muted">{c.clash.what}</span>
                <span className={cn("font-medium", resolved ? "text-accent-text" : "text-clash")}>{resolved ? `${c.clash.resolved} ✓` : c.clash.open}</span>
              </p>
            )}
            {active === "clash" && reduce && (
              <button
                type="button"
                onClick={() => {
                  state.current.clash = resolved ? 0.2 : 1;
                  setResolved(!resolved);
                }}
                className="mono absolute end-0 top-0 rounded-[4px] border bg-ink/85 px-4 py-3 !text-text"
                style={rule}
              >
                {resolved ? "Show clash" : "Fix clash"}
              </button>
            )}
            {active === "4d" && (
              <div className="absolute inset-x-0 bottom-0 rounded-[4px] border bg-ink/85 px-5 py-4" style={rule}>
                <label className="mono flex justify-between !text-text" htmlFor="week">
                  <span>{c.sim.label}</span>
                  <span>{c.sim.week(week, WEEKS)}</span>
                </label>
                <input id="week" type="range" min={0} max={WEEKS} value={week} onChange={(e) => scrub(Number(e.target.value))} className="mt-3 w-full accent-[var(--accent)]" />
              </div>
            )}
          </div>

          {/* Info panel */}
          <div key={active} className="slide-in order-3 min-w-0 lg:col-span-3" aria-live="polite">
            <div className="border-t pt-6" style={rule}>
              {current ? (
                <>
                  <h3 className="!text-[1.5rem]">{current.label}</h3>
                  <p className="mt-4 text-muted">{current.sentence}</p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {current.software.map((s) => (
                      <Software key={s}>{s}</Software>
                    ))}
                  </div>
                  <Link prefetch={false} href={`/programs/${current.slug}`} className="ul-draw group mt-7 inline-flex items-center gap-2 pb-1 text-[15px] font-medium text-text hover:text-accent-text">
                    {c.view}
                    <svg aria-hidden width="16" height="12" viewBox="0 0 16 12" className="transition-transform duration-200 group-hover:translate-x-0.5">
                      <path d="M0 6h14M9 1l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.5" />
                    </svg>
                  </Link>
                  <p className="mono mt-4">{current.program}</p>
                </>
              ) : (
                <>
                  <h3 className="!text-[1.5rem]">{c.all.title}</h3>
                  <p className="mt-4 text-muted">{c.all.text}</p>
                </>
              )}
            </div>
          </div>
        </div>

        {/* LOD control, centered under the model */}
        <div className="mt-10 flex flex-col items-center gap-4 text-center">
          <SegmentedControl label={c.lodLabel} value={String(lod)} onChange={(v) => { setLod(Number(v)); state.current.lod = Number(v); }} options={LODS.map((l) => ({ id: String(l), label: String(l) }))} />
          <p className="t-small max-w-md text-dim" aria-live="polite">
            <span className="mono me-3 !text-text">LOD {lod}</span>
            {lodNotes[lod]}
          </p>
        </div>
      </div>
    </section>
  );
}
