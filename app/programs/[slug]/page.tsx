import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Award, CheckCircle2 } from "lucide-react";
import { getProgram, programs } from "@/content/programs";
import { PageHero } from "@/components/ui/PageHero";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PriceBox } from "@/components/programs/PriceBox";
import { ProgramCard } from "@/components/programs/ProgramCard";
import { Val } from "@/components/programs/bits";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return programs.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = getProgram((await params).slug);
  return p ? { title: p.title, description: p.summary } : {};
}

export default async function ProgramPage({ params }: Props) {
  const p = getProgram((await params).slug);
  if (!p) notFound();
  const related = programs.filter((x) => x.slug !== p.slug).slice(0, 3);

  return (
    <>
      <PageHero tag={`E-502 · ${p.level.toUpperCase()}`} title={p.title} subtitle={p.summary}>
        <Button href={`/apply?program=${p.slug}`} variant="glow">Apply Now</Button>
        <Badge>🎓 Fresh grads save up to 40%</Badge>
      </PageHero>

      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 md:px-6 lg:grid-cols-3">
        <div className="space-y-14 lg:col-span-2">
          <section>
            <h2 className="mb-4 text-2xl font-bold">What you will learn</h2>
            <ul className="space-y-2">
              {p.outcomes.map((o) => (
                <li key={o} className="flex gap-3"><CheckCircle2 className="mt-1 shrink-0 text-brand-accent" size={18} aria-hidden />{o}</li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="mb-4 text-2xl font-bold">Modules</h2>
            <div className="divide-y divide-border border-y border-border">
              {p.modules.map((m, i) => (
                <details key={m.title} className="group py-4" open={i === 0}>
                  <summary className="flex cursor-pointer list-none items-center justify-between font-medium">
                    <span><span className="me-3 font-mono text-xs text-text-muted">{String(i + 1).padStart(2, "0")}</span>{m.title}</span>
                    <span aria-hidden className="ms-4 transition group-open:rotate-45">+</span>
                  </summary>
                  <ul className="mt-3 list-disc space-y-1 ps-10 text-text-muted">
                    {m.lessons.map((l) => <li key={l}>{l}</li>)}
                  </ul>
                </details>
              ))}
            </div>
          </section>

          <section className="grid gap-8 sm:grid-cols-2">
            <div>
              <h2 className="mb-3 text-xl font-bold">Software</h2>
              <div className="flex flex-wrap gap-2">{p.software.map((s) => <Badge key={s}>{s}</Badge>)}</div>
            </div>
            <div>
              <h2 className="mb-3 text-xl font-bold">Projects</h2>
              <ul className="list-disc space-y-1 ps-5 text-text-muted">{p.projects.map((x) => <li key={x}>{x}</li>)}</ul>
            </div>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-bold">Details</h2>
            <dl className="grid gap-4 rounded-card border border-border p-6 sm:grid-cols-2">
              <div><dt className="text-sm text-text-muted">Duration</dt><dd><Val v={p.durationWeeks} ph="DURATION" suffix=" weeks" /></dd></div>
              <div><dt className="text-sm text-text-muted">Hours</dt><dd><Val v={p.hours} ph="HOURS" /></dd></div>
              <div><dt className="text-sm text-text-muted">Format</dt><dd><Val v={p.format} ph="FORMAT" /></dd></div>
              <div><dt className="text-sm text-text-muted">Schedule</dt><dd><Val v={p.schedule} ph="SCHEDULE" /></dd></div>
              <div><dt className="text-sm text-text-muted">Next cohort</dt><dd><Val v={p.nextCohortDate} ph="DATE" /></dd></div>
              <div><dt className="text-sm text-text-muted">Seats</dt><dd><Val v={p.seats} ph="SEATS" /></dd></div>
              <div className="sm:col-span-2"><dt className="text-sm text-text-muted">Prerequisites</dt><dd>{p.prerequisites.join(", ")}</dd></div>
              <div className="flex gap-2 sm:col-span-2"><Award className="text-brand-accent" size={18} aria-hidden />{p.certificate}</div>
            </dl>
          </section>
        </div>

        <div className="lg:sticky lg:top-24 lg:self-start">
          <PriceBox slug={p.slug} priceFull={p.priceFull} />
        </div>
      </div>

      <section className="mx-auto max-w-7xl px-4 pb-24 md:px-6">
        <h2 className="mb-6 text-2xl font-bold">Related programs</h2>
        <ul className="grid gap-5 md:grid-cols-3">
          {related.map((r) => <li key={r.slug}><ProgramCard p={r} /></li>)}
        </ul>
        <p className="mt-8"><Link href="/programs" className="text-brand-accent underline">All programs</Link></p>
      </section>
    </>
  );
}
