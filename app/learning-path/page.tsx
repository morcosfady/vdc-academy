import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/ui/PageHero";
import { Journey } from "@/components/home/Journey";
import { journey } from "@/content/journey";
import { programs } from "@/content/programs";

export const metadata: Metadata = { title: "Learning Path", description: "From BIM trainee to VDC manager in five steps." };

const stepPrograms = [
  ["bim-fundamentals-revit"],
  ["revit-architecture", "revit-structure", "revit-mep", "low-voltage-bim", "revit-family-creation"],
  ["navisworks-clash-detection"],
  ["4d-5d-simulation", "dynamo-for-revit"],
  ["bim-management-iso-19650", "vdc-professional-bootcamp"],
];

export default function LearningPathPage() {
  return (
    <>
      <PageHero eyebrow="Learning path" title={["From first model", "to VDC manager."]} subtitle="Five steps. Each one adds a floor." />
      <Journey full />
      <section className="mx-auto max-w-[1280px] px-5 py-24 md:px-10">
        <h2 className="display-md mb-10">Programs on each step</h2>
        <ol className="divide-y divide-border border-y border-border">
          {journey.map((s, i) => (
            <li key={s.title} className="grid gap-4 py-8 md:grid-cols-12">
              <p className="label md:col-span-1">0{i + 1}</p>
              <div className="md:col-span-4">
                <p className="display-md !text-2xl">{s.title}</p>
                <p className="mt-2 text-sm text-muted">You become: {s.role}</p>
              </div>
              <ul className="space-y-2 md:col-span-7">
                {stepPrograms[i].map((slug) => {
                  const p = programs.find((x) => x.slug === slug);
                  return p ? (
                    <li key={slug}><Link prefetch={false} href={`/programs/${slug}`} className="hover:text-accent-text">{p.title} <span aria-hidden>→</span></Link></li>
                  ) : null;
                })}
              </ul>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}
