"use client";

import Link from "next/link";
import { useRef } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "glow" | "outline" | "secondary" | "ghost" | "link";

const base = "inline-flex items-center justify-center gap-2 text-[15px] font-medium transition-[transform,box-shadow,color,border-color,background-color] duration-300";
const sized = "h-[52px] rounded-[10px] px-7 hover:-translate-y-0.5 active:scale-[0.98]";

const styles: Record<Variant, string> = {
  primary: `${sized} bg-cta text-cta-text hover:bg-cta-hover hover:shadow-[0_10px_30px_-8px_var(--glow)]`,
  glow: `${sized} bg-cta text-cta-text shadow-[0_8px_26px_-10px_var(--glow)] hover:bg-cta-hover hover:shadow-[0_12px_38px_-6px_var(--glow)]`,
  outline: `${sized} border border-text/35 text-text hover:border-accent hover:text-accent-text`,
  secondary: `${sized} border border-border text-text hover:border-accent hover:text-accent-text`,
  ghost: `${sized} text-text hover:bg-surface`,
  link: "ul-draw h-auto px-0 pb-1 text-text hover:text-accent-text",
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
    el.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.15}px, ${(e.clientY - r.top - r.height / 2) * 0.25}px)`;
  }
  const leave = () => ref.current && (ref.current.style.transform = "");

  return (
    <Link
      prefetch={false}
      ref={ref}
      href={href}
      onPointerMove={move}
      onPointerLeave={leave}
      className={cn(base, styles[variant], className)}
    >
      {children}
    </Link>
  );
}
