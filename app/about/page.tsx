import type { Metadata } from "next";
import { photos } from "@/assets/images";
import { PageHero } from "@/components/ui/PageHero";
import { Button } from "@/components/ui/Button";
import { Photo } from "@/components/ui/Photo";
import { Slab } from "@/components/ui/Slab";
import { DimensionString } from "@/components/ds/Devices";
import { FactRow } from "@/components/ds/Sections";
import { Map } from "@/components/ds/Map";
import { pages } from "@/content/copy-pages";
import { site } from "@/config/site";
import { pageMeta } from "@/components/seo/meta";
import { JsonLd, breadcrumbLd } from "@/components/seo/JsonLd";

export const metadata: Metadata = pageMeta({ title: "About VDC Academy by Bay BIM Designs", description: "VDC Academy is the BIM and VDC training academy of Bay BIM Designs in Fort Worth, TX, taught by working BIM and VDC professionals.", path: "/about/", og: "about" });

const c = pages.about;
const rule = { borderColor: "var(--rule)" } as const;

// Section layout shared down the page: title in columns 1 to 4, content in 5 to 12.
function Row({ id, title, lead, children, className = "!pt-0" }: { id: string; title: string; lead?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`theme-light section ${className}`} aria-labelledby={id}>
      <div className="wrap">
        <div className="grid-12 gap-y-10">
          <div className="col-span-12 lg:col-span-4">
            <h2 id={id} className="t-h3">
              {title}
            </h2>
            {lead && <p className="t-small mt-4 max-w-sm text-dim">{lead}</p>}
          </div>
          <div className="col-span-12 lg:col-span-8">{children}</div>
        </div>
      </div>
    </section>
  );
}

export default function AboutPage() {
  return (
    <>
      <JsonLd data={breadcrumbLd([{ name: "About", path: "/about/" }])} />
      <PageHero sheet={c.sheet} eyebrow={c.name} title={[c.title]} subtitle={c.lead} className="[&_.rule-b]:border-b-0 [&_.rule-b]:!pb-10 lg:[&_.rule-b]:!pb-14" />

      {/* Hero visual: the dusk tower in a 16:9 frame, eager so it never paints as a grey box */}
      <section className="theme-light pb-20 lg:pb-28">
        <div className="wrap">
          <figure>
            <div className="aspect-video w-full overflow-hidden rounded-[12px] bg-paper-2">
              <Photo photo={photos.hero} alt={c.heroAlt} priority />
            </div>
            <DimensionString label={site.city} className="mt-4" />
          </figure>
          <FactRow className="rule-t mt-10 pt-6" items={c.facts} />
        </div>
      </section>

      <Row id="story" title={c.story.title}>
        <div className="max-w-[60ch]">
          {c.story.text.map((p) => (
            <p key={p.slice(0, 24)} className="t-body mt-6 text-muted first:mt-0">
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
      </Row>

      <Row id="teach" title={c.teach.title} lead={c.teach.lead}>
        <ol className="grid gap-x-6 gap-y-10 border-t pt-8 sm:grid-cols-2 lg:grid-cols-4" style={rule}>
          {c.teach.steps.map((s, i) => (
            <Slab as="li" key={s.t} index={i}>
              <p className="mono !text-accent-text">{String(i + 1).padStart(2, "0")}</p>
              <h3 className="mt-4 !text-[1.375rem]">{s.t}</h3>
              <p className="t-small mt-2 text-dim">{s.d}</p>
            </Slab>
          ))}
        </ol>
      </Row>

      {/* From the studio to the classroom: three cards, each split into what the studio does and what you practice */}
      <section className="theme-light section !pt-0" aria-labelledby="studio">
        <div className="wrap">
          <div className="max-w-3xl">
            <h2 id="studio" className="t-h3">
              {c.studio.title}
            </h2>
            <p className="t-small mt-4 max-w-md text-dim">{c.studio.lead}</p>
          </div>
          <ul className="mt-10 grid gap-6 md:grid-cols-3">
            {c.studio.cards.map((k, i) => (
              <Slab as="li" key={k.t} index={i} className="card flex flex-col p-7 md:p-8">
                <p className="mono">{String(i + 1).padStart(2, "0")}</p>
                <h3 className="mt-4 !text-[1.375rem]">{k.t}</h3>
                <dl className="mt-6 flex flex-1 flex-col gap-5 border-t pt-5" style={rule}>
                  <div>
                    <dt className="mono">{c.studio.studioLabel}</dt>
                    <dd className="t-small mt-1.5 text-muted">{k.studio}</dd>
                  </div>
                  <div>
                    <dt className="mono !text-accent-text">{c.studio.classroomLabel}</dt>
                    <dd className="t-small mt-1.5 text-muted">{k.classroom}</dd>
                  </div>
                </dl>
              </Slab>
            ))}
          </ul>
        </div>
      </section>

      <Row id="values" title={c.values.title}>
        <ol className="grid gap-x-6 gap-y-8 border-t pt-8 md:grid-cols-3" style={rule}>
          {c.values.items.map((v, i) => (
            <li key={v.t}>
              <p className="mono !text-accent-text">{String(i + 1).padStart(2, "0")}</p>
              <h3 className="mt-4 !text-[1.25rem]">{v.t}</h3>
              <p className="t-small mt-2 text-dim">{v.d}</p>
            </li>
          ))}
        </ol>
      </Row>

      {/* Location: the hand-drawn DFW map beside the address, plus the two pages that are not in the menu */}
      <section className="theme-light section !pt-0" aria-labelledby="location">
        <div className="wrap">
          <div className="grid-12 items-center gap-y-10 border-t pt-14" style={rule}>
            <Slab className="col-span-12 lg:col-span-6">
              <div className="rounded-[12px] border p-3" style={rule}>
                <Map />
              </div>
            </Slab>
            <Slab className="col-span-12 lg:col-span-5 lg:col-start-8" index={1}>
              <h2 id="location" className="t-h3">
                {c.location.title}
              </h2>
              <p className="mt-6 text-[1.5rem] font-semibold tracking-tight text-text">{c.location.city}</p>
              <p className="mono mt-1">{site.coords}</p>
              <div className="mt-8 border-t pt-6" style={rule}>
                <p className="text-[1.0625rem] font-medium text-text">{c.location.online}</p>
                <p className="t-small mt-2 max-w-sm text-dim">{c.location.onlineText}</p>
              </div>
              <ul className="mt-8 flex flex-col gap-4 border-t pt-6 sm:flex-row sm:gap-8" style={rule}>
                <li>
                  <Button href="/instructors" variant="link">
                    {c.location.instructors}
                  </Button>
                </li>
                <li>
                  <Button href="/student-work" variant="link">
                    {c.location.work}
                  </Button>
                </li>
              </ul>
            </Slab>
          </div>
        </div>
      </section>

      {/* CTA band on paper-2, inside the page like the home offer panel */}
      <section className="theme-light section !pt-0" aria-labelledby="about-cta">
        <div className="wrap">
          <Slab>
            <div className="grid gap-8 rounded-[12px] bg-paper-2 p-8 md:p-12 lg:grid-cols-[1fr_auto] lg:items-center lg:p-16">
              <div>
                <h2 id="about-cta" className="t-h2 max-w-[18ch]">
                  {c.cta.title}
                </h2>
                <p className="t-lead mt-4">{c.cta.text}</p>
              </div>
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                <Button href="/apply">{c.primary}</Button>
                <Button href="/programs" variant="link">
                  {c.secondary}
                </Button>
              </div>
            </div>
          </Slab>
        </div>
      </section>
    </>
  );
}
