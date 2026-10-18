import type { Metadata } from "next";
import Image from "next/image";
import { PageHero } from "@/components/ui/PageHero";
import { Button } from "@/components/ui/Button";
import { content, hasInstructors } from "@/content/site";
import { pages } from "@/content/copy-pages";

export const metadata: Metadata = { title: "Instructors", robots: hasInstructors() ? undefined : { index: false } };

const c = pages.instructors;

export default function InstructorsPage() {
  if (!hasInstructors()) {
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
        <ul className="wrap grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {content.instructors.map((i) => (
            <li key={i.name} className="card overflow-hidden">
              {i.photo && (
                <div className="aspect-[4/5] bg-paper-2">
                  <Image src={i.photo} alt="" width={400} height={500} className="h-full w-full object-cover" />
                </div>
              )}
              <div className="p-6">
                <h2 className="!text-[1.25rem]">{i.name}</h2>
                <p className="mono mt-2">
                  {i.role}
                  {i.years ? ` · ${c.years(i.years)}` : ""}
                </p>
                {i.bio && <p className="t-small mt-4 text-muted">{i.bio}</p>}
                {i.linkedin && (
                  <p className="mt-4">
                    <a href={i.linkedin} className="ul-draw pb-0.5 text-[15px] font-medium text-text hover:text-accent-text">
                      LinkedIn
                    </a>
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
