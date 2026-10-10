"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Slab } from "@/components/ui/Slab";
import { SceneSlot } from "@/components/three/SceneSlot";
import { newState } from "@/lib/modelState";
import { confetti } from "@/lib/confetti";

const next = [
  { t: "We review", d: "Within 1 to 2 business days." },
  { t: "Advisor call", d: "A short call to confirm fit and answer questions." },
  { t: "Enroll and pay", d: "You get the price, discount and payment options in writing." },
  { t: "Start learning", d: "Join your cohort and build your first model." },
];

export function Success() {
  const state = useRef(newState({ lod: 400, sim: 1 }));
  const mark = useRef<HTMLHeadingElement>(null);
  const [info, setInfo] = useState<{ name: string; program: string; discount: string | null } | null>(null);

  useEffect(() => {
    try {
      setInfo(JSON.parse(sessionStorage.getItem("vdc-applied") ?? "null"));
    } catch {}
    if (mark.current) confetti(mark.current);
  }, []);

  return (
    <div className="mx-auto grid max-w-[1280px] items-center gap-10 px-5 pb-32 pt-36 md:px-10 lg:grid-cols-2">
      <div className="relative z-10">
        <p className="label mb-5">Application received</p>
        <h1 ref={mark} className="display-lg max-w-[12ch]">Thank you{info?.name ? `, ${info.name}` : ""}.</h1>
        {info?.program && <p className="mt-6 text-lg text-muted">Your application for {info.program} is in.</p>}
        {info?.discount && <p className="mt-2 text-warm">Your discount is pending verification of your document.</p>}
        <ol className="mt-10 space-y-3">
          {next.map((n, i) => (
            <Slab as="li" key={n.t} index={i}>
              <div className="glass flex gap-5 p-5" style={{ marginInlineStart: `${i * 14}px` }}>
                <span className="label !text-accent-text">0{i + 1}</span>
                <div><p>{n.t}</p><p className="text-sm text-muted">{n.d}</p></div>
              </div>
            </Slab>
          ))}
        </ol>
        <div className="mt-10"><Button href="/" variant="link">Back to home <span aria-hidden>→</span></Button></div>
      </div>
      <SceneSlot stateRef={state} label="Your finished building, lit up" className="pointer-events-none h-[60svh] lg:h-[72svh]" />
    </div>
  );
}
