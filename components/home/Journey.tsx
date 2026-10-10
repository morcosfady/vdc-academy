"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SceneSlot } from "@/components/three/SceneSlot";
import { Slab } from "@/components/ui/Slab";
import { Button } from "@/components/ui/Button";
import { newState } from "@/lib/modelState";
import { useReduceMotion } from "@/hooks/useReduceMotion";
import { cn } from "@/lib/utils";

export const journey = [
  { title: "Foundations", role: "BIM Trainee", text: "Learn BIM concepts and Revit basics. Build your first coordinated model." },
  { title: "Discipline modeling", role: "BIM Modeler", text: "Model architecture, structure or MEP at real size, the way teams need it." },
  { title: "Coordination and clash detection", role: "BIM Coordinator", text: "Federate models, find clashes and close them out with the design team." },
  { title: "4D/5D and construction data", role: "VDC Engineer", text: "Link the model to the schedule and quantities. Plan the build before it starts." },
  { title: "Standards and leadership", role: "BIM / VDC Manager", text: "Set standards, write execution plans and lead the modeling team." },
];

function StepCard({ i, className }: { i: number; className?: string }) {
  const s = journey[i];
  return (
    <div className={cn("glass p-7 md:p-9", className)}>
      <p className="label mb-4">Step {i + 1} of {journey.length}</p>
      <h3 className="display-md max-w-[16ch] !text-[clamp(1.5rem,2.8vw,2.4rem)]">{s.title}</h3>
      <p className="mt-5 max-w-md text-muted">{s.text}</p>
      <p className="mt-6 border-t border-border pt-4 text-sm">
        <span className="label me-3">You become</span>
        {s.role}
      </p>
    </div>
  );
}

export function Journey({ full = false }: { full?: boolean }) {
  const section = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const state = useRef(newState({ lod: 300, sim: 1 / 6 }));
  const reduce = useReduceMotion();
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (reduce) {
      state.current.sim = -1;
      return;
    }
    gsap.registerPlugin(ScrollTrigger);
    const mm = gsap.matchMedia();
    mm.add("(min-width: 1024px)", () => {
      const n = journey.length;
      const s = state.current;
      const st = ScrollTrigger.create({
        trigger: section.current,
        start: "top top",
        end: `+=${n * 90}%`,
        pin: true,
        scrub: 0.6,
        onUpdate: (self) => {
          const p = self.progress;
          s.sim = 1 / 6 + (5 / 6) * p;
          s.yaw = p * 0.8;
          if (track.current) track.current.style.transform = `translateX(${-p * (n - 1) * (100 / n)}%)`;
          setActive(Math.min(n - 1, Math.round(p * (n - 1))));
        },
      });
      return () => {
        st.kill();
        s.sim = -1;
      };
    });
    return () => mm.revert();
  }, [reduce]);

  const pinned = !reduce;

  return (
    <section ref={section} id="ch-6" aria-labelledby="journey-title" className="relative">
      {/* Desktop: pinned, steps slide past while the building grows floor by floor */}
      <div className={cn("hidden min-h-screen items-center", pinned && "lg:flex")}>
        <div className="mx-auto grid w-full max-w-[1600px] items-center gap-10 px-10 pt-20 lg:grid-cols-12">
          <div className="lg:col-span-6">
            <p className="label mb-5">06 · The path</p>
            <h2 id="journey-title" className="display-lg mb-12 max-w-[12ch]">Five steps to a BIM career.</h2>
            <div className="relative z-10 overflow-hidden">
              <div ref={track} className="flex will-change-transform" style={{ width: `${journey.length * 100}%` }}>
                {journey.map((_, i) => (
                  <div key={i} className="px-0" style={{ width: `${100 / journey.length}%` }}>
                    <StepCard i={i} className="mr-6" />
                  </div>
                ))}
              </div>
            </div>
            <ol className="relative z-10 mt-8 flex gap-2" aria-label="Progress">
              {journey.map((j, i) => (
                <li key={j.title} aria-current={active === i ? "step" : undefined} className={cn("h-2 flex-1 transition-colors", i <= active ? "bg-accent" : "bg-border")} style={{ marginInlineStart: `${i * 4}px` }}>
                  <span className="sr-only">{j.title}</span>
                </li>
              ))}
            </ol>
          </div>
          <div className="lg:col-span-6">
            <SceneSlot stateRef={state} autoRotate={false} label="Building that gains one floor with each step of the learning path" className="h-[72svh]" />
          </div>
        </div>
      </div>

      {/* Mobile and reduced motion: vertical stack of slabs */}
      <div className={cn("mx-auto max-w-[1600px] px-5 py-24 md:px-10", pinned && "lg:hidden")}>
        <p className="label mb-5">06 · The path</p>
        <h2 className="display-lg mb-10">Five steps to a BIM career.</h2>
        <ol className="space-y-5">
          {journey.map((_, i) => (
            <Slab as="li" key={i} className="relative" index={0}>
              <div style={{ marginInlineStart: `${i * 14}px` }}>
                <StepCard i={i} />
              </div>
            </Slab>
          ))}
        </ol>
        {full && <Button href="/programs" className="mt-10" variant="glow">See programs</Button>}
      </div>
    </section>
  );
}
