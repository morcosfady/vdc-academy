"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import { useWebGL } from "./useWebGL";
import { markScenesReady, useScenesReady } from "@/lib/scenesReady";
import { afterInteraction } from "@/lib/interaction";
import { gpu } from "@/lib/gpu";

const SceneHost = dynamic(() => import("./SceneHost"), { ssr: false });

// Starts the 3D bundle late: on idle for desktops, on first interaction (or ~8 s) for phones.
export function SceneHostLoader() {
  const ready = useScenesReady();
  const webgl = useWebGL();

  useEffect(() => {
    if (gpu.low) {
      afterInteraction(8000).then(markScenesReady);
      return;
    }
    const go = () => markScenesReady();
    if ("requestIdleCallback" in window) {
      const id = window.requestIdleCallback(go, { timeout: 1500 });
      return () => window.cancelIdleCallback(id);
    }
    const t = setTimeout(go, 600);
    return () => clearTimeout(t);
  }, []);

  return ready && webgl ? <SceneHost /> : null;
}
