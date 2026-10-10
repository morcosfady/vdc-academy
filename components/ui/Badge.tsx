import { cn } from "@/lib/utils";

// Small chip used for software and notes.
export function Badge({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-xs text-text", className)}>
      {children}
    </span>
  );
}
export { Badge as Chip };
