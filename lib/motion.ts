// One motion language for the whole site (v5, "calm, precise, architectural").
// Only transform, opacity, clip-path and stroke are animated. Import these instead of inventing new values.
import { loadGsap } from "./gsap";

export const ease = {
  out: "cubic-bezier(0.2, 0.7, 0.1, 1)", // entrances (CSS)
  scrub: "cubic-bezier(0.65, 0, 0.35, 1)", // scroll scrubs (CSS)
  gsapOut: "power3.out", // closest GSAP curve to `out`
  gsapScrub: "power2.inOut",
  css: "cubic-bezier(0.2, 0.7, 0.1, 1)",
};
export const dur = { ui: 0.2, reveal: 0.6, image: 0.9, heroMax: 1.6 }; // seconds
export const stagger = 0.07; // seconds between siblings
export const rise = 20; // px, between 16 and 24

export const reducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
  document.documentElement.classList.contains("reduce-motion") ||
  document.documentElement.classList.contains("comfort");

// Shared reveal: rise 20px and fade in, staggered 70ms. Jumps straight to the end state for reduced motion / comfort mode.
export async function reveal(targets: gsap.TweenTarget, opts: { delay?: number; stagger?: number } = {}) {
  const { gsap } = await loadGsap();
  if (reducedMotion()) return gsap.set(targets, { clearProps: "all", opacity: 1, y: 0 });
  return gsap.fromTo(
    targets,
    { y: rise, opacity: 0 },
    { y: 0, opacity: 1, duration: dur.reveal, ease: ease.gsapOut, delay: opts.delay ?? 0, stagger: opts.stagger ?? stagger, clearProps: "transform" },
  );
}
