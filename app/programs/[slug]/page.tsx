import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProgram, programs } from "@/content/programs";
import { programMeta } from "@/content/floors";
import { cover } from "@/content/media";
import { pages } from "@/content/copy-pages";
import { money } from "@/lib/pricing";
import { PriceBox } from "@/components/programs/PriceBox";
import { ProgramHero } from "@/components/programs/ProgramHero";
import { sheetOf } from "@/components/programs/sheet";
import { ProgramCard } from "@/components/ds/Cards";
import { Software } from "@/components/ds/Chips";
import { Accordion } from "@/components/ds/Controls";
import { Button } from "@/components/ui/Button";
import { JsonLd, breadcrumbLd, courseLd } from "@/components/seo/JsonLd";
import { pageMeta } from "@/components/seo/meta";

type Props = { params: Promise<{ slug: string }> };
const c = pages.program;
const rule = { borderColor: "var(--rule)" } as const;

// Search titles (<= 46 chars before the " | VDC Academy" suffix) and descriptions (<= 155 chars), one per program.
const seo: Record<string, { title: string; description: string }> = {
  "vdc-professional-bootcamp": { title: "VDC Professional Bootcamp: BIM Training", description: "The flagship VDC training path: Revit modeling, Navisworks clash detection, 4D simulation, a capstone project and career support." },
  "bim-fundamentals-revit": { title: "BIM Fundamentals with Revit: Beginner Course", description: "A beginner BIM course in Autodesk Revit. Start from zero, learn BIM and LOD basics, and build your first model with views, schedules and sheets." },
  "revit-architecture": { title: "Revit Architecture Course", description: "An intermediate Revit course for architectural modeling: curtain walls, stairs, roofs, detailed drawing sets, worksets and design options." },
  "revit-structure": { title: "Revit Structure Course", description: "An intermediate Revit course for structural framing, foundations and slabs, with structural documentation and coordination with architecture." },
  "revit-mep": { title: "Revit MEP Course: Ducts, Pipes and Electrical", description: "An intermediate Revit MEP course: model ducts, pipes and electrical systems, size and tag them, and coordinate above ceilings on a commercial floor." },
  "low-voltage-bim": { title: "Low Voltage and Technology Systems BIM", description: "Model data, security, AV and fire alarm systems in Revit, with custom device families, device schedules and clash checks against MEP." },
  "revit-family-creation": { title: "Revit Family Creation Course", description: "An advanced Revit course on parametric families: reference planes, parameters and formulas, type catalogs, nested families and MEP connectors." },
  "navisworks-clash-detection": { title: "Navisworks Clash Detection Course", description: "A Navisworks clash detection course: federate multi-discipline models, set up clash tests and rules, and write and track clash reports." },
  "4d-5d-simulation": { title: "4D/5D Construction Simulation Course", description: "An advanced VDC course: link a model to the schedule in Navisworks, build a 4D construction simulation and extract quantities for 5D cost." },
  "dynamo-for-revit": { title: "Dynamo for Revit Course: BIM Automation", description: "An advanced Dynamo course for Revit users: build visual scripts, read and write Revit data, exchange with Excel and automate checks and tagging." },
  "bim-management-iso-19650": { title: "BIM Management and ISO 19650 Course", description: "An advanced BIM management course: ISO 19650 concepts, BIM execution plans, a common data environment, model audits and handover data." },
};

export function generateStaticParams() {
  return programs.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = getProgram((await params).slug);
  if (!p) return {};
  const s = seo[p.slug] ?? { title: p.title, description: p.summary };
  return pageMeta({ ...s, path: `/programs/${p.slug}/`, og: `program-${p.slug}`, ogAlt: `${p.title}, a VDC Academy program` });
}

