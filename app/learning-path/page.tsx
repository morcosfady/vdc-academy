import type { Metadata } from "next";
import { PageHero } from "@/components/ui/PageHero";
import { Path } from "@/components/home/Path";
import { ProgramCard } from "@/components/ds/Cards";
import { SectionHeader } from "@/components/ds/Sections";
import { sheetOf } from "@/components/programs/sheet";
import { floors } from "@/content/floors";
import { programs } from "@/content/programs";
import { cover } from "@/content/media";
import { pages } from "@/content/copy-pages";
import { money } from "@/lib/pricing";

export const metadata: Metadata = { title: "Learning Path", description: "From BIM trainee to VDC manager in five steps." };

const c = pages.path;
const rule = { borderColor: "var(--rule)" } as const;

export default function LearningPathPage() {
  return (
    <>
      <PageHero sheet={c.sheet} eyebrow={c.name} title={[c.title]} subtitle={c.lead} />

      {/* The home page section drawing. Its own header and its link back to this page are hidden here. */}
      <div className="[&>section]:!pt-8 [&>section]:!pb-0 lg:[&>section]:!pt-10 [&_header]:hidden [&_a[href*=learning-path]]:hidden [&_.mt-16]:!mt-0">
        <Path />
      </div>

      <section className="theme-light section" aria-labelledby="floors">
        <div className="wrap">
          <SectionHeader title={<span id="floors">{c.floors.title}</span>} lead={c.floors.lead} />
          <ol className="mt-14">
            {floors.map((f) => {
              const list = f.slugs.map((s) => programs.find((p) => p.slug === s)!).filter(Boolean);
              return (
                <li key={f.n} className="grid-12 gap-y-6 border-t py-10" style={rule}>
                  <div className="col-span-12 lg:col-span-3">
                    <p className="mono">{c.floors.floor(f.n)}</p>
                    <h3 className="mt-3 !text-[1.5rem]">{f.title}</h3>
                    <p className="t-small mt-2 text-dim">{f.note}</p>
                  </div>
                  <ul className="col-span-12 grid gap-6 md:grid-cols-2 lg:col-span-9">
                    {list.map((p) => (
                      <li key={p.slug}>
                        <ProgramCard href={`/programs/${p.slug}`} sheet={sheetOf(p)} title={p.title} line={p.summary} level={p.level} software={p.software.slice(0, 3)} photo={cover(p.slug).photo} pos={cover(p.slug).pos} price={p.priceFull !== null ? money(p.priceFull) : undefined} />
                      </li>
                    ))}
                  </ul>
                </li>
              );
            })}
          </ol>
        </div>
      </section>
    </>
  );
}
