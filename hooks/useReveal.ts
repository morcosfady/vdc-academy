"use client";

import { useEffect, useRef } from "react";
import { reveal } from "@/lib/motion";

// Reveals the children matching `selector` (default: direct children) once the container scrolls into view.
export function useReveal<T extends HTMLElement>(selector = ":scope > *") {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const items = el.querySelectorAll(selector);
    items.forEach((i) => ((i as HTMLElement).style.opacity = "0"));
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        void reveal(items);
      },
      { rootMargin: "0px 0px 18% 0px" },
    );
    io.observe(el);
    const safety = window.setTimeout(() => items.forEach((i) => ((i as HTMLElement).style.opacity = "")), 5000);
    return () => {
      io.disconnect();
      window.clearTimeout(safety);
    };
  }, [selector]);
  return ref;
}
