import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { PageHero } from "@/components/ui/PageHero";
import { Button } from "@/components/ui/Button";
import { Photo } from "@/components/ui/Photo";
import { Slab } from "@/components/ui/Slab";
import { Tag } from "@/components/ds/Chips";
import { content, hasStudentWork } from "@/content/site";
import { cover } from "@/content/media";
import { getProgram } from "@/content/programs";
import { pages } from "@/content/copy-pages";

export const metadata: Metadata = { title: "Student Work", robots: hasStudentWork() ? undefined : { index: false } };

const c = pages.studentWork;
const rule = { borderColor: "var(--rule)" } as const;

// Real student projects, once the owner adds them to content.studentWork.
function RealWork() {
  return (
    <section className="theme-light section !pt-12 lg:!pt-16" aria-labelledby="real">
      <div className="wrap">
        <h2 id="real" className="t-h3">
          {c.title}
        </h2>
        <ul className="mt-10 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {content.studentWork.map((w) => (
            <li key={w.title}>
              <figure>
                <div className="aspect-[4/3] overflow-hidden rounded-[12px] bg-paper-2">
                  <Image src={w.image} alt={w.title} width={800} height={600} className="h-full w-full object-cover" />
                </div>
                <figcaption className="mt-4">
                  <p className="text-[1.0625rem] font-medium text-text">{w.title}</p>
                  {w.program && <p className="mono mt-1">{w.program}</p>}
                </figcaption>
              </figure>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export default function StudentWorkPage() {
  const real = hasStudentWork();
  return (
    <>
      <PageHero sheet={c.sheet} eyebrow={c.name} title={[real ? c.title : c.emptyTitle]} subtitle={real ? undefined : c.emptyLead}>
        <Button href="/apply">{pages.empty.primary}</Button>
        <Button href="/programs" variant="link">
          {pages.empty.secondary}
        </Button>
      </PageHero>

      {real && <RealWork />}

      {/* Four example projects, one per program cover, each tagged so nobody mistakes it for a student's work */}
      <section className={`theme-light section ${real ? "!pt-0" : "!pt-12 lg:!pt-16"}`} aria-labelledby="examples">
        <div className="wrap">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-baseline sm:justify-between">
            <h2 id="examples" className={real ? "t-h3" : "sr-only"}>
              {c.emptyTitle}
            </h2>
            <p className="mono">{c.firstCohort}</p>
          </div>
          <ul className={`grid gap-x-6 gap-y-10 sm:grid-cols-2 ${real ? "mt-10" : "mt-6"}`}>
            {c.examples.map((ex, i) => {
              const program = getProgram(ex.slug);
              const img = cover(ex.slug);
              return (
                <Slab as="li" key={ex.slug} index={i % 2} className="card overflow-hidden">
                  <figure className="flex h-full flex-col">
                    <div className="aspect-[16/10] overflow-hidden bg-paper-2">
                      <Photo photo={img.photo} alt={`${ex.t}: render of the study model`} priority={i < 2} style={{ objectPosition: img.pos }} />
                    </div>
                    <figcaption className="flex flex-1 flex-col p-6 md:p-7">
                      <div className="flex items-center justify-between gap-4">
                        <span className="mono !text-text">{`SW-${String(i + 1).padStart(2, "0")}`}</span>
                        <Tag>{c.exampleTag}</Tag>
                      </div>
                      <h3 className="mt-5 !text-[1.375rem]">{ex.t}</h3>
                      <p className="t-small mt-2 text-dim">{ex.d}</p>
                      {program && (
                        <p className="mt-auto border-t pt-4 text-[15px]" style={rule}>
                          <span className="mono me-3">{c.program}</span>
                          <Link prefetch={false} href={`/programs/${program.slug}`} className="ul-draw pb-0.5 font-medium text-text hover:text-accent-text">
                            {program.title}
                          </Link>
                        </p>
                      )}
                    </figcaption>
                  </figure>
                </Slab>
              );
            })}
          </ul>
        </div>
      </section>
    </>
  );
}
