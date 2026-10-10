"use client";

import { useEffect, useRef, useState } from "react";
import { useWebGL } from "./useWebGL";

// Mounts a 3D scene only after it scrolls near the viewport, and tells it when it is on screen.
export function WhenVisible({
  children,
  fallback,
  className,
  label,
}: {
  children: (active: boolean) => React.ReactNode;
  fallback: React.ReactNode;
  className?: string;
  label?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [seen, setSeen] = useState(false);
  const [active, setActive] = useState(false);
  const webgl = useWebGL();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        setActive(e.isIntersecting);
        if (e.isIntersecting) setSeen(true);
      },
      { rootMargin: "200px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className={className} role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      {webgl === false ? fallback : seen && webgl ? children(active) : fallback}
    </div>
  );
}
