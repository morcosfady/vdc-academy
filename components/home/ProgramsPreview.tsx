"use client";

import { useRef } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Building2, CalendarClock, Cable, ClipboardCheck, Layers, Puzzle, Rocket, Ruler, ScanSearch, Workflow, Zap, type LucideIcon } from "lucide-react";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Badge } from "@/components/ui/Badge";
import { programs } from "@/content/programs";
import { site } from "@/config/site";

const icons: Record<string, LucideIcon> = { Rocket, Building2, Ruler, Layers, Workflow, Cable, Puzzle, ScanSearch, CalendarClock, Zap, ClipboardCheck };

// Scroll-snap carousel: swipe on mobile, arrows and trackpad on desktop.
export function ProgramsPreview() {
  const track = useRef<HTMLUListElement>(null);
  const scroll = (dir: number) => track.current?.scrollBy({ left: dir * 340, behavior: "smooth" });

  return (
    <section className="mx-auto max-w-7xl px-4 py-24 md:px-6">
      <div className="flex items-end justify-between gap-4">
        <SectionHeader tag="E-501 · PROGRAMS" title="Pick your track" />
        <div className="mb-10 hidden gap-2 md:flex">
          <button type="button" aria-label="Previous programs" onClick={() => scroll(-1)} className="grid size-10 place-items-center rounded-btn border border-border hover:bg-surface">
            <ArrowLeft size={18} aria-hidden />
          </button>
          <button type="button" aria-label="Next programs" onClick={() => scroll(1)} className="grid size-10 place-items-center rounded-btn border border-border hover:bg-surface">
            <ArrowRight size={18} aria-hidden />
          </button>
        </div>
      </div>
      <ul ref={track} className="-mx-4 flex snap-x snap-mandatory gap-5 overflow-x-auto px-4 pb-4 md:mx-0 md:px-0" tabIndex={0} aria-label="Programs">
        {programs.map((p) => {
          const Icon = icons[p.icon] ?? Building2;
          return (
            <li key={p.slug} className="w-[300px] shrink-0 snap-start">
              <Link
                href={`/programs/${p.slug}`}
                className="group flex h-full flex-col rounded-card border border-border bg-bg-elevated p-6 transition hover:-translate-y-1 hover:border-brand-accent hover:shadow-[0_0_28px_var(--glow)]"
              >
                <Icon className="mb-4 text-brand-accent transition group-hover:scale-110" size={32} aria-hidden />
                <h3 className="text-base font-bold">{p.title}</h3>
                <p className="mt-2 flex-1 text-sm text-text-muted">{p.summary}</p>
                <div className="mt-4 flex flex-wrap gap-2 text-xs">
                  <Badge>{p.level}</Badge>
                  <Badge><span className="placeholder-chip">[DURATION]</span></Badge>
                  <Badge><span className="placeholder-chip">[FORMAT]</span></Badge>
                </div>
                <Badge className="mt-3 w-fit border-brand-warm text-brand-warm">
                  🎓 Fresh grad price: up to {site.freshGradMaxDiscount}% off
                </Badge>
                <span className="mt-4 text-sm font-medium text-brand-accent">View program →</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
