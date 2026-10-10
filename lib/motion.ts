// One motion language for the whole site: "the building assembles itself".
// Calm, short distances, expo easing. Import these instead of inventing new values.
import { loadGsap } from "./gsap";

export const ease = {
  out: "expo.out", // entrances
  scrub: "power3.inOut", // scroll scrubs
  ui: "power2.out", // small UI changes
  css: "cubic-bezier(0.16, 1, 0.3, 1)", // same curve as expo.out, for CSS
};
export const dur = { ui: 0.25, reveal: 0.8, hero: 2.2 }; // seconds
export const stagger = 0.075; // seconds between siblings
export const rise = 28; // px, never more than 32

// Shared reveal: rise 28px and fade in, staggered. Jumps straight to the end state for reduced motion / comfort mode.
export async function reveal(targets: gsap.TweenTarget, opts: { delay?: number; stagger?: number } = {}) {
  const reduce =
    window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
    document.documentElement.classList.contains("reduce-motion") ||
    document.documentElement.classList.contains("comfort");
  const { gsap } = await loadGsap();
  if (reduce) return gsap.set(targets, { clearProps: "all", opacity: 1, y: 0 });
  return gsap.fromTo(
    targets,
    { y: rise, opacity: 0 },
    { y: 0, opacity: 1, duration: dur.reveal, ease: ease.out, delay: opts.delay ?? 0, stagger: opts.stagger ?? stagger, clearProps: "transform" },
  );
}
