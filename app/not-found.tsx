"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { Button } from "@/components/ui/Button";
import { SceneSlot } from "@/components/three/SceneSlot";
import { newState } from "@/lib/modelState";

// Playful 404: the building with a clash marker that keeps getting rerouted.
export default function NotFound() {
  const state = useRef(newState({ lod: 400, isolate: "clash", clash: 0 }));
  useEffect(() => {
    const s = state.current;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      s.clash = 0.25;
      return;
    }
    const t = gsap.timeline({ repeat: -1, repeatDelay: 0.8 });
    t.fromTo(s, { clash: 0 }, { clash: 0.5, duration: 1.6, ease: "none" }).to(s, { clash: 1, duration: 1.4 }).to({}, { duration: 1.4 });
    return () => void t.kill();
  }, []);

  return (
    <section className="mx-auto grid min-h-[100svh] max-w-[1600px] items-center gap-6 px-5 pb-16 pt-32 md:px-10 lg:grid-cols-2">
      <div className="relative z-10">
        <p className="label mb-5">Error 404 · Clash #0404</p>
        <h1 className="display-lg max-w-[14ch]">This page has a clash.</h1>
        <p className="mt-6 max-w-md text-lg text-muted">Let&apos;s reroute you.</p>
        <div className="mt-8"><Button href="/" variant="glow" magnetic>Back to home</Button></div>
      </div>
      <SceneSlot stateRef={state} label="3D building with a clash marker that gets rerouted" className="pointer-events-none h-[55svh] lg:h-[70svh]" />
    </section>
  );
}
