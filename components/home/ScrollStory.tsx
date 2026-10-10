"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { WhenVisible } from "@/components/three/WhenVisible";
import { SceneFallback } from "@/components/three/SceneFallback";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { newModelState } from "@/lib/modelState";
import { useReduceMotion } from "@/hooks/useReduceMotion";
import { cn } from "@/lib/utils";

const StoryScene = dynamic(() => import("@/components/three/StoryScene"), { ssr: false });

const LODS = [100, 200, 300, 350, 400, 500];

const stages = [
  { n: "01", title: "Model", text: "Everything starts as a 3D BIM model. Walls, floors, structure and systems carry real data, not just lines." },
  { n: "02", title: "Coordinate", text: "Each discipline is modeled on its own. An exploded view shows how structure, ducts, pipes and cable trays stack on every floor." },
  { n: "03", title: "Detect clashes", text: "Clash detection flags where a duct runs through a beam. Reroute it in the model, not on the job site, and the marker turns green." },
  { n: "04", title: "Simulate", text: "Link the model to the schedule for a 4D simulation and watch the building go up floor by floor before the first pour." },
];

export function ScrollStory() {
  const section = useRef<HTMLElement>(null);
  const stateRef = useRef(newModelState());
  const reduce = useReduceMotion();
  const [stage, setStage] = useState(0);
  const [lodIdx, setLodIdx] = useState(5);
  const [simPct, setSimPct] = useState(0);

  // Scroll-driven story: pin the section and scrub the model through the four stages.
  useEffect(() => {
    if (reduce) return;
    gsap.registerPlugin(ScrollTrigger);
    const s = stateRef.current;
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: section.current,
          start: "top top",
          end: "+=400%",
          pin: true,
          scrub: 0.6,
          onUpdate: (self) => {
            setStage(Math.min(3, Math.floor(self.progress * 4)));
            setSimPct(Math.round(Math.min(1, Math.max(0, (self.progress - 0.78) / 0.22)) * 100));
          },
        },
      });
      tl.to(s, { explode: 1, duration: 0.5 }, 1.05)
        .to(s, { explode: 0, duration: 0.4 }, 1.6)
        .set(s, { clash: 0 }, 2)
        .to(s, { focus: 1, duration: 0.25 }, 2)
        .to(s, { clash: 1, duration: 0.7 }, 2.25)
        .to(s, { focus: 0, duration: 0.25 }, 2.8)
        .set(s, { sim: 0 }, 3)
        .to(s, { sim: 1, duration: 0.9 }, 3.05);
    }, section);
    return () => {
      ctx.revert();
      Object.assign(s, newModelState({ lod: s.lod }));
    };
  }, [reduce]);

  // Fallback for reduced motion: buttons jump to each stage.
  function jump(i: number) {
    const s = stateRef.current;
    Object.assign(s, newModelState({ lod: s.lod }));
    if (i === 1) s.explode = 1;
    if (i === 2) Object.assign(s, { clash: 0.25, focus: 1 });
    if (i === 3) Object.assign(s, { clash: 1, sim: 1 });
    setStage(i);
    setSimPct(i === 3 ? 100 : 0);
  }

  function changeLod(i: number) {
    setLodIdx(i);
    stateRef.current.lod = LODS[i];
  }

  return (
    <section ref={section} className="relative flex min-h-screen items-center bg-bg pt-20" aria-labelledby="story-title">
      <div className="mx-auto grid w-full max-w-7xl items-center gap-6 px-4 py-10 md:grid-cols-5 md:px-6">
        <WhenVisible
          className="h-[44vh] md:col-span-3 md:h-[78vh]"
          fallback={<SceneFallback />}
          label="3D building model. It is shown first as a single model, then split by discipline, then with a clash between a duct and a beam that gets fixed, then building floor by floor."
        >
          {(active) => <StoryScene active={active} stateRef={stateRef} />}
        </WhenVisible>

        <div className="md:col-span-2">
          <SectionHeader tag="B-201 · WHAT IS BIM & VDC?" title="From model to built, before you build" className="mb-6" />
          <h2 id="story-title" className="sr-only">
            What is BIM and VDC
          </h2>
          <ol className="space-y-3">
            {stages.map((st, i) => (
              <li
                key={st.n}
                className={cn(
                  "rounded-card border p-4 transition",
                  i === stage ? "border-brand-accent bg-surface" : "border-border opacity-60",
                )}
                aria-current={i === stage ? "step" : undefined}
              >
                <p className="font-mono text-xs text-text-muted">{st.n}</p>
                <p className="font-heading text-lg font-bold">{st.title}</p>
                {i === stage && <p className="mt-1 text-sm text-text-muted">{st.text}</p>}
                {i === 3 && stage === 3 && (
                  <div className="mt-3" aria-hidden>
                    <div className="h-2 overflow-hidden rounded-full bg-border">
                      <div className="h-full bg-brand-accent" style={{ width: `${simPct}%` }} />
                    </div>
                    <p className="mt-1 text-xs text-text-muted">4D schedule {simPct}%</p>
                  </div>
                )}
              </li>
            ))}
          </ol>

          {reduce && (
            <div className="mt-4 flex flex-wrap gap-2">
              {stages.map((st, i) => (
                <button
                  key={st.n}
                  type="button"
                  onClick={() => jump(i)}
                  className="rounded-btn border border-border px-3 py-2 text-sm hover:bg-surface"
                >
                  {st.title}
                </button>
              ))}
            </div>
          )}

          <div className="mt-6">
            <label htmlFor="lod" className="mb-2 flex justify-between text-sm">
              <span>Level of Development</span>
              <span className="font-mono">LOD {LODS[lodIdx]}</span>
            </label>
            <input
              id="lod"
              type="range"
              min={0}
              max={5}
              step={1}
              value={lodIdx}
              onChange={(e) => changeLod(Number(e.target.value))}
              className="w-full accent-[var(--brand-accent)]"
              aria-valuetext={`LOD ${LODS[lodIdx]}`}
            />
            <div className="flex justify-between font-mono text-[11px] text-text-muted" aria-hidden>
              {LODS.map((l) => (
                <span key={l}>{l}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
