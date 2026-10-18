import type { Metadata } from "next";
import { media } from "@/content/media";
import { pages } from "@/content/copy-pages";
import { discounts, earlyBird, freshGradMonths } from "@/config/discounts";
import { Photo } from "@/components/ui/Photo";
import { Button } from "@/components/ui/Button";
import { CountUp } from "@/components/ui/CountUp";
import { Slab } from "@/components/ui/Slab";
import { SheetTag } from "@/components/ds/Devices";
import { SectionHeader } from "@/components/ds/Sections";
import { Faq } from "@/components/ds/Faq";
import { QualifyQuiz } from "@/components/home/Grads";

export const metadata: Metadata = {
  title: "Fresh Graduates",
  description: "Graduated in the last 24 months? Save up to 40% on VDC Academy BIM and VDC programs.",
};

const c = pages.grads;
const rule = { borderColor: "var(--rule)" } as const;

export default function FreshGradsPage() {
  const pct = discounts.freshGrad.percent;
  const rows = [
    ...Object.values(discounts).map((d) => ({ key: d.id, label: d.label, who: d.who, proof: d.proof, percent: d.percent })),
    { key: "early", label: earlyBird.label, who: earlyBird.who, proof: c.eligibility.auto, percent: earlyBird.percent },
  ];
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

      <section className="theme-light section rule-t" aria-labelledby="who">
        <div className="wrap">
          <div className="grid-12 gap-y-10">
            <div className="col-span-12 lg:col-span-4">
              <h2 id="who" className="t-h3">
                {c.eligibility.title}
              </h2>
              <p className="t-small mt-4 max-w-sm text-dim">{c.eligibility.lead}</p>
            </div>
            <div className="col-span-12 overflow-x-auto lg:col-span-8">
              <table className="w-full min-w-[520px] border-collapse text-[15px]">
                <caption className="sr-only">{c.eligibility.title}</caption>
                <thead>
                  <tr>
                    <th scope="col" className="mono border-b pb-3 pe-4 text-start font-normal" style={rule}>
                      Discount
                    </th>
                    {c.eligibility.cols.map((h) => (
                      <th key={h} scope="col" className="mono border-b pb-3 pe-4 text-start font-normal" style={rule}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((d) => (
                    <tr key={d.key}>
                      <th scope="row" className="border-b py-4 pe-4 text-start font-medium text-text" style={rule}>
                        {d.label}
                      </th>
                      <td className="border-b py-4 pe-4 text-muted" style={rule}>
                        {d.who}
                      </td>
                      <td className="border-b py-4 pe-4 text-muted" style={rule}>
                        {d.proof}
                      </td>
                      <td className={`border-b py-4 font-semibold tabular-nums ${d.key === "freshGrad" ? "text-warm" : "text-text"}`} style={rule}>
                        {d.percent}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      <section className="theme-light section !pt-0" aria-labelledby="how">
        <div className="wrap">
          <SectionHeader title={<span id="how">{c.how.title}</span>} />
          <ol className="mt-10 grid gap-x-6 gap-y-8 border-t pt-8 md:grid-cols-3" style={rule}>
            {c.how.steps.map((s, i) => (
              <li key={s.t}>
                <p className="mono !text-accent-text">{String(i + 1).padStart(2, "0")}</p>
                <h3 className="mt-4 !text-[1.25rem]">{s.t}</h3>
                <p className="t-small mt-2 text-dim">{s.d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="theme-light section !pt-0" aria-labelledby="faq">
        <div className="wrap">
          <div className="grid-12 gap-y-10">
            <div className="col-span-12 lg:col-span-4">
              <h2 id="faq" className="t-h3">
                {c.faq.title}
              </h2>
            </div>
            <div className="col-span-12 lg:col-span-8">
              <Faq items={c.faq.items(freshGradMonths)} />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
