"use client";

import Link from "next/link";
import { useRef } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "glow" | "outline" | "secondary" | "ghost" | "link";

const styles: Record<Variant, string> = {
  primary: "bg-cta text-cta-text hover:brightness-110",
  glow: "bg-cta text-cta-text shadow-[0_0_30px_var(--glow)] hover:shadow-[0_0_48px_var(--glow)]",
  outline: "border border-text/40 text-text hover:border-accent hover:text-accent-text",
  secondary: "border border-border text-text hover:border-accent hover:text-accent-text",
  ghost: "text-text hover:bg-surface",
  link: "px-0 text-text underline-offset-8 hover:text-accent-text hover:underline",
};

type Props = {
  href: string;
  variant?: Variant;
  className?: string;
  magnetic?: boolean;
  children: React.ReactNode;
};

export function Button({ href, variant = "primary", className, magnetic, children }: Props) {
  const ref = useRef<HTMLAnchorElement>(null);

  function move(e: React.PointerEvent<HTMLAnchorElement>) {
    const el = ref.current;
    if (!magnetic || !el || e.pointerType !== "mouse") return;
    if (document.documentElement.classList.contains("reduce-motion")) return;
    const r = el.getBoundingClientRect();
    el.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.18}px, ${(e.clientY - r.top - r.height / 2) * 0.3}px)`;
  }
  const leave = () => ref.current && (ref.current.style.transform = "");

  return (
    <Link prefetch={false}
      ref={ref}
      href={href}
      onPointerMove={move}
      onPointerLeave={leave}
      className={cn(
        "inline-flex items-center justify-center gap-2 px-7 py-4 text-[13px] font-medium uppercase tracking-[0.14em] transition-[transform,box-shadow,color,border-color,filter] duration-300",
        styles[variant],
        className,
      )}
    >
      {children}
    </Link>
  );
}
