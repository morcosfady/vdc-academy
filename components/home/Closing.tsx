"use client";

import { useRef } from "react";
import { photos } from "@/assets/images";
import { Photo } from "@/components/ui/Photo";
import { BlueprintLayer } from "@/components/ui/BlueprintLayer";
import { Button } from "@/components/ui/Button";
import { Slab } from "@/components/ui/Slab";
import { SceneSlot } from "@/components/three/SceneSlot";
import { newState } from "@/lib/modelState";
import { faqs, type FaqItem } from "@/content/faqs";

export function Faq({ items = faqs }: { items?: FaqItem[] }) {
  return (
    <div className="divide-y divide-border border-y border-border">
      {items.map((f) => (
        <details key={f.q} className="group py-5">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-lg">
            {f.q}
            <span aria-hidden className="text-2xl font-light transition-transform duration-300 group-open:rotate-45">+</span>
          </summary>
          <p className="mt-3 max-w-2xl text-muted">{f.a}</p>
        </details>
      ))}
    </div>
  );
}

export function Closing() {
  const state = useRef(newState({ lod: 400 }));
  return (
    <>
      <section id="ch-7" className="theme-dark relative overflow-hidden py-24 md:py-40">
        <div className="absolute inset-0" aria-hidden>
          <Photo photo={photos.facade} className="opacity-45" style={{ objectPosition: "50% 40%" }} />
        </div>
        <div aria-hidden className="absolute inset-0 bg-[linear-gradient(90deg,#000e12_0%,rgba(0,14,18,0.85)_35%,rgba(0,14,18,0.3)_100%)]" />
        <BlueprintLayer className="drift pointer-events-none absolute inset-0 h-full w-full text-[#7db3e8] opacity-[0.07]" />
        <div className="relative z-10 mx-auto grid max-w-[1280px] items-center gap-8 px-5 md:px-8 lg:grid-cols-2">
          <div className="relative z-10">
            <Slab>
              <h2 className="display-lg max-w-[12ch]">Your BIM career starts here.</h2>
              <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4">
                <Button href="/apply" variant="glow" magnetic>Apply now</Button>
                <Button href="/contact" variant="link">Talk to an advisor <span aria-hidden>→</span></Button>
              </div>
            </Slab>
          </div>
          <SceneSlot
            stateRef={state}
            label="The finished glass building glowing at night"
            className="pointer-events-none h-[60svh] lg:h-[72svh]"
          />
        </div>
      </section>

      <section aria-labelledby="faq-title" className="cv-auto mx-auto max-w-4xl px-5 py-24 md:px-10">
        <p className="label mb-5">Questions</p>
        <h2 id="faq-title" className="display-md mb-10">Before you apply</h2>
        <Faq />
      </section>
    </>
  );
}
