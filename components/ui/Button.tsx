"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

// v5 buttons. primary = blueprint fill, secondary = outline, link = text with an arrow that draws its underline.
// "glow", "outline" and "ghost" are older names kept so existing pages keep working.
type Variant = "primary" | "secondary" | "link" | "glow" | "outline" | "ghost";

const base =
  "inline-flex items-center justify-center gap-2 text-[15px] font-medium transition-[transform,background-color,color,border-color] duration-200 ease-[cubic-bezier(.2,.7,.1,1)] disabled:pointer-events-none disabled:opacity-45";
const sized = "h-[52px] rounded-[8px] px-7 hover:-translate-y-px active:translate-y-0";

const styles: Record<"primary" | "secondary" | "link", string> = {
  primary: `${sized} bg-cta text-cta-text hover:bg-cta-hover`,
  secondary: `${sized} border border-[color:color-mix(in_srgb,var(--text)_35%,transparent)] text-text hover:border-accent hover:text-accent-text`,
  link: "ul-draw group h-auto gap-2 px-0 pb-1 text-text hover:text-accent-text",
};

const map: Record<Variant, "primary" | "secondary" | "link"> = {
  primary: "primary",
  secondary: "secondary",
  link: "link",
  glow: "primary",
  outline: "secondary",
  ghost: "link",
};

type Props = {
  href?: string;
  variant?: Variant;
  className?: string;
  magnetic?: boolean;
  children: React.ReactNode;
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children">;

function Arrow() {
  return (
    <svg aria-hidden width="16" height="12" viewBox="0 0 16 12" className="transition-transform duration-200 group-hover:translate-x-0.5">
      <path d="M0 6h14M9 1l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export function Button({ href, variant = "primary", className, children, ...rest }: Props) {
  // `magnetic` is accepted for older call sites and ignored in v5.
  delete (rest as { magnetic?: boolean }).magnetic;
  const v = map[variant];
  const cls = cn(base, styles[v], className);
  const inner = (
    <>
      {children}
      {v === "link" && <Arrow />}
    </>
  );
  if (href) {
    return (
      <Link prefetch={false} href={href} className={cls}>
        {inner}
      </Link>
    );
  }
  return (
    <button type="button" className={cls} {...rest}>
      {inner}
    </button>
  );
}
