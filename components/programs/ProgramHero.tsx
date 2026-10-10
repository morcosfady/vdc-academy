"use client";

import { useRef } from "react";
import { SceneSlot } from "@/components/three/SceneSlot";
import { RiseLines } from "@/components/ui/RiseLines";
import { Button } from "@/components/ui/Button";
import { newState, type Isolate } from "@/lib/modelState";

const isolateFor: Record<string, Partial<ReturnType<typeof newState>> & { isolate: Isolate }> = {
  "revit-architecture": { isolate: "architecture" },
  "revit-structure": { isolate: "structure" },
  "revit-mep": { isolate: "mep" },
  "low-voltage-bim": { isolate: "lowvoltage" },
  "navisworks-clash-detection": { isolate: "clash", clash: 0.3 },
  "4d-5d-simulation": { isolate: "4d", sim: 0.7 },
};

// Program hero: the stepped building with this program's discipline isolated.
export function ProgramHero({ slug, level, title, summary }: { slug: string; level: string; title: string; summary: string }) {
  const state = useRef(newState({ lod: 400, ...(isolateFor[slug] ?? {}) }));
  return (
    <section className="relative overflow-hidden pt-32 md:pt-40">
      <div className="mx-auto grid max-w-[1600px] items-center gap-6 px-5 md:px-10 lg:grid-cols-2">
        <div className="relative z-10 pb-10 lg:pb-24">
          <p className="label mb-5">{level} · Program</p>
          <h1 className="display-lg max-w-[14ch] !text-[clamp(2rem,5vw,4.4rem)]" aria-label={title}>
            <RiseLines lines={[title]} />
          </h1>
          <p className="mt-6 max-w-md text-lg text-muted">{summary}</p>
          <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-4">
            <Button href={`/apply?program=${slug}`} variant="glow" magnetic>Apply now</Button>
            <Button href="/programs" variant="link">All programs <span aria-hidden>→</span></Button>
          </div>
        </div>
        <SceneSlot
          stateRef={state}
          label={`3D building with the ${title} discipline highlighted`}
          className="pointer-events-none h-[46svh] lg:h-[70svh]"
        />
      </div>
    </section>
  );
}
