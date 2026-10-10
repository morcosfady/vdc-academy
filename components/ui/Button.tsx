import Link from "next/link";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "glow";

const styles: Record<Variant, string> = {
  primary: "bg-cta text-cta-text hover:brightness-110",
  secondary: "border border-border text-text hover:bg-surface",
  ghost: "text-text hover:bg-surface",
  glow: "bg-cta text-cta-text shadow-[0_0_24px_var(--glow)] hover:shadow-[0_0_36px_var(--glow)] hover:brightness-110",
};

type Props = {
  href: string;
  variant?: Variant;
  className?: string;
  children: React.ReactNode;
};

export function Button({ href, variant = "primary", className, children }: Props) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-btn px-6 py-3 font-heading text-sm font-bold uppercase tracking-wide transition",
        styles[variant],
        className,
      )}
    >
      {children}
    </Link>
  );
}
