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

// Callout tags attached to the model by a thin leader line, like Revit tags. They pop in last.
const tags = [
  { text: "LOD 350", top: "20%", left: "4%", dir: "right", d: 1.9 },
  { text: "MEP · Ducts", top: "47%", right: "0%", dir: "left", d: 2.05 },
  { text: "Clash resolved ✓", top: "74%", left: "8%", dir: "right", d: 2.2 },
] as const;

const seen = () => {
  try {
    return sessionStorage.getItem("vdc-intro") === "1";
  } catch {
    return false;
  }
};

export function Hero() {
  preload(photos.hero.avif, { as: "image", fetchPriority: "high", type: "image/avif" });
  const section = useRef<HTMLElement>(null);
  // The intro (about 2s) plays once per visit. Repeat views and reduced motion start from the finished state.
  const state = useRef(newState({ build: 0, lod: 350 }));
  const reduce = useReduceMotion();
  const cohort = shown(content.nextCohort);

  useEffect(() => {
    if (seen()) state.current.build = 1;
    const t = window.setTimeout(() => {
      try {
        sessionStorage.setItem("vdc-intro", "1");
      } catch {}
    }, 3200);
    return () => window.clearTimeout(t);
  }, []);

  // Scroll hands the building to the explorer: it turns about 25 degrees, the floors lift apart and settle back.
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
          s.yaw = self.progress * 0.44;
          s.explode = Math.sin(self.progress * Math.PI) * 0.45;
        },
      });
      kill = () => st.kill();
    });
    return () => {
      cancelled = true;
      kill();
    };
  }, [reduce]);

  const d = (s: number) => ({ "--d": `${s}s` }) as React.CSSProperties;

  return (
    <section ref={section} id="ch-1" className="theme-dark relative overflow-hidden lg:min-h-[100svh]">
      {/* Layer 1: graded architectural photo. Fades in and settles (1.08 to 1.0) */}
      <div className="fade-in absolute inset-0 overflow-hidden" aria-hidden style={d(0)}>
        <Photo photo={photos.hero} priority className="settle opacity-70" />
      </div>
      {/* Layer 2: ink gradient so text reads on the left, light fades toward the model */}
      <div aria-hidden className="absolute inset-0 bg-[linear-gradient(90deg,#0a1d23_0%,rgba(10,29,35,0.92)_30%,rgba(10,29,35,0.45)_60%,rgba(10,29,35,0.2)_100%)]" />
      <div aria-hidden className="absolute inset-x-0 top-0 h-44 bg-gradient-to-b from-[#06141a]/85 to-transparent" />
      <div aria-hidden className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-[#0a1d23] to-transparent" />
      {/* Layer 3: soft steel blue light behind the building */}
      <div aria-hidden className="glow-layer absolute end-[6%] top-1/2 hidden size-[720px] -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(90,160,225,0.3),transparent_66%)] lg:block" />
      {/* Layer 4: technical drawing, drawn line by line */}
      <BlueprintLayer draw className="pointer-events-none absolute inset-0 h-full w-full text-[#7db3e8] opacity-[0.1]" />

      <div className="relative z-10 mx-auto grid max-w-[1280px] items-center gap-4 px-5 pt-24 md:px-8 lg:min-h-[calc(100svh-64px)] lg:grid-cols-[45fr_55fr] lg:pt-20">
        <div className="order-2 pb-10 lg:order-1 lg:pb-0">
          <p className="label fade-up mb-5" style={d(0.4)}>VDC Academy · by Bay BIM Designs</p>
          <h1 className="text-[clamp(2.25rem,4.1vw,4rem)] text-[#eaf2f7]" aria-label="Train on real BIM projects. Build a real career.">
            <RiseLines lines={lines} delay={0.55} />
          </h1>
          <p className="fade-up mt-6 max-w-[34rem] text-lg text-[#b4c6ce]" style={d(1.15)}>
            Hands-on Revit, Navisworks and VDC training from the team behind Bay BIM Designs, with fresh graduate pricing.
          </p>
          <div className="fade-up mt-8 flex flex-wrap items-center gap-4" style={d(1.3)}>
            <Button href="/apply" variant="glow" magnetic>
              Apply now
            </Button>
            <Button href="/programs" variant="outline">
              Explore programs
            </Button>
          </div>
          <ul className="fade-up mt-10 flex flex-wrap divide-x divide-[#365b62] text-sm text-[#b4c6ce]" style={d(1.5)}>
            <li className="pe-5">{site.city}</li>
            <li className="px-5">Revit · Navisworks · ACC</li>
            <li className="ps-5">
              Fresh grads save <span className="text-[#c9a36a]">{site.freshGradMaxDiscount}%</span>
            </li>
          </ul>
          {cohort && <p className="meta mt-6">Next cohort · {cohort}</p>}
        </div>

        <div className="relative order-1 lg:order-2">
          <SceneSlot
            stateRef={state}
            autoBuild
            buildSeconds={2.4}
            label="3D glass building made of offset, stepped floors, with structure, ducts, pipes and cable trays visible inside"
            className="h-[52svh] lg:h-[80svh]"
          />
          <div aria-hidden className="pointer-events-none absolute inset-0 hidden lg:block">
            {tags.map((t) => (
              <div
                key={t.text}
                className="absolute z-10 flex items-center gap-2"
                style={{ top: t.top, ...("left" in t ? { left: t.left } : { right: t.right }), flexDirection: t.dir === "left" ? "row-reverse" : "row", ...d(t.d) }}
              >
                <span className="tag-dot size-2 rounded-full bg-[#7db3e8] shadow-[0_0_12px_#7db3e8]" />
                <span className="tag-line w-10 border-t border-[#7db3e8]/70" style={{ "--o": t.dir === "left" ? "right" : "left" } as React.CSSProperties} />
                <span className="tag-pill rounded-lg border border-[#365b62] bg-[#0a1d23]/80 px-3 py-1.5 text-[13px] font-medium text-[#eaf2f7] backdrop-blur-sm">{t.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Scroll cue: a thin line with a dot travelling down */}
      <div aria-hidden className="absolute bottom-16 start-1/2 z-10 hidden h-12 w-px -translate-x-1/2 bg-[#365b62] lg:block">
        <span className="cue-dot absolute -start-[2px] top-0 block size-[5px] rounded-full bg-[#7db3e8]" />
      </div>

      <div className="relative z-10 border-t border-[#365b62]/70">
        <p className="mx-auto max-w-[1280px] px-5 py-5 text-sm text-[#b4c6ce] md:px-8">
          Built by the team behind Bay BIM Designs, trusted by AE firms, general contractors and technology contractors.
        </p>
      </div>
    </section>
  );
}
