"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { WhenVisible } from "@/components/three/WhenVisible";
import { SceneFallback } from "@/components/three/SceneFallback";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { cn } from "@/lib/utils";

const PathScene = dynamic(() => import("@/components/three/PathScene"), { ssr: false });

const steps = [
  { title: "BIM Fundamentals", skills: "Revit basics, project setup, views and sheets", jobs: "BIM Trainee" },
  { title: "Discipline Modeling", skills: "Architecture, Structure and MEP modeling", jobs: "BIM Modeler" },
  { title: "Coordination & Clash Detection", skills: "Navisworks, clash reports, issue tracking", jobs: "BIM Coordinator" },
  { title: "4D/5D Simulation", skills: "Schedule linking, quantities, construction sequencing", jobs: "VDC Engineer" },
  { title: "BIM Coordinator", skills: "Run coordination meetings, own model quality", jobs: "BIM Coordinator" },
  { title: "VDC Manager", skills: "Standards, execution plans, leading BIM teams", jobs: "BIM / VDC Manager" },
];

export function LearningPath() {
  const section = useRef<HTMLElement>(null);
  const progress = useRef(0);
  const [active, setActive] = useState(0);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const st = ScrollTrigger.create({
      trigger: section.current,
      start: "top 60%",
      end: "bottom 80%",
      onUpdate: (self) => {
        progress.current = self.progress;
        setActive(Math.min(steps.length - 1, Math.round(self.progress * (steps.length - 1))));
      },
    });
    return () => st.kill();
  }, []);

  return (
    <section ref={section} className="mx-auto max-w-7xl px-4 py-24 md:px-6">
      <SectionHeader tag="F-601 · LEARNING PATH" title="From first model to VDC manager" subtitle="Scroll to follow the road. Each stop shows the skills you build and the roles it leads to." />
      <div className="grid gap-8 md:grid-cols-2">
        <div className="sticky top-24 h-[50vh] self-start md:h-[70vh]">
          <WhenVisible className="h-full rounded-card border border-border" fallback={<SceneFallback />} label="3D road with six milestones, from BIM fundamentals to VDC manager">
            {(on) => <PathScene active={on} progress={progress} />}
          </WhenVisible>
        </div>
        <ol className="space-y-6">
          {steps.map((s, i) => (
            <li
              key={s.title}
              className={cn(
                "flex min-h-[40vh] flex-col justify-center rounded-card border p-6 transition",
                i === active ? "border-brand-accent bg-surface" : "border-border opacity-60",
              )}
            >
              <p className="font-mono text-xs text-text-muted">STEP {i + 1}</p>
              <h3 className="mt-1 text-xl font-bold">{s.title}</h3>
              <p className="mt-3 text-text-muted">{s.skills}</p>
              <p className="mt-3 text-sm">
                <span className="text-text-muted">Typical role: </span>
                {s.jobs}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
