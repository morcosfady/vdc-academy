import type { Metadata } from "next";
import { photos } from "@/assets/images";
import { media } from "@/content/media";
import { pages } from "@/content/copy-pages";
import { discounts, freshGradMonths } from "@/config/discounts";
import { Photo } from "@/components/ui/Photo";
import { Button } from "@/components/ui/Button";
import { Slab } from "@/components/ui/Slab";
import { GridBubble, SheetTag } from "@/components/ds/Devices";
import { Tag } from "@/components/ds/Chips";
import { Faq } from "@/components/ds/Faq";
import { Timeline } from "@/components/ds/Timeline";
import { QualifyQuiz } from "@/components/home/Grads";
import { DiscountTable, discountRows } from "@/components/programs/DiscountTable";
import { pageMeta } from "@/components/seo/meta";
import { JsonLd, breadcrumbLd } from "@/components/seo/JsonLd";

export const metadata: Metadata = pageMeta({ title: "BIM Course for Fresh Graduates: Up to 40% Off", description: "Graduated in the last 24 months? Save up to 40% on BIM and VDC training at VDC Academy: Revit, Navisworks, clash detection and more.", path: "/fresh-graduates/", og: "fresh-graduates" });

const c = pages.grads;
const rule = { borderColor: "var(--rule)" } as const;

// Section layout shared down the page: title in columns 1 to 4, content in 5 to 12.
function Row({ id, title, lead, first, tag, children }: { id: string; title: string; lead?: string; first?: boolean; tag?: string; children: React.ReactNode }) {
  return (
    <section className={`theme-light section ${first ? "rule-t" : "!pt-0"}`} aria-labelledby={id}>
      <div className="wrap">
        <div className="grid-12 gap-y-10">
          <div className="col-span-12 lg:col-span-4">
            {tag && <Tag className="mb-4">{tag}</Tag>}
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

export default function FreshGradsPage() {
  const pct = discounts.freshGrad.percent;
  const rows = discountRows(c.eligibility.auto);
  return (
    <>
      <JsonLd data={breadcrumbLd([{ name: "Fresh graduates", path: "/fresh-graduates/" }])} />
      {/* The offer. The 40% is static text: a discount must never be seen lower than it is, so only the brass underline animates. The photo is the LCP image. */}
      <section id="ch-5" aria-labelledby="grads-title" className="theme-light pt-[72px]">
        <div className="wrap">
          <div className="grid-12 items-center gap-y-12 pb-16 pt-14 lg:pb-24 lg:pt-24">
            <div className="col-span-12 lg:col-span-6">
              <SheetTag sheet={c.sheet} name={c.name} />
              <Slab>
                <p className="mt-8 flex items-baseline py-1 pe-2 text-[clamp(4.5rem,2.5rem+9vw,10rem)] font-semibold leading-none tracking-[-0.04em] text-ink">
                  <span data-discount>{pct}</span>
                  <span>%</span>
                </p>
                <span aria-hidden className="draw-x mt-3 block h-[3px] w-28 bg-brass" />
              </Slab>
              <p className="mono mt-4">{c.off}</p>
              <h1 id="grads-title" className="t-h2 mt-8 max-w-[16ch]">
                {c.title}
              </h1>
              <p className="t-lead mt-6 max-w-[32rem]">{c.lead(pct, freshGradMonths)}</p>
              <div className="mt-9 flex flex-col gap-5 sm:flex-row sm:items-center">
                <QualifyQuiz />
                <Button href="/apply?status=freshGrad" variant="link">
                  {c.secondary}
                </Button>
              </div>
            </div>
            <figure className="col-span-12 lg:col-span-5 lg:col-start-8">
              <div className="aspect-[4/5] max-h-[70svh] w-full overflow-hidden rounded-[12px] bg-paper-2 lg:max-h-none">
                <Photo photo={media.grad.photo} alt={media.grad.alt} priority />
              </div>
            </figure>
          </div>
        </div>
      </section>

      {/* Why start in BIM: three plain statements, numbered like notes on a sheet */}
      <section className="theme-light section rule-t" aria-labelledby="why-bim">
        <div className="wrap">
          <div className="grid-12 gap-y-10">
            <div className="col-span-12 lg:col-span-4">
              <h2 id="why-bim" className="t-h3">
                {c.why.title}
              </h2>
            </div>
            <ol className="col-span-12 lg:col-span-8">
              {c.why.points.map((p, i) => (
                <Slab as="li" key={p} index={i} className="grid grid-cols-[2.5rem_1fr] gap-x-4 border-t border-rule py-7 first:border-t-0 first:pt-0">
                  <span className="mono pt-2 !text-accent-text">{String(i + 1).padStart(2, "0")}</span>
                  <p className="t-h4 max-w-[26ch] !font-medium">{p}</p>
                </Slab>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <Row id="who" title={c.eligibility.title} lead={c.eligibility.lead}>
        <DiscountTable rows={rows} cols={{ label: "Discount", who: c.eligibility.cols[0], proof: c.eligibility.cols[1], off: c.eligibility.cols[2] }} title={c.eligibility.title} />
      </Row>

      <Row id="how" title={c.how.title}>
        <ol className="grid gap-x-6 gap-y-8 border-t pt-8 sm:grid-cols-3" style={rule}>
          {c.how.steps.map((s, i) => (
            <li key={s.t}>
              <p className="mono !text-accent-text">{String(i + 1).padStart(2, "0")}</p>
              <h3 className="mt-4 !text-[1.25rem]">{s.t}</h3>
              <p className="t-small mt-2 text-dim">{s.d}</p>
            </li>
          ))}
        </ol>
      </Row>

      {/* Your first 90 days: a vertical timeline beside the study model on the table */}
      <Row id="first90" title={c.first90.title} lead={c.first90.lead} tag={c.first90.tag}>
        <div className="grid gap-10 md:grid-cols-[1fr_minmax(0,300px)] md:gap-14">
          <Timeline items={c.first90.steps} />
          <Slab className="md:self-start md:sticky md:top-24">
            <figure className="relative overflow-hidden rounded-[12px] bg-paper-2 p-6 pb-5">
              <div className="absolute left-5 top-5 flex gap-2 text-slate" aria-hidden>
                {["A", "B", "C"].map((l) => (
                  <GridBubble key={l} label={l} size={24} />
                ))}
              </div>
              <Photo photo={photos.modelPaper} alt="White study model of the stepped office building" className="mx-auto mt-6 max-h-[320px] w-auto object-contain" />
              <figcaption className="mono mt-4 border-t pt-3" style={rule}>
                {c.first90.modelCaption}
              </figcaption>
            </figure>
          </Slab>
        </div>
      </Row>

      <Row id="faq" title={c.faq.title}>
        <Faq items={c.faq.items(freshGradMonths)} />
      </Row>
    </>
  );
}
