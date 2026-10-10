"use client";

import dynamic from "next/dynamic";
import { Button } from "@/components/ui/Button";
import { WhenVisible } from "@/components/three/WhenVisible";
import { SceneFallback } from "@/components/three/SceneFallback";

const HeroScene = dynamic(() => import("@/components/three/HeroScene"), { ssr: false });

export function FinalCta() {
  return (
    <section className="relative isolate overflow-hidden bg-[#000e12] text-[#e8f1f4]">
      <WhenVisible className="absolute inset-0 -z-10 opacity-70" fallback={<SceneFallback />} label="3D building at night with glowing mechanical and cable systems">
        {(active) => <HeroScene active={active} night />}
      </WhenVisible>
      <div className="mx-auto max-w-3xl px-4 py-32 text-center">
        <h2 className="text-3xl font-bold md:text-5xl">Your BIM career starts here.</h2>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Button href="/apply" variant="glow">Apply Now</Button>
          <Button href="/contact" variant="secondary" className="!border-white/40 !text-white hover:!bg-white/10">Talk to an advisor</Button>
        </div>
      </div>
    </section>
  );
}
