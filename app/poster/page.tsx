"use client";

import { Suspense, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { SceneSlot } from "@/components/three/SceneSlot";
import { newState } from "@/lib/modelState";

// Renders the model alone on a transparent page so scripts/poster.mjs can capture the stills used as the
// LCP image and the no-WebGL / reduced-motion fallback. Not linked from anywhere. Use ?mood=1&gl=force for night.
function Poster() {
  const sp = useSearchParams();
  const state = useRef(newState({ mood: Number(sp.get("mood") ?? 0), lod: Number(sp.get("lod") ?? 300), yaw: Number(sp.get("yaw") ?? 0), isolate: (sp.get("iso") as never) ?? "all" }));
  return (
    <div className="poster-root fixed inset-0 z-[200]">
      <style>{`html,body{background:transparent!important}header,footer,main>*:not(.poster-root){display:none}`}</style>
      <SceneSlot stateRef={state} autoRotate={false} label="Model still" className="h-full w-full" />
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
