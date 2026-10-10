"use client";

import { useEffect, useRef, useState } from "react";
import { animate } from "motion/react";
import { useReduceMotion } from "@/hooks/useReduceMotion";

// Number that rolls to its new value whenever `value` changes.
export function Roll({ value, prefix = "", suffix = "", className }: { value: number; prefix?: string; suffix?: string; className?: string }) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  const reduce = useReduceMotion();
  useEffect(() => {
    if (reduce) {
      setShown(value);
      from.current = value;
      return;
    }
    const c = animate(from.current, value, { duration: 0.7, ease: [0.16, 1, 0.3, 1], onUpdate: (v) => { from.current = v; setShown(Math.round(v)); } });
    return () => c.stop();
  }, [value, reduce]);
  return <span className={className}>{prefix}{shown.toLocaleString("en-US")}{suffix}</span>;
}
