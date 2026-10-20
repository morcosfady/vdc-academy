import { ProgramCard } from "@/components/ds/Cards";
import { programs } from "@/content/programs";
import { cover } from "@/content/media";
import { coverAlt } from "@/assets/images/covers";
import { sheetOf } from "@/components/programs/sheet";
import type { CurrentStatus } from "@/lib/db";

// Two programs by current status. Simple rules, no scoring: a fresh graduate or student starts with fundamentals and
// the bootcamp, a professional adds coordination and MEP, a career changer takes fundamentals and architecture.
const picks: Record<CurrentStatus, string[]> = {
  fresh_grad: ["bim-fundamentals-revit", "vdc-professional-bootcamp"],
  student: ["bim-fundamentals-revit", "vdc-professional-bootcamp"],
  professional: ["navisworks-clash-detection", "revit-mep"],
  career_changer: ["bim-fundamentals-revit", "revit-architecture"],
  other: ["bim-fundamentals-revit", "vdc-professional-bootcamp"],
};

const metaOf = (p: (typeof programs)[number]) => [p.durationWeeks !== null ? `${p.durationWeeks} weeks` : null, p.format].filter(Boolean).join(" · ") || p.level;

export function recommendedSlugs(status: CurrentStatus | null | undefined) {
  return picks[status ?? "other"];
}

export function Recommended({ status, className }: { status: CurrentStatus | null | undefined; className?: string }) {
  const list = recommendedSlugs(status)
    .map((slug) => programs.find((p) => p.slug === slug))
    .filter((p): p is (typeof programs)[number] => Boolean(p));
  return (
    <div className={className}>
      <ul className="grid gap-6 md:grid-cols-2">
        {list.map((p, i) => (
          <li key={p.slug} className="min-w-0">
            <ProgramCard
              href={`/programs/${p.slug}`}
              sheet={sheetOf(p)}
              title={p.title}
              line={p.summary}
              level={p.level}
              software={p.software}
              photo={cover(p.slug).photo}
              pos={cover(p.slug).pos}
              alt={coverAlt[p.slug]}
              meta={metaOf(p)}
              className={i === 1 ? "" : undefined}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
