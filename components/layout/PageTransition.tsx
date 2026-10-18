"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useReduceMotion } from "@/hooks/useReduceMotion";

// Between routes a single paper sheet slides over the page and off again (about 350ms each way).
// The View Transitions API is not available for static exports with App Router, so this is the CSS version.
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
  return <div key={run} aria-hidden className="sheet-sweep pointer-events-none fixed inset-0 z-[120] bg-paper" />;
}
