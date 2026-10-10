"use client";

import { useEffect, useRef } from "react";
import { preload } from "react-dom";
import { loadGsap } from "@/lib/gsap";
import { photos } from "@/assets/images";
import { Button } from "@/components/ui/Button";
import { Photo } from "@/components/ui/Photo";
import { BlueprintLayer } from "@/components/ui/BlueprintLayer";
import { RiseLines } from "@/components/ui/RiseLines";
import { SceneSlot } from "@/components/three/SceneSlot";
import { newState } from "@/lib/modelState";
import { content, shown } from "@/content/site";
import { site } from "@/config/site";
import { useReduceMotion } from "@/hooks/useReduceMotion";

const lines = ["Train on real BIM", "projects. Build a", "real career."];

// Callout tags attached to the model with thin leader lines, like Revit tags.
const tags = [
  { text: "LOD 350", top: "20%", left: "6%", dir: "right" },
  { text: "MEP · Ducts", top: "48%", right: "2%", dir: "left" },
  { text: "Clash resolved ✓", top: "74%", left: "10%", dir: "right" },
] as const;

export function Hero() {
  preload(photos.hero.avif, { as: "image", fetchPriority: "high", type: "image/avif" });
  const section = useRef<HTMLElement>(null);
  const state = useRef(newState({ build: 0, lod: 350 }));
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
    <section ref={section} id="ch-1" className="theme-dark relative overflow-hidden lg:min-h-[100svh]">
      {/* Layer 1: graded architectural photo, slow Ken Burns */}
      <div className="absolute inset-0 overflow-hidden" aria-hidden>
        <Photo photo={photos.hero} priority className="kenburns opacity-70" />
      </div>
      {/* Layer 2: ink gradient so text reads on the left, light fades toward the model */}
      <div aria-hidden className="absolute inset-0 bg-[linear-gradient(90deg,#0a1d23_0%,rgba(10,29,35,0.92)_30%,rgba(10,29,35,0.45)_60%,rgba(10,29,35,0.2)_100%)]" />
      <div aria-hidden className="absolute inset-x-0 top-0 h-44 bg-gradient-to-b from-[#000e12]/85 to-transparent" />
      <div aria-hidden className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-[#0a1d23] to-transparent" />
      {/* Layer 3: soft steel blue light behind the building */}
      <div aria-hidden className="absolute end-[6%] top-1/2 hidden size-[720px] -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(90,160,225,0.38),transparent_66%)] lg:block" />
      {/* Layer 4: technical drawing */}
      <BlueprintLayer className="drift absolute inset-0 h-full w-full text-[#7db3e8] opacity-[0.1]" />

      <div className="relative z-10 mx-auto grid max-w-[1280px] items-center gap-4 px-5 pt-24 md:px-8 lg:min-h-[calc(100svh-64px)] lg:grid-cols-[45fr_55fr] lg:pt-20">
        <div className="order-2 pb-10 lg:order-1 lg:pb-0">
          <p className="label mb-5">VDC Academy · by Bay BIM Designs</p>
          <h1 className="text-[clamp(2.2rem,4.1vw,4rem)] text-[#f2f7fb]" aria-label="Train on real BIM projects. Build a real career.">
            <RiseLines lines={lines} />
          </h1>
          <p className="mt-6 max-w-[34rem] text-lg text-[#a9bcc4]">
            Hands-on Revit, Navisworks and VDC training from the team behind Bay BIM Designs, with fresh graduate pricing.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Button href="/apply" variant="glow" magnetic>
              Apply now
            </Button>
            <Button href="/programs" variant="outline">
              Explore programs
            </Button>
          </div>
          <ul className="mt-10 flex flex-wrap divide-x divide-[#365b62] text-sm text-[#a9bcc4]">
            <li className="pe-5">{site.city}</li>
            <li className="px-5">Revit · Navisworks · ACC</li>
            <li className="ps-5">
              Fresh grads save <span className="text-[#c9a36a]">{site.freshGradMaxDiscount}%</span>
            </li>
          </ul>
          {cohort && <p className="label mt-6">Next cohort · {cohort}</p>}
        </div>

        <div className="relative order-1 lg:order-2">
          <SceneSlot
            stateRef={state}
            autoBuild
            buildSeconds={4.5}
            label="3D glass building made of offset, stepped floors, with structure, ducts, pipes and cable trays visible inside"
            className="h-[52svh] lg:h-[80svh]"
          />
          <div aria-hidden className="pointer-events-none absolute inset-0 hidden lg:block">
            {tags.map((t) => (
              <div
                key={t.text}
                className="absolute z-10 flex items-center gap-2"
                style={{ top: t.top, ...("left" in t ? { left: t.left } : { right: t.right }), flexDirection: t.dir === "left" ? "row-reverse" : "row" }}
              >
                <span className="size-2 rounded-full bg-[#7db3e8] shadow-[0_0_12px_#7db3e8]" />
                <span className="w-10 border-t border-[#7db3e8]/70" />
                <span className="label rounded-md border border-[#365b62] bg-[#0a1d23]/80 px-3 py-1.5 !text-[10px] !text-[#f2f7fb]">{t.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="relative z-10 border-t border-[#365b62]/70">
        <p className="mx-auto max-w-[1280px] px-5 py-5 text-sm text-[#a9bcc4] md:px-8">
          Built by the team behind Bay BIM Designs, trusted by AE firms, general contractors and technology contractors.
        </p>
      </div>
    </section>
  );
}
