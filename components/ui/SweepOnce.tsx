"use client";

import { useEffect, useRef, useState } from "react";

// A soft light sweep that crosses its parent once, the first time the parent is on screen.
export function SweepOnce({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [go, setGo] = useState(false);
  useEffect(() => {
    const el = ref.current?.parentElement;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        setGo(true);
        io.disconnect();
      }
    }, { threshold: 0.35 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} aria-hidden className={`pointer-events-none absolute inset-0 overflow-hidden ${className ?? ""}`}>
      {go && <div className="sweep-once absolute inset-y-0 start-0 w-1/3 bg-gradient-to-r from-transparent via-white/40 to-transparent" />}
    </div>
  );
}
