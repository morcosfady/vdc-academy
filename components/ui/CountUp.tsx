"use client";

import { useEffect, useRef, useState } from "react";
import { animate, useInView } from "motion/react";
import { useReduceMotion } from "@/hooks/useReduceMotion";

// The final value is real text from the first paint (SSR, no JS, reduced motion). The count-up plays once when the
// number scrolls into view, lasts 1.2 s and always lands on the final value. `data-final` lets tests check it.
export function CountUp({ to, suffix = "", className }: { to: number; suffix?: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10%" });
  const reduce = useReduceMotion();
  const [n, setN] = useState<number | null>(null);

  useEffect(() => {
    if (!inView || reduce) return;
    setN(0);
    const c = animate(0, to, { duration: 1.2, ease: [0.2, 0.7, 0.1, 1], onUpdate: (v) => setN(Math.round(v)), onComplete: () => setN(to) });
    const safety = window.setTimeout(() => setN(to), 2000);
    return () => {
      c.stop();
      window.clearTimeout(safety);
    };
  }, [inView, reduce, to]);

  return (
    <span ref={ref} className={className} data-countup data-final={`${to}${suffix}`}>
      {n === null || reduce ? to : n}
      {suffix}
    </span>
  );
}
