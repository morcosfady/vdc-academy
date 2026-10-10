import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { site } from "@/config/site";
import type { Program } from "@/content/programs";
import { programIcons, Val } from "./bits";

export function ProgramCard({ p }: { p: Program }) {
  const Icon = programIcons[p.icon] ?? programIcons.Building2;
  return (
    <Link
      href={`/programs/${p.slug}`}
      className="group flex h-full flex-col rounded-card border border-border bg-bg-elevated p-6 transition hover:-translate-y-1 hover:border-brand-accent hover:shadow-[0_0_28px_var(--glow)]"
    >
      <Icon className="mb-4 text-brand-accent transition group-hover:scale-110" size={32} aria-hidden />
      <h3 className="text-base font-bold">{p.title}</h3>
      <p className="mt-2 flex-1 text-sm text-text-muted">{p.summary}</p>
      <div className="mt-4 flex flex-wrap gap-2 text-xs">
        <Badge>{p.level}</Badge>
        <Badge><Val v={p.durationWeeks} ph="DURATION" suffix=" weeks" /></Badge>
        <Badge><Val v={p.format} ph="FORMAT" /></Badge>
      </div>
      <Badge className="mt-3 w-fit border-brand-warm text-brand-warm">🎓 Fresh grad: up to {site.freshGradMaxDiscount}% off</Badge>
      <span className="mt-4 text-sm font-medium text-brand-accent">View program →</span>
    </Link>
  );
}
