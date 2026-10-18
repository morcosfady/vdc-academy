"use client";

import { useEffect, useRef } from "react";
import { loadGsap } from "@/lib/gsap";
import { Button } from "@/components/ui/Button";
import { SceneSlot } from "@/components/three/SceneSlot";
import { SheetTag } from "@/components/ds/Devices";
import { newState } from "@/lib/modelState";
import { copy } from "@/content/copy";

const c = copy.notFound;

// E-404 on paper: the study model with a clash that keeps getting rerouted.
export default function NotFound() {
  const state = useRef(newState({ lod: 400, mood: 0, isolate: "clash", clash: 0 }));
  useEffect(() => {
    const s = state.current;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.classList.contains("reduce-motion") || document.documentElement.classList.contains("comfort");
    if (reduce) {
      s.clash = 0.25;
      return;
    }
    let kill = () => {};
    let cancelled = false;
    loadGsap().then(({ gsap }) => {
      if (cancelled) return;
      const t = gsap.timeline({ repeat: -1, repeatDelay: 0.8 });
      t.fromTo(s, { clash: 0 }, { clash: 0.5, duration: 1.6, ease: "none" }).to(s, { clash: 1, duration: 1.4 }).to({}, { duration: 1.4 });
      kill = () => void t.kill();
    });
    return () => {
      cancelled = true;
      kill();
    };
  }, []);

  return (
    <section className="theme-light pt-[72px]">
      <div className="wrap">
        <div className="grid-12 items-center gap-y-12 pb-24 pt-14 lg:min-h-[calc(100svh-72px)] lg:py-24">
          <div className="col-span-12 lg:col-span-6">
            <SheetTag sheet={c.sheet} name="Not found" />
            <h1 className="t-h1 mt-8 max-w-[14ch]">{c.title}</h1>
            <p className="t-lead mt-6 max-w-[30rem]">{c.text}</p>
            <div className="mt-9 flex flex-col gap-5 sm:flex-row sm:items-center">
              <Button href="/">{c.home}</Button>
              <Button href="/programs" variant="link">
                {c.programs}
              </Button>
            </div>
          </div>
          <div className="col-span-12 lg:col-span-6">
            <SceneSlot stateRef={state} autoRotate rotateSpeed={0.06} label="Study model with a clash marker that gets rerouted" className="mx-auto aspect-square w-[80%] sm:w-[64%] lg:aspect-[5/4] lg:w-full" />
          </div>
        </div>
      </div>
    </section>
  );
}