export default async function ProgramPage({ params }: Props) {
  const p = getProgram((await params).slug);
  if (!p) notFound();

  // Related: same floor first, then the rest of the catalog, three in total.
  const floor = programMeta[p.slug]?.floor;
  const related = [...programs.filter((x) => x.slug !== p.slug && programMeta[x.slug]?.floor === floor), ...programs.filter((x) => x.slug !== p.slug && programMeta[x.slug]?.floor !== floor)].slice(0, 3);

  // Only facts we know are shown. Missing ones are left out, never faked.
  const facts = [p.durationWeeks !== null && c.facts.weeks(p.durationWeeks), p.hours !== null && c.facts.hours(p.hours), p.format, p.level].filter((x): x is string => Boolean(x));

  return (
    <>
      <JsonLd data={courseLd(p)} />
      <JsonLd
        data={breadcrumbLd([
          { name: "Programs", path: "/programs/" },
          { name: p.title, path: `/programs/${p.slug}/` },
        ])}
      />
      <ProgramHero slug={p.slug} sheet={sheetOf(p)} level={p.level} title={p.title} summary={p.summary} facts={facts} />

      <section className="theme-light rule-t">
        <div className="wrap">
          <div className="grid-12 gap-y-14 py-16 lg:py-24">
            <div className="col-span-12 space-y-20 lg:col-span-7">
              <section aria-labelledby="outcomes">
                <h2 id="outcomes" className="t-h3">
                  {c.outcomes}
                </h2>
                <ol className="mt-8 border-t" style={rule}>
                  {p.outcomes.map((o, i) => (
                    <li key={o} className="flex gap-6 border-b py-4 text-[1.0625rem] text-text" style={rule}>
                      <span className="mono w-8 shrink-0 pt-1.5 !text-accent-text">{String(i + 1).padStart(2, "0")}</span>
                      <span>{o}</span>
                    </li>
                  ))}
                </ol>
              </section>

              <section aria-labelledby="modules">
                <h2 id="modules" className="t-h3">
                  {c.modules}
                </h2>
                <Accordion
                  className="mt-8"
                  items={p.modules.map((m) => ({
                    q: m.title,
                    a: (
                      <ul className="space-y-2">
                        {m.lessons.map((l) => (
                          <li key={l} className="flex gap-3">
                            <span aria-hidden className="mt-3 h-px w-4 shrink-0 bg-current opacity-50" />
                            {l}
                          </li>
                        ))}
                      </ul>
                    ),
                  }))}
                />
              </section>

              <div className="grid gap-12 sm:grid-cols-2">
                <section aria-labelledby="software">
                  <h2 id="software" className="t-h4">
                    {c.software}
                  </h2>
                  <ul className="mt-5 flex flex-wrap gap-2">
                    {p.software.map((s) => (
                      <li key={s}>
                        <Software>{s}</Software>
                      </li>
                    ))}
                  </ul>
                </section>
                <section aria-labelledby="build">
                  <h2 id="build" className="t-h4">
                    {c.build}
                  </h2>
                  <ul className="mt-5 space-y-3 text-muted">
                    {p.projects.map((x) => (
                      <li key={x} className="flex gap-3">
                        <span aria-hidden className="mt-3 h-px w-4 shrink-0 bg-current opacity-50" />
                        {x}
                      </li>
                    ))}
                  </ul>
                </section>
              </div>

              <section aria-labelledby="details">
                <h2 id="details" className="t-h4">
                  {c.details}
                </h2>
                <dl className="mt-5 border-t" style={rule}>
                  <div className="grid gap-2 border-b py-4 sm:grid-cols-[160px_1fr]" style={rule}>
                    <dt className="mono pt-1">{c.prerequisites}</dt>
                    <dd className="text-muted">{p.prerequisites.join(", ")}</dd>
                  </div>
                  <div className="grid gap-2 border-b py-4 sm:grid-cols-[160px_1fr]" style={rule}>
                    <dt className="mono pt-1">{c.certificate}</dt>
                    <dd className="text-muted">{p.certificate}</dd>
                  </div>
                </dl>
              </section>
            </div>

            <div className="col-span-12 lg:col-span-4 lg:col-start-9">
              <PriceBox className="lg:sticky lg:top-24" slug={p.slug} priceFull={p.priceFull} nextCohort={p.nextCohortDate} seats={p.seats} schedule={p.schedule} />
            </div>
          </div>
        </div>
      </section>

      <section className="theme-light section !pt-0" aria-labelledby="related">
        <div className="wrap">
          <div className="flex flex-wrap items-end justify-between gap-6 border-t pt-10" style={rule}>
            <h2 id="related" className="t-h3">
              {c.related}
            </h2>
            <Button href="/programs" variant="link">
              {c.all}
            </Button>
          </div>
          <ul className="mt-10 grid gap-6 md:grid-cols-3">
            {related.map((r) => (
              <li key={r.slug}>
                <ProgramCard href={`/programs/${r.slug}`} sheet={sheetOf(r)} title={r.title} line={r.summary} level={r.level} software={r.software.slice(0, 3)} photo={cover(r.slug).photo} pos={cover(r.slug).pos} price={r.priceFull !== null ? money(r.priceFull) : undefined} />
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
