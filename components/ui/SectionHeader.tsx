import { cn } from "@/lib/utils";

type Props = {
  tag: string; // drawing sheet tag, for example "A-101 · PROGRAMS"
  title: string;
  subtitle?: string;
  className?: string;
};

export function SectionHeader({ tag, title, subtitle, className }: Props) {
  return (
    <header className={cn("mb-10 max-w-3xl", className)}>
      <p className="mb-3 font-mono text-xs uppercase tracking-[0.2em] text-text-muted">{tag}</p>
      <h2 className="text-3xl font-bold md:text-4xl">{title}</h2>
      {subtitle && <p className="mt-4 text-text-muted">{subtitle}</p>}
    </header>
  );
}
