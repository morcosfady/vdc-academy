// GSAP is loaded on demand so it never blocks the first paint or counts toward the initial JavaScript.
import { afterInteraction } from "./interaction";

let cached: Promise<{ gsap: typeof import("gsap").default; ScrollTrigger: typeof import("gsap/ScrollTrigger").ScrollTrigger }> | null = null;

export function loadGsap() {
  cached ??= afterInteraction().then(() => Promise.all([import("gsap"), import("gsap/ScrollTrigger")])).then(([g, s]) => {
    g.default.registerPlugin(s.ScrollTrigger);
    return { gsap: g.default, ScrollTrigger: s.ScrollTrigger };
  });
  return cached;
}
