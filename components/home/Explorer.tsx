"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { loadGsap } from "@/lib/gsap";
import { SceneSlot } from "@/components/three/SceneSlot";
import { Slab } from "@/components/ui/Slab";
import { BlueprintLayer } from "@/components/ui/BlueprintLayer";
import { Badge } from "@/components/ui/Badge";
import { LODS, lodNotes, newState, type Isolate } from "@/lib/modelState";
import { disciplines } from "@/content/floors";
import { useReduceMotion } from "@/hooks/useReduceMotion";
import { cn } from "@/lib/utils";

const WEEKS = 40;
const buttons: { id: Isolate; label: string }[] = [{ id: "all", label: "Whole model" }, ...disciplines.map((d) => ({ id: d.id, label: d.label }))];

export function Explorer() {
  const state = useRef(newState({ lod: 300 }));
  const tl = useRef<{ kill: () => void } | null>(null);
  const reduce = useReduceMotion();
  const [active, setActive] = useState<Isolate>("all");
  const [lod, setLod] = useState<number>(300);
  const [week, setWeek] = useState(0);
  const [resolved, setResolved] = useState(false);
  const current = disciplines.find((d) => d.id === active);

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
        // Loop: red clash, pause, reroute to green, pause, again.
        const t = gsap.timeline({ repeat: -1, repeatDelay: 0.8 });
        s.focus = 0;
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

  function changeLod(l: number) {
    setLod(l);
    state.current.lod = l;
  }

  return (
    <section id="ch-2" aria-labelledby="explorer-title" className="theme-dark relative overflow-hidden py-20 md:py-32">
      <BlueprintLayer className="drift pointer-events-none absolute inset-0 h-full w-full text-[#7db3e8] opacity-[0.07]" />
      <div aria-hidden className="glow-layer pointer-events-none absolute end-[-10%] top-1/2 size-[760px] -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(90,160,225,0.22),transparent_65%)]" />
      <div className="relative z-10 mx-auto grid max-w-[1280px] gap-10 px-5 md:px-8 lg:grid-cols-12">
        <div className="relative z-10 lg:col-span-4">
          <Slab>
            <p className="label mb-5">02 · The model</p>
            <h2 id="explorer-title" className="display-md">Rotate it. Strip it back. See what we teach.</h2>
            <p className="mt-6 max-w-sm text-muted">Pick a discipline to isolate it. Drag the building to turn it.</p>
          </Slab>

          <div role="group" aria-label="Isolate a discipline" className="fade-edges -mx-5 mt-8 flex gap-2 overflow-x-auto px-5 pb-1 md:mx-0 md:flex-wrap md:overflow-visible md:px-0 md:[mask-image:none]">
            {buttons.map((b) => (
              <button
                key={b.id}
                type="button"
                aria-pressed={active === b.id}
                onClick={() => select(b.id)}
                className={cn("min-h-11 rounded-lg border px-4 py-2.5 text-[14px] font-medium transition-colors", active === b.id ? "border-accent bg-accent/15 text-accent-text" : "border-border text-muted hover:border-text hover:text-text")}
              >
                {b.label}
              </button>
            ))}
          </div>

          <div key={active} className="glass slide-in mt-8 min-h-[190px] p-6" aria-live="polite">
            {current ? (
              <>
                <p className="meta mb-3">{current.label}</p>
                <p>{current.sentence}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {current.software.map((s) => <Badge key={s}>{s}</Badge>)}
                </div>
                <Link prefetch={false} href={`/programs/${current.slug}`} className="mt-5 inline-block text-sm text-accent-text underline underline-offset-8">
                  {current.program} <span aria-hidden>→</span>
                </Link>
              </>
            ) : (
              <>
                <p className="meta mb-3">Whole model</p>
                <p>Structure, ducts, pipes and cable trays, all in one coordinated model. This is what BIM looks like inside.</p>
              </>
            )}
          </div>
        </div>

        <div className="relative lg:col-span-8">
          <SceneSlot
            stateRef={state}
            interactive
            autoRotate={active === "all"}
            label="Interactive 3D building. Drag to rotate. Use the buttons to isolate a discipline."
            className="h-[62svh] min-h-[420px] lg:h-[78svh]"
          />

          {active === "clash" && (
            <p className="glass absolute start-4 top-4 z-10 rounded-lg px-4 py-2.5 text-[14px] text-text" role="status">
              CLASH #0147 · DUCT vs BEAM · 120mm
              <span className={cn("ms-3 font-medium", resolved ? "text-[#d9b06a]" : "text-[#ff6b60]")}>{resolved ? "✓ RESOLVED" : "OPEN"}</span>
            </p>
          )}
          {active === "clash" && reduce && (
            <button type="button" onClick={() => { state.current.clash = resolved ? 0.2 : 1; setResolved(!resolved); }} className="glass absolute end-4 top-4 z-10 px-4 py-2 text-sm uppercase tracking-widest">
              {resolved ? "Show clash" : "Fix clash"}
            </button>
          )}

          {active === "4d" && (
            <div className="glass absolute inset-x-4 bottom-4 z-10 px-5 py-4">
              <label className="meta flex justify-between" htmlFor="week">
                <span>Construction schedule</span>
                <span>Week {week} / {WEEKS}</span>
              </label>
              <input id="week" type="range" min={0} max={WEEKS} value={week} onChange={(e) => scrub(Number(e.target.value))} className="mt-3 w-full accent-[var(--accent)]" />
            </div>
          )}

          <div className="relative z-10 mt-6 flex flex-wrap items-center gap-x-8 gap-y-3">
            <span className="meta">Level of development</span>
            <div role="group" aria-label="Level of development" className="flex">
              {LODS.map((l) => (
                <button
                  key={l}
                  type="button"
                  aria-pressed={lod === l}
                  onClick={() => changeLod(l)}
                  className={cn("min-h-11 border border-e-0 px-4 py-2 text-sm tabular-nums first:rounded-s-lg last:rounded-e-lg last:border-e", lod === l ? "border-accent bg-accent/15 text-accent-text" : "border-border text-muted hover:text-text")}
                >
                  {l}
                </button>
              ))}
            </div>
            <p className="text-sm text-muted" aria-live="polite">{lodNotes[lod]}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
