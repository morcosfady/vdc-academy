import { cn } from "@/lib/utils";

// Small pill used for software, levels and notes.
export function Badge({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 border border-border px-3 py-1 text-xs tracking-wide text-text", className)}>
      {children}
    </span>
  );
}
export { Badge as Chip };
