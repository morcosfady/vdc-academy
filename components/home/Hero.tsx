"use client";

import { useEffect, useRef, useState } from "react";
import { copy } from "@/content/copy";
import { programs } from "@/content/programs";
import { site } from "@/config/site";
import { SceneSlot } from "@/components/three/SceneSlot";
import { BUBBLE_FLOORS } from "@/components/three/StudyModel";
import { newState } from "@/lib/modelState";
import { loadGsap } from "@/lib/gsap";
import { afterInteraction } from "@/lib/interaction";
import { Button } from "@/components/ui/Button";
import { DimensionString, SheetTag } from "@/components/ds/Devices";
import { FactRow } from "@/components/ds/Sections";
import { useReduceMotion } from "@/hooks/useReduceMotion";
import { cn } from "@/lib/utils";

const seen = () => {
  try {
    return sessionStorage.getItem("vdc-intro") === "1";
  } catch {
    return false;
  }
};

// A grid bubble that is a real control: hover or focus previews, click keeps it on.
function Bubble({ label, pressed, onEnter, onLeave, onToggle, aria }: { label: string; pressed: boolean; onEnter: () => void; onLeave: () => void; onToggle: () => void; aria: string }) {
  return (
    <button
      type="button"
      aria-label={aria}
      aria-pressed={pressed}
      onPointerEnter={onEnter}
      onPointerLeave={onLeave}
      onFocus={onEnter}
      onBlur={onLeave}
      onClick={onToggle}
      className={cn(
        "mono grid size-9 place-items-center rounded-full border transition-[background-color,color,border-color] duration-200 hover:border-accent hover:!text-accent-text focus-visible:border-accent",
        pressed ? "border-transparent bg-cta !text-cta-text hover:!text-cta-text" : "border-current !text-slate",
      )}
      style={{ fontSize: 11 }}
    >
      {label}
    </button>
  );
}

