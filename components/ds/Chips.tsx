import { cn } from "@/lib/utils";

// Chip: a filter. Software: a software name. Tag: a small status label. 4px radius, quiet.
export function Chip({ children, active, className, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cn(
        "inline-flex h-11 items-center rounded-[4px] border px-4 text-[15px] transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-45",
        active ? "border-transparent bg-cta text-cta-text" : "text-text hover:border-accent hover:text-accent-text",
        className,
      )}
      style={active ? undefined : { borderColor: "var(--rule)" }}
      {...rest}
    >
      {children}
    </button>
  );
}

export function Software({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex h-7 items-center rounded-[4px] border px-2.5 text-[13px] text-muted", className)} style={{ borderColor: "var(--rule)" }}>
      {children}
    </span>
  );
}

export function Tag({ children, tone = "default", className }: { children: React.ReactNode; tone?: "default" | "brass" | "blueprint"; className?: string }) {
  return (
    <span
      className={cn("mono inline-flex h-6 items-center rounded-[4px] px-2", className)}
      style={
        tone === "brass"
          ? { background: "rgba(184,146,90,0.16)", color: "var(--warm)" }
          : tone === "blueprint"
            ? { background: "var(--mist)", color: "#1c4a96" }
            : { border: "1px solid var(--rule)" }
      }
    >
      {children}
    </span>
  );
}
