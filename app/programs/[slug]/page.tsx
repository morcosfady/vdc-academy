import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProgram, programs } from "@/content/programs";
import { Badge } from "@/components/ui/Badge";
import { Slab } from "@/components/ui/Slab";
import { PriceBox } from "@/components/programs/PriceBox";
import { ProgramCard } from "@/components/programs/ProgramCard";
import { JsonLd } from "@/components/seo/JsonLd";
import { ProgramHero } from "@/components/programs/ProgramHero";

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

  // Only fields we actually know are shown. Missing ones are left out, never faked.
  const facts: [string, string][] = [
    ["Duration", p.durationWeeks !== null ? `${p.durationWeeks} weeks` : ""],
    ["Hours", p.hours !== null ? String(p.hours) : ""],
    ["Format", p.format ?? ""],
    ["Schedule", p.schedule ?? ""],
    ["Next cohort", p.nextCohortDate ?? ""],
    ["Seats", p.seats !== null ? String(p.seats) : ""],
    ["Prerequisites", p.prerequisites.join(", ")],
    ["Certificate", p.certificate],
  ];
  const known = facts.filter(([, v]) => v);

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Course",
          name: p.title,
          description: p.summary,
          provider: { "@type": "EducationalOrganization", name: "VDC Academy", sameAs: "https://baybimdesigns.com/" },
          ...(p.priceFull !== null ? { offers: { "@type": "Offer", price: p.priceFull, priceCurrency: "USD" } } : {}),
        }}
      />
      <ProgramHero slug={p.slug} level={p.level} title={p.title} summary={p.summary} />

      <div className="mx-auto grid max-w-[1600px] gap-12 px-5 py-20 md:px-10 lg:grid-cols-3 lg:py-32">
        <div className="space-y-24 lg:col-span-2">
          <Slab as="section">
            <h2 className="display-md mb-8">What you will learn</h2>
            <ol className="divide-y divide-border border-y border-border">
              {p.outcomes.map((o, i) => (
                <li key={o} className="flex gap-6 py-4">
                  <span className="label w-8 pt-1 !text-accent-text">{String(i + 1).padStart(2, "0")}</span>
                  <span>{o}</span>
                </li>
              ))}
            </ol>
          </Slab>

          <Slab as="section">
            <h2 className="display-md mb-8">Modules</h2>
            <div className="divide-y divide-border border-y border-border">
              {p.modules.map((m, i) => (
                <details key={m.title} className="group py-5" open={i === 0}>
                  <summary className="flex cursor-pointer list-none items-baseline justify-between gap-6">
                    <span className="flex items-baseline gap-5">
                      <span className="label !text-accent-text">M-{String(i + 1).padStart(2, "0")}</span>
                      <span className="text-lg">{m.title}</span>
                    </span>
                    <span aria-hidden className="text-2xl font-light transition-transform duration-300 group-open:rotate-45">+</span>
                  </summary>
                  <ul className="mt-4 space-y-2 ps-[3.2rem] text-muted">
                    {m.lessons.map((l) => <li key={l}>{l}</li>)}
                  </ul>
                </details>
              ))}
            </div>
          </Slab>

          <Slab as="section" className="grid gap-12 sm:grid-cols-2">
            <div>
              <h2 className="label mb-4">Software</h2>
              <ul className="flex flex-wrap gap-2">{p.software.map((s) => <li key={s}><Badge className="px-4 py-2">{s}</Badge></li>)}</ul>
            </div>
            <div>
              <h2 className="label mb-4">You will build</h2>
              <ul className="space-y-2 text-muted">{p.projects.map((x) => <li key={x}>{x}</li>)}</ul>
            </div>
          </Slab>

          {known.length > 0 && (
            <Slab as="section">
              <h2 className="label mb-4">Details</h2>
              <dl className="grid gap-px border border-border bg-border sm:grid-cols-2">
                {known.map(([k, v]) => (
                  <div key={k} className="bg-bg p-5">
                    <dt className="label mb-1">{k}</dt>
                    <dd>{v}</dd>
                  </div>
                ))}
              </dl>
            </Slab>
          )}
        </div>

        <div className="lg:sticky lg:top-28 lg:self-start">
          <PriceBox slug={p.slug} priceFull={p.priceFull} />
        </div>
      </div>

      <section className="mx-auto max-w-[1600px] px-5 pb-32 md:px-10">
        <h2 className="display-md mb-10">Related programs</h2>
        <ul className="grid gap-5 md:grid-cols-3">
          {related.map((r) => <li key={r.slug}><ProgramCard p={r} /></li>)}
        </ul>
        <p className="mt-10"><Link prefetch={false} href="/programs" className="text-accent-text underline underline-offset-8">All programs</Link></p>
      </section>
    </>
  );
}
