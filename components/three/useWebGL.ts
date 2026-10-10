"use client";

import { useEffect, useState } from "react";
import { useScenesReady } from "@/lib/scenesReady";

// Software renderers (SwiftShader, llvmpipe, "Basic Render Driver") are far too slow for the 3D scenes and would
// freeze the page, so they count as "no WebGL": visitors get the poster and the button controls instead.
// Add ?gl=force to the URL to bypass the check (used for screenshots and debugging).
const SOFTWARE = /swiftshader|llvmpipe|software|basic render|softpipe/i;

export function hasUsableWebGL(): boolean {
  try {
    const c = document.createElement("canvas");
    const gl = (c.getContext("webgl2") || c.getContext("webgl")) as WebGLRenderingContext | null;
    if (!gl) return false;
    if (new URLSearchParams(window.location.search).get("gl") === "force") return true;
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    const renderer = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : "";
    return !SOFTWARE.test(renderer);
  } catch {
    return false;
  }
}

// Creating a WebGL context is expensive, so the check runs once and only when the 3D bundle is allowed to start
// (see lib/scenesReady.ts). Until then the poster is shown.
let cache: boolean | null = null;

// null = not checked yet, false = poster and buttons only
export function useWebGL() {
  const ready = useScenesReady();
  const [ok, setOk] = useState<boolean | null>(null);
  useEffect(() => {
    if (!ready) return;
    cache ??= hasUsableWebGL();
    setOk(cache);
  }, [ready]);
  return ok;
}
