"use client";

import { useEffect, useRef, useState } from "react";

// Wraps looping animations so they only run while visible.
export function InView({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [on, setOn] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setOn(e.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <span ref={ref} className={`${className ?? ""} ${on ? "" : "loop-paused"}`}>
      {children}
    </span>
  );
}