// S1. Paper. Text in columns 1 to 6, the white study model in columns 7 to 12. They never share space.
export function Hero() {
  const section = useRef<HTMLElement>(null);
  const state = useRef(newState({ build: 0, lod: 300, mood: 0 }));
  const reduce = useReduceMotion();
  const c = copy.hero;
  // Grid controls: A, B, C highlight a column axis; 1, 2, 3 isolate a floor. `held` is the clicked one, hover previews.
  const [axis, setAxis] = useState<{ held: number; hover: number }>({ held: -1, hover: -1 });
  const [floor, setFloor] = useState<{ held: number; hover: number }>({ held: -1, hover: -1 });

  useEffect(() => {
    state.current.axis = axis.hover >= 0 ? axis.hover : axis.held;
  }, [axis]);
  useEffect(() => {
    state.current.floor = floor.hover >= 0 ? floor.hover : floor.held;
  }, [floor]);

  useEffect(() => {
    if (seen()) state.current.build = 1;
    const t = window.setTimeout(() => {
      try {
        sessionStorage.setItem("vdc-intro", "1");
      } catch {}
    }, 2000);
    return () => window.clearTimeout(t);
  }, []);

  // Hero to explorer: as the hero scrolls out, paper crossfades to ink, the model turns to night and the camera moves in.
  useEffect(() => {
    if (reduce) return;
    const el = section.current;
    const s = state.current;
    let kill = () => {};
    let cancelled = false;
    afterInteraction(6000).then(loadGsap).then(({ ScrollTrigger }) => {
      if (cancelled || !el) return;
      const st = ScrollTrigger.create({
        trigger: el,
        start: "top top",
        end: "bottom top",
        scrub: 0.5,
        onUpdate: (self) => {
          const p = self.progress;
          el.style.setProperty("--p", String(p));
          s.mood = Math.min(1, p * 1.4);
          s.dolly = p;
          s.yaw = p * 0.5;
        },
      });
      kill = () => st.kill();
    });
    return () => {
      cancelled = true;
      kill();
    };
  }, [reduce]);

  return (
    <section ref={section} id="hero" className="theme-light hero relative overflow-hidden" style={{ "--p": 0 } as React.CSSProperties}>
      <div className="wrap relative flex min-h-[100svh] flex-col pt-[72px] lg:min-h-[max(100svh,720px)]">
        <div className="grid-12 flex-1 items-center gap-y-12 py-12 lg:py-0">
          <div className="hero-copy col-span-12 lg:col-span-6">
            <SheetTag sheet={c.sheet} name={c.name} />
            <h1 className="t-display mt-8 max-w-[12ch]" aria-label={c.headline.join(" ")}>
              {c.headline.join(" ")}
            </h1>
            <p className="t-lead mt-7 max-w-[30rem]">
              {c.lead}
            </p>
            <div className="mt-9 flex flex-col gap-5 sm:flex-row sm:items-center">
              <Button href="/apply" className="sm:w-auto">
                {c.primary}
              </Button>
              <Button href="/programs" variant="link">
                {c.secondary}
              </Button>
            </div>
            <FactRow
              className="mt-12"
              items={[
                c.facts.programs(programs.length),
                c.facts.live,
                <span key="g">
                  Fresh grads save <span className="font-medium text-warm">{site.freshGradMaxDiscount}%</span>
                </span>,
              ]}
            />
          </div>

          <div className="col-span-12 lg:col-span-6">
            {/* The model sits in a frame with the grid bubbles on its edges: A, B, C across the top, 1, 2, 3 down the side. The frame keeps every bubble inside the column. */}
            <div className="relative mx-auto w-[72%] sm:w-[60%] lg:w-full lg:pe-12 lg:pt-12">
              <div role="group" aria-label="Grid lines" className="absolute inset-x-[10%] top-0 hidden justify-between lg:flex lg:pe-12">
                {["A", "B", "C"].map((l, i) => (
                  <Bubble
                    key={l}
                    label={l}
                    aria={`Highlight grid line ${l}`}
                    pressed={axis.held === i}
                    onEnter={() => setAxis((a) => ({ ...a, hover: i }))}
                    onLeave={() => setAxis((a) => ({ ...a, hover: -1 }))}
                    onToggle={() => setAxis((a) => ({ held: a.held === i ? -1 : i, hover: -1 }))}
                  />
                ))}
              </div>
              <div role="group" aria-label="Floors" className="absolute inset-y-[14%] end-0 hidden flex-col justify-between lg:flex">
                {["1", "2", "3"].map((l, i) => (
                  <Bubble
                    key={l}
                    label={l}
                    aria={`Isolate floor ${BUBBLE_FLOORS[i] + 1}`}
                    pressed={floor.held === BUBBLE_FLOORS[i]}
                    onEnter={() => setFloor((f) => ({ ...f, hover: BUBBLE_FLOORS[i] }))}
                    onLeave={() => setFloor((f) => ({ ...f, hover: -1 }))}
                    onToggle={() => setFloor((f) => ({ held: f.held === BUBBLE_FLOORS[i] ? -1 : BUBBLE_FLOORS[i], hover: -1 }))}
                  />
                ))}
              </div>
              <SceneSlot stateRef={state} autoBuild buildSeconds={1.6} rotateSpeed={0.105} interactive tilt priority label={c.modelAlt} className="aspect-square lg:aspect-[5/4]" />
            </div>
            <DimensionString label="7 storeys · LOD 300" className="mx-auto mt-5 w-[72%] sm:w-[60%] lg:w-full lg:pe-12" />
          </div>
        </div>

        <div className="rule-t flex items-center justify-between gap-6 py-5">
          <span className="mono">{c.footer[0]}</span>
          <span className="mono hidden sm:inline">{c.footer[1]}</span>
          <span className="mono flex items-center gap-2">
            {c.footer[2]} <span aria-hidden className="cue-arrow inline-block">↓</span>
          </span>
        </div>
      </div>
    </section>
  );
}
