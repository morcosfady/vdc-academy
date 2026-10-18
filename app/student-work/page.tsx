import type { Metadata } from "next";
import Image from "next/image";
import { PageHero } from "@/components/ui/PageHero";
import { Button } from "@/components/ui/Button";
import { content, hasStudentWork } from "@/content/site";
import { pages } from "@/content/copy-pages";

export const metadata: Metadata = { title: "Student Work", robots: hasStudentWork() ? undefined : { index: false } };

const c = pages.studentWork;

export default function StudentWorkPage() {
  if (!hasStudentWork()) {
    return (
      <PageHero sheet={c.sheet} eyebrow={c.name} title={[c.emptyTitle]} subtitle={c.emptyLead} className="[&_.rule-b]:border-b-0 pb-24 lg:pb-32">
        <Button href="/apply">{pages.empty.primary}</Button>
        <Button href="/programs" variant="link">
          {pages.empty.secondary}
        </Button>
      </PageHero>
    );
  }
  return (
    <>
      <PageHero sheet={c.sheet} eyebrow={c.name} title={[c.title]} />
      <section className="theme-light section !pt-12 lg:!pt-16">
        <ul className="wrap grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
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
      </section>
    </>
  );
}
