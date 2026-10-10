"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useWebGL } from "./useWebGL";

const SceneHost = dynamic(() => import("./SceneHost"), { ssr: false });

// Loads the 3D bundle only after the first paint and only when WebGL exists.
export function SceneHostLoader() {
  const webgl = useWebGL();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const go = () => setReady(true);
    if ("requestIdleCallback" in window) {
      const id = window.requestIdleCallback(go, { timeout: 1500 });
      return () => window.cancelIdleCallback(id);
    }
    const t = setTimeout(go, 600);
    return () => clearTimeout(t);
  }, []);

  return ready && webgl ? <SceneHost /> : null;
}
