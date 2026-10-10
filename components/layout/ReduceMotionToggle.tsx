"use client";

import { useEffect } from "react";
import { initReduceMotion, setReduceMotion, useReduceMotion } from "@/hooks/useReduceMotion";

export function ReduceMotionToggle() {
  const reduce = useReduceMotion();
  useEffect(initReduceMotion, []);
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm text-text-muted">
      <input
        type="checkbox"
        checked={reduce}
        onChange={(e) => setReduceMotion(e.target.checked)}
        className="size-4 accent-[var(--brand-accent)]"
      />
      Reduce motion
    </label>
  );
}
