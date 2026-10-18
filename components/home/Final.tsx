"use client";

import { useEffect, useRef } from "react";
import { copy } from "@/content/copy";
import { Button } from "@/components/ui/Button";
import { Slab } from "@/components/ui/Slab";
import { SceneSlot } from "@/components/three/SceneSlot";
import { newState } from "@/lib/modelState";

// S7. Ink. One headline, one line, two actions. Below them the night model, low opacity, lit floor by floor once.
export function Final() {
  const c = copy.closing;
  const state = useRef(newState({ lod: 400, mood: 1 }));
  const section = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = section.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.classList.contains("comfort") || document.documentElement.classList.contains("reduce-motion");
    const timers: number[] = [];
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        if (reduce) return;
        for (let i = 0; i < 7; i++) timers.push(window.setTimeout(() => (state.current.highlight = i), 400 + i * 220));
        timers.push(window.setTimeout(() => (state.current.highlight = -1), 400 + 7 * 220 + 600));
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      timers.forEach(clearTimeout);
    };
  }, []);

  return (
    <section ref={section} id="final" aria-labelledby="final-title" className="theme-dark relative overflow-hidden pt-24 lg:pt-40">
      <div className="wrap relative z-10 text-center">
        <Slab className="mx-auto max-w-3xl">
          <h2 id="final-title" className="t-h1">
            {c.title}
          </h2>
          <p className="t-lead mx-auto mt-6">{c.line}</p>
          <div className="mt-10 flex flex-col items-center justify-center gap-5 sm:flex-row">
            <Button href="/apply">{c.primary}</Button>
            <Button href="/contact" variant="link">
              {c.secondary}
            </Button>
          </div>
        </Slab>
      </div>
      <div className="pointer-events-none relative mt-6 h-[46svh] min-h-[300px] opacity-60 lg:mt-2 lg:h-[56svh]" aria-hidden>
        <SceneSlot stateRef={state} rotateSpeed={0.06} label={c.modelAlt} className="mx-auto h-full w-full max-w-[1100px]" />
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-b from-transparent to-ink-3" />
      </div>
    </section>
  );
}
