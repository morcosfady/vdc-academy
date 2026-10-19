"use client";

import { Suspense, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { SceneSlot } from "@/components/three/SceneSlot";
import { newState } from "@/lib/modelState";
import dynamic from "next/dynamic";

const DisciplineCanvas = dynamic(() => import("@/components/three/DisciplineScene").then((m) => m.DisciplineCanvas), { ssr: false });

// Renders the model alone on a transparent page so scripts/poster.mjs can capture the stills used as the
// LCP image and the no-WebGL / reduced-motion fallback. Not linked from anywhere. Use ?mood=1&gl=force for night.
function Poster() {
  const sp = useSearchParams();
  const n = (k: string, d: number) => (sp.get(k) === null ? d : Number(sp.get(k)));
  const state = useRef(
    newState({ mood: n("mood", 0), lod: n("lod", 300), yaw: n("yaw", 0), isolate: (sp.get("iso") as never) ?? "all", sim: n("sim", -1), focus: n("focus", 0), floor: n("floor", -1), axis: n("axis", -1) }),
  );
  const scene = sp.get("scene");
  const bg = sp.get("bg"); // "paper", "ink" or a hex without #; transparent when absent
  const color = bg === "paper" ? "#f6f4ef" : bg === "ink" ? "#0a1d23" : bg ? `#${bg}` : "transparent";
  return (
    <div className="poster-root fixed inset-0 z-[200]">
      <style>{`html,body{background:${color}!important}header,footer,main>*:not(.poster-root){display:none}`}</style>
      {scene ? <DisciplineCanvas id={scene} /> : <SceneSlot stateRef={state} autoRotate={false} fit={n("fit", 1)} label="Model still" className="h-full w-full" />}
    </div>
  );
}

export default function PosterPage() {
  return (
    <Suspense>
      <Poster />
    </Suspense>
  );
}
