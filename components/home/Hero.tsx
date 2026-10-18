"use client";

import { useEffect, useRef } from "react";
import { copy } from "@/content/copy";
import { programs } from "@/content/programs";
import { site } from "@/config/site";
import { SceneSlot } from "@/components/three/SceneSlot";
import { newState } from "@/lib/modelState";
import { loadGsap } from "@/lib/gsap";
import { Button } from "@/components/ui/Button";
import { RiseLines } from "@/components/ui/RiseLines";
import { DimensionString, GridBubble, SheetTag } from "@/components/ds/Devices";
import { FactRow } from "@/components/ds/Sections";
import { useReduceMotion } from "@/hooks/useReduceMotion";

const seen = () => {
  try {
    return sessionStorage.getItem("vdc-intro") === "1";
  } catch {
    return false;
  }
};

// S1. Paper. Text in columns 1 to 6, the white study model in columns 7 to 12. They never share space.
export function Hero() {
  const section = useRef<HTMLElement>(null);
  const state = useRef(newState({ build: 0, lod: 300, mood: 0 }));
  const reduce = useReduceMotion();
  const c = copy.hero;

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
    loadGsap().then(({ ScrollTrigger }) => {
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

  const d = (s: number) => ({ "--d": `${s}s` }) as React.CSSProperties;

  return (
    <section ref={section} id="hero" className="theme-light hero relative overflow-hidden" style={{ "--p": 0 } as React.CSSProperties}>
      <div className="wrap relative flex min-h-[100svh] flex-col pt-[72px] lg:min-h-[max(100svh,720px)]">
        <div className="grid-12 flex-1 items-center gap-y-12 py-12 lg:py-0">
          <div className="hero-copy col-span-12 lg:col-span-6">
            <SheetTag sheet={c.sheet} name={c.name} className="fade-up" />
            <h1 className="t-display mt-8 max-w-[13ch]" aria-label={c.headline.join(" ")}>
              <RiseLines lines={c.headline} delay={0.3} />
            </h1>
            <p className="t-lead fade-up mt-7 max-w-[30rem]" style={d(0.75)}>
              {c.lead}
            </p>
            <div className="fade-up mt-9 flex flex-col gap-5 sm:flex-row sm:items-center" style={d(0.9)}>
              <Button href="/apply" className="sm:w-auto">
                {c.primary}
              </Button>
              <Button href="/programs" variant="link">
                {c.secondary}
              </Button>
            </div>
            <FactRow
              className="fade-up mt-12"
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
            <div className="model-in relative mx-auto w-[72%] sm:w-[60%] lg:w-full">
              {/* Grid bubbles: A, B, C across the top and 1, 2, 3 down the side, like a structural grid */}
              <div aria-hidden className="absolute inset-x-[12%] -top-9 hidden justify-between text-slate lg:flex">
                {["A", "B", "C"].map((l) => (
                  <GridBubble key={l} label={l} />
                ))}
              </div>
              <div aria-hidden className="absolute -end-10 inset-y-[14%] hidden flex-col justify-between text-slate lg:flex">
                {["1", "2", "3"].map((l) => (
                  <GridBubble key={l} label={l} />
                ))}
              </div>
              <SceneSlot stateRef={state} autoBuild buildSeconds={1.6} rotateSpeed={0.105} priority label={c.modelAlt} className="aspect-square lg:aspect-[5/4]" />
            </div>
            <DimensionString label="7 storeys · LOD 300" className="fade-up mx-auto mt-5 w-[72%] sm:w-[60%] lg:w-full" />
          </div>
        </div>

        <div className="rule-t flex items-center justify-between gap-6 py-5">
          <span className="mono">{c.footer[0]}</span>
          <span className="mono hidden sm:inline">{c.footer[1]}</span>
          <span className="mono flex items-center gap-2">
            {c.footer[2]} <span aria-hidden className="cue-dot inline-block">↓</span>
          </span>
        </div>
      </div>
    </section>
  );
}
