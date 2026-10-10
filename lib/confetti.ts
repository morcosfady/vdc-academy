// Tiny confetti burst using the Web Animations API. Skipped for reduced motion.
export function confetti(origin: HTMLElement) {
  if (document.documentElement.classList.contains("reduce-motion")) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const r = origin.getBoundingClientRect();
  const colors = ["#5fd0c4", "#ffbc7d", "#a3bec7", "#ffffff", "#7fb7e6"];
  for (let i = 0; i < 36; i++) {
    const el = document.createElement("span");
    el.setAttribute("aria-hidden", "true");
    Object.assign(el.style, {
      position: "fixed",
      left: `${r.left + r.width / 2}px`,
      top: `${r.top + r.height / 2}px`,
      width: "8px",
      height: "8px",
      background: colors[i % colors.length],
      borderRadius: i % 2 ? "50%" : "1px",
      pointerEvents: "none",
      zIndex: "100",
    });
    document.body.appendChild(el);
    const angle = Math.random() * Math.PI * 2;
    const dist = 80 + Math.random() * 160;
    el.animate(
      [
        { transform: "translate(0,0) rotate(0)", opacity: 1 },
        { transform: `translate(${Math.cos(angle) * dist}px, ${Math.sin(angle) * dist + 80}px) rotate(${Math.random() * 540}deg)`, opacity: 0 },
      ],
      { duration: 900 + Math.random() * 500, easing: "cubic-bezier(.2,.7,.3,1)" },
    ).onfinish = () => el.remove();
  }
}
