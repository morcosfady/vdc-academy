"use client";

import { useRef } from "react";
import { motion, useInView } from "motion/react";
import { useReduceMotion } from "@/hooks/useReduceMotion";

// Stepped-panel reveal: the block rises out of a mask, offset by `index` like floors stacking.
export function Slab({
  children,
  index = 0,
  className,
  as = "div",
}: {
  children: React.ReactNode;
  index?: number;
  className?: string;
  as?: "div" | "li" | "section";
}) {
  const reduce = useReduceMotion();
  const Tag = motion[as];
  if (reduce) {
    const Plain = as;
    return <Plain className={className}>{children}</Plain>;
  }
  return (
    <Tag
      className={className}
      initial={{ clipPath: "inset(0 0 100% 0)", y: 40, opacity: 0 }}
      whileInView={{ clipPath: "inset(0 0 0% 0)", y: 0, opacity: 1 }}
      viewport={{ once: true, margin: "-8% 0px" }}
      transition={{ duration: 1, delay: index * 0.1, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </Tag>
  );
}

// Lines of text rising from a mask. Pass an array of lines.
export function RiseLines({ lines, className }: { lines: string[]; className?: string }) {
  const reduce = useReduceMotion();
  const ref = useRef<HTMLSpanElement>(null);
  // Observe the wrapper, not the masked lines (a clipped element never counts as visible).
  const inView = useInView(ref, { once: true, margin: "0px 0px -5% 0px" });
  return (
    <span ref={ref} className={className}>
      {lines.map((l, i) => (
        <span key={i} className="block overflow-hidden pb-[0.08em]">
          {i > 0 && " "}
          {reduce ? (
            <span className="block">{l}</span>
          ) : (
            <motion.span
              className="block"
              initial={{ y: "110%" }}
              animate={{ y: inView ? 0 : "110%" }}
              transition={{ duration: 1.1, delay: 0.1 + i * 0.09, ease: [0.16, 1, 0.3, 1] }}
            >
              {l}
            </motion.span>
          )}
        </span>
      ))}
    </span>
  );
}
