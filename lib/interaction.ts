// Resolves on the visitor's first touch, click, key press or scroll, or after `timeout` ms, whichever is first.
// Used to load non-essential enhancements (smooth scroll, scroll animations, 3D) without delaying first paint
// or input readiness.
let promise: Promise<void> | null = null;

export function afterInteraction(timeout = 6000): Promise<void> {
  if (typeof window === "undefined") return new Promise(() => {});
  promise ??= new Promise<void>((resolve) => {
    const events = ["pointerdown", "touchstart", "keydown", "wheel", "scroll", "mousemove"] as const;
    const done = () => {
      events.forEach((e) => window.removeEventListener(e, done));
      clearTimeout(t);
      resolve();
    };
    events.forEach((e) => window.addEventListener(e, done, { once: true, passive: true }));
    const t = setTimeout(done, timeout);
  });
  return promise;
}
