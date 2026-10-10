"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useReduceMotion } from "@/hooks/useReduceMotion";

// Slab wipe between routes: three ink bars sweep across the screen (about 450ms).
export function PageTransition() {
  const path = usePathname();
  const first = useRef(true);
  const reduce = useReduceMotion();
  const [run, setRun] = useState(0);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (!reduce) setRun((r) => r + 1);
  }, [path, reduce]);

  if (!run) return null;
  return (
    <div key={run} aria-hidden className="pointer-events-none fixed inset-0 z-[120] flex flex-col overflow-hidden">
      {[0, 1, 2].map((i) => (
        <span key={i} className="bar-sweep block flex-1 bg-[#0a1d23]" style={{ animationDelay: `${i * 60}ms` }} />
      ))}
    </div>
  );
}
