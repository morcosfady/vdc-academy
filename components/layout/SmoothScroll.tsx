"use client";

import { useEffect } from "react";
import { loadGsap } from "@/lib/gsap";

// Lenis smooth scroll synced with GSAP. Both load after the page is idle, never during the first paint.
export function SmoothScroll() {
  useEffect(() => {
    const reduce =
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      document.documentElement.classList.contains("reduce-motion");
    if (reduce) return;
    let cleanup = () => {};
    let cancelled = false;
    const start = async () => {
      const [{ gsap, ScrollTrigger }, { default: Lenis }] = await Promise.all([loadGsap(), import("lenis")]);
      if (cancelled) return;
      const lenis = new Lenis({ lerp: 0.1 });
      lenis.on("scroll", ScrollTrigger.update);
      const tick = (t: number) => lenis.raf(t * 1000);
      gsap.ticker.add(tick);
      gsap.ticker.lagSmoothing(0);
      cleanup = () => {
        gsap.ticker.remove(tick);
        lenis.destroy();
      };
    };
    void start();
    return () => {
      cancelled = true;
      cleanup();
    };
  }, []);
  return null;
}
