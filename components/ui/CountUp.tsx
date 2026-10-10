"use client";

import { useEffect, useRef, useState } from "react";
import { animate, useInView } from "motion/react";
import { useReduceMotion } from "@/hooks/useReduceMotion";

// The final value is real text from the first paint (SSR, no JS, reduced motion).
// The count-up only plays when the number scrolls into view and is skipped if motion is reduced.
export function CountUp({ to, suffix = "", className }: { to: number; suffix?: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10%" });
  const reduce = useReduceMotion();
  const [n, setN] = useState<number | null>(null);

  useEffect(() => {
    if (!inView || reduce) return;
    setN(0);
    const c = animate(0, to, { duration: 1.8, ease: [0.16, 1, 0.3, 1], onUpdate: (v) => setN(Math.round(v)) });
    return () => c.stop();
  }, [inView, reduce, to]);

  return (
    <span ref={ref} className={className}>
      {n === null || reduce ? to : n}
      {suffix}
    </span>
  );
}
