import type { Metadata } from "next";
import { media } from "@/content/media";
import { pages } from "@/content/copy-pages";
import { discounts, freshGradMonths } from "@/config/discounts";
import { Photo } from "@/components/ui/Photo";
import { Button } from "@/components/ui/Button";
import { CountUp } from "@/components/ui/CountUp";
import { Slab } from "@/components/ui/Slab";
import { SheetTag } from "@/components/ds/Devices";
import { Faq } from "@/components/ds/Faq";
import { QualifyQuiz } from "@/components/home/Grads";
import { DiscountTable, discountRows } from "@/components/programs/DiscountTable";

export const metadata: Metadata = {
  title: "Fresh Graduates",
  description: "Graduated in the last 24 months? Save up to 40% on VDC Academy BIM and VDC programs.",
};

const c = pages.grads;

// Section layout shared down the page: title in columns 1 to 4, content in 5 to 12.
function Row({ id, title, lead, first, children }: { id: string; title: string; lead?: string; first?: boolean; children: React.ReactNode }) {
  return (
    <section className={`theme-light section ${first ? "rule-t" : "!pt-0"}`} aria-labelledby={id}>
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

export default function FreshGradsPage() {
  const pct = discounts.freshGrad.percent;
  const rows = discountRows(c.eligibility.auto);
  return (
    <>
      {/* The offer. The 40 is real text in the HTML; the count-up only decorates it. */}
      <section id="ch-5" aria-labelledby="grads-title" className="theme-light pt-[72px]">
        <div className="wrap">
          <div className="grid-12 items-center gap-y-12 pb-16 pt-14 lg:pb-24 lg:pt-24">
            <div className="col-span-12 lg:col-span-6">
              <SheetTag sheet={c.sheet} name={c.name} />
              <Slab>
                <p className="mt-8 flex items-baseline text-[clamp(5rem,3rem+9vw,10rem)] font-semibold leading-none tracking-[-0.04em] text-ink">
                  <CountUp to={pct} />
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
                <Photo photo={media.grad.photo} alt={media.grad.alt} className="parallax-y" />
              </div>
            </figure>
          </div>
        </div>
      </section>

      <Row id="who" title={c.eligibility.title} lead={c.eligibility.lead} first>
        <DiscountTable rows={rows} cols={{ label: "Discount", who: c.eligibility.cols[0], proof: c.eligibility.cols[1], off: c.eligibility.cols[2] }} title={c.eligibility.title} />
      </Row>

      <Row id="how" title={c.how.title}>
        <ol className="grid gap-x-6 gap-y-8 border-t pt-8 sm:grid-cols-3" style={{ borderColor: "var(--rule)" }}>
          {c.how.steps.map((s, i) => (
            <li key={s.t}>
              <p className="mono !text-accent-text">{String(i + 1).padStart(2, "0")}</p>
              <h3 className="mt-4 !text-[1.25rem]">{s.t}</h3>
              <p className="t-small mt-2 text-dim">{s.d}</p>
            </li>
          ))}
        </ol>
      </Row>

      <Row id="faq" title={c.faq.title}>
        <Faq items={c.faq.items(freshGradMonths)} />
      </Row>
    </>
  );
}
