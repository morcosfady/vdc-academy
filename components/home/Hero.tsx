"use client";

import { useEffect, useRef } from "react";
import { loadGsap } from "@/lib/gsap";
import { Button } from "@/components/ui/Button";
import { RiseLines } from "@/components/ui/RiseLines";
import { SceneSlot } from "@/components/three/SceneSlot";
import { newState } from "@/lib/modelState";
import { content, shown } from "@/content/site";
import { site } from "@/config/site";
import { useReduceMotion } from "@/hooks/useReduceMotion";

const lines = ["Build it digitally.", "Then build", "your career."];

export function Hero() {
  const section = useRef<HTMLElement>(null);
  const state = useRef(newState({ build: 0, lod: 300 }));
  const reduce = useReduceMotion();
  const cohort = shown(content.nextCohort);

  // Scroll hands the building off to the next chapter: it turns and the floors start to separate.
  useEffect(() => {
    if (reduce) return;
    const s = state.current;
    let kill = () => {};
    let cancelled = false;
    loadGsap().then(({ ScrollTrigger }) => {
      if (cancelled) return;
      const st = ScrollTrigger.create({
        trigger: section.current,
        start: "top top",
        end: "bottom top",
        scrub: 0.6,
        onUpdate: (self) => {
          s.yaw = self.progress * 0.55;
          s.explode = self.progress * 0.5;
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
    <section ref={section} id="ch-1" className="relative overflow-hidden lg:min-h-[100svh]">
      <div className="relative z-10 mx-auto flex max-w-[1600px] flex-col justify-between px-5 pb-6 pt-28 md:px-10 lg:min-h-[100svh] lg:pt-36">
        <div>
          <h1 className="max-w-[14ch] text-[clamp(2.4rem,6.2vw,6.2rem)]" aria-label="Build it digitally. Then build your career.">
            <RiseLines lines={lines} />
          </h1>
          <p className="mt-6 max-w-md text-lg text-muted md:mt-8">
            Hands-on BIM and VDC training in Revit, Navisworks and virtual construction, from the team at Bay BIM Designs.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-4">
            <Button href="/apply" variant="glow" magnetic>
              Apply now
            </Button>
            <Button href="/programs" variant="link">
              Explore programs <span aria-hidden>→</span>
            </Button>
          </div>
        </div>

        <div className="mt-10 hidden items-end justify-between gap-6 lg:mt-16 lg:flex">
          <div className="label space-y-1">
            <p>{site.coords} · Fort Worth, TX</p>
            {cohort && <p>Next cohort · {cohort}</p>}
          </div>
          <div aria-hidden className="flex flex-col items-center gap-2">
            <span className="label">Scroll</span>
            <span className="scroll-cue block h-12 w-px bg-text/50" />
          </div>
        </div>
      </div>

      {/* Mobile: the building sits under the text. Desktop: it fills the right side. */}
      <SceneSlot
        stateRef={state}
        autoBuild
        buildSeconds={4.5}
        label="3D glass building made of offset, stepped floors, with structure, ducts, pipes and cable trays visible inside"
        className="relative z-0 h-[58svh] lg:absolute lg:inset-y-0 lg:start-[40%] lg:h-auto"
      />
    </section>
  );
}
