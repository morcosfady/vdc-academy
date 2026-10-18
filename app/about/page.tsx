import type { Metadata } from "next";
import { PageHero } from "@/components/ui/PageHero";
import { Button } from "@/components/ui/Button";
import { Photo } from "@/components/ui/Photo";
import { FactRow } from "@/components/ds/Sections";
import { media } from "@/content/media";
import { pages } from "@/content/copy-pages";
import { site } from "@/config/site";

export const metadata: Metadata = { title: "About", description: "VDC Academy is the training academy of Bay BIM Designs in Fort Worth, TX." };

const c = pages.about;
const rule = { borderColor: "var(--rule)" } as const;

export default function AboutPage() {
  return (
    <>
      <PageHero sheet={c.sheet} eyebrow={c.name} title={[c.title]} subtitle={c.lead} />

      <section className="theme-light section !pt-12 lg:!pt-16">
        <div className="wrap">
          <div className="grid-12 items-start gap-y-12">
            <figure className="col-span-12 lg:col-span-7">
              <div className="aspect-[4/3] w-full overflow-hidden rounded-[12px] bg-paper-2">
                <Photo photo={media.team.photo} alt={media.team.alt} className="parallax-y" />
              </div>
            </figure>
            <div className="col-span-12 lg:col-span-4 lg:col-start-9">
              {c.story.map((p) => (
                <p key={p.slice(0, 20)} className="t-body mt-6 text-muted first:mt-0">
                  {p}
                </p>
              ))}
              <p className="mt-8">
                <a href={site.parentUrl} className="ul-draw inline-flex items-center gap-2 pb-1 text-[15px] font-medium text-text hover:text-accent-text">
                  {c.visit}
                  <svg aria-hidden width="16" height="12" viewBox="0 0 16 12">
                    <path d="M0 6h14M9 1l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.5" />
                  </svg>
                </a>
              </p>
            </div>
          </div>
          <FactRow className="mt-14 border-t pt-8" items={c.facts} />
        </div>
      </section>

      <section className="theme-light section !pt-0" aria-labelledby="values">
        <div className="wrap">
          <h2 id="values" className="t-h3">
            {c.values.title}
          </h2>
          <ol className="mt-10 grid gap-x-6 gap-y-8 border-t pt-8 md:grid-cols-3" style={rule}>
            {c.values.items.map((v, i) => (
              <li key={v.t}>
                <p className="mono !text-accent-text">{String(i + 1).padStart(2, "0")}</p>
                <h3 className="mt-4 !text-[1.25rem]">{v.t}</h3>
                <p className="t-small mt-2 text-dim">{v.d}</p>
              </li>
            ))}
          </ol>
          <div className="mt-14 flex flex-col gap-5 sm:flex-row sm:items-center">
            <Button href="/apply">{c.primary}</Button>
            <Button href="/programs" variant="link">
              {c.secondary}
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
