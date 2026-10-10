"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { useReduceMotion } from "@/hooks/useReduceMotion";
import { cn } from "@/lib/utils";

type State = "idle" | "hidden" | "shown";

// Stepped-panel reveal: the block rises out of a mask, offset by `index` like floors stacking.
// Content already on screen is never hidden. Only blocks below the fold wait, then animate in with CSS.
export function Slab({
  children,
  index = 0,
  className,
  as: Tag = "div",
}: {
  children: React.ReactNode;
  index?: number;
  className?: string;
  as?: "div" | "li" | "section";
}) {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReduceMotion();
  const [state, setState] = useState<State>("idle");

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reduce || el.getBoundingClientRect().top < window.innerHeight * 0.92) {
      setState("shown");
      return;
    }
    setState("hidden");
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setState("shown");
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [reduce]);

  return (
    <Tag
      ref={ref as never}
      className={cn(state === "hidden" && "slab-hidden", state === "shown" && "slab-shown", className)}
      style={{ transitionDelay: state === "shown" ? `${index * 100}ms` : undefined }}
    >
      {children}
    </Tag>
  );
}
