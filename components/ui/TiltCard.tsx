"use client";

import { useRef } from "react";
import { cn } from "@/lib/utils";

// Mouse tilt with a soft glare. Touch devices and reduced motion just see a static card.
export function TiltCard({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  function move(e: React.PointerEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el || e.pointerType !== "mouse") return;
    if (document.documentElement.classList.contains("reduce-motion")) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    el.style.transform = `perspective(800px) rotateX(${(0.5 - y) * 10}deg) rotateY(${(x - 0.5) * 10}deg)`;
    el.style.setProperty("--gx", `${x * 100}%`);
    el.style.setProperty("--gy", `${y * 100}%`);
  }
  function leave() {
    if (ref.current) ref.current.style.transform = "";
  }

  return (
    <div
      ref={ref}
      onPointerMove={move}
      onPointerLeave={leave}
      className={cn(
        "group relative rounded-card border border-border bg-bg-elevated/70 p-6 backdrop-blur transition-[transform,box-shadow] duration-200 hover:shadow-[0_0_32px_var(--glow)]",
        className,
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-card opacity-0 transition-opacity group-hover:opacity-100"
        style={{ background: "radial-gradient(240px circle at var(--gx,50%) var(--gy,50%), rgba(255,255,255,0.12), transparent 60%)" }}
      />
      {children}
    </div>
  );
}
