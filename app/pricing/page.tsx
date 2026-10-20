import type { Metadata } from "next";
import { PageHero } from "@/components/ui/PageHero";
import { Slab } from "@/components/ui/Slab";
import { PricingPlans } from "@/components/programs/PricingPlans";
import { DiscountCalculator } from "@/components/programs/DiscountCalculator";
import { PriceListForm } from "@/components/forms/PriceListForm";
import { Faq } from "@/components/ds/Faq";
import { DiscountTable, discountRows } from "@/components/programs/DiscountTable";
import { earlyBirdStacksWithFreshGrad } from "@/config/discounts";
import { plans, pricesKnown } from "@/content/plans";
import { pages } from "@/content/copy-pages";
import { pageMeta } from "@/components/seo/meta";
import { JsonLd, breadcrumbLd } from "@/components/seo/JsonLd";

export const metadata: Metadata = pageMeta({ title: "Pricing and Discounts for BIM Courses", description: "VDC Academy plans and discounts for BIM and VDC training: up to 40% off for fresh graduates, 25% for students and 15% for company groups.", path: "/pricing/", og: "pricing" });

const c = pages.pricing;
const u = c.unknown;
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

// Prices confirmed: the v5 design with the toggle, the calculator and the odometer.
function KnownPrices() {
  const rows = discountRows(c.discounts.auto);
  return (
    <>
      <PageHero sheet={c.sheet} eyebrow={c.name} title={[c.title]} subtitle={c.lead} />
      <section className="theme-light section !pt-12 lg:!pt-16">
        <div className="wrap">
          <PricingPlans />
        </div>
      </section>
      <Row id="discounts" title={c.discounts.title} lead={c.discounts.note(earlyBirdStacksWithFreshGrad)}>
        <DiscountTable rows={rows} cols={{ label: c.discounts.cols[0], who: c.discounts.cols[1], proof: c.discounts.cols[3], off: c.discounts.cols[2] }} title={c.discounts.title} />
      </Row>
      <Row id="calc" title={c.calculator.title} lead={c.calculator.lead}>
        <DiscountCalculator />
      </Row>
      <Row id="pay" title={c.faq.title}>
        <Faq items={c.faq.items} />
      </Row>
    </>
  );
}

// No prices yet: how pricing works, the price list request as the main action, the discount schedule, the payment FAQ.
function UnknownPrices() {
  const rows = discountRows(c.discounts.auto);
  return (
    <>
      <PageHero sheet={c.sheet} eyebrow={c.name} title={[u.title]} subtitle={u.lead} />

      <Row id="how" title={u.how.title} lead={u.how.lead} className="!pt-12 lg:!pt-16">
        <ol className="grid gap-6 md:grid-cols-3">
          {plans.map((p, i) => (
            <Slab as="li" key={p.id} index={i} className="card flex flex-col p-7 md:p-8">
              <div className="flex items-center justify-between gap-4">
                <p className="mono !text-text">{String(i + 1).padStart(2, "0")}</p>
                <p className="mono">{p.note}</p>
              </div>
              <h3 className="mt-5 !text-[1.5rem]">{p.name}</h3>
              <p className="t-small mt-2 text-dim">{u.how.bestFor[i]}</p>
              <ul className="mt-6 flex-1 space-y-3 border-t pt-6 text-[15px] text-muted" style={rule}>
                {p.feats.map((f) => (
                  <li key={f} className="flex gap-3">
                    <span aria-hidden className="mt-3 h-px w-4 shrink-0 bg-current opacity-50" />
                    {f}
                  </li>
                ))}
              </ul>
            </Slab>
          ))}
        </ol>
        <div className="mt-6 flex flex-col gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between" style={rule}>
          <p className="text-[15px] font-medium text-text">{u.how.note}</p>
          <a href="#request" className="ul-draw pb-0.5 text-[15px] font-medium text-text hover:text-accent-text">
            {u.how.request}
          </a>
        </div>
      </Row>

      {/* The main action: a paper-2 panel with the request form */}
      <section id="request" className="theme-light section !pt-0" aria-labelledby="request-title">
        <div className="wrap">
          <Slab>
            <div className="grid gap-10 rounded-[12px] bg-paper-2 p-7 md:p-12 lg:grid-cols-12 lg:gap-6 lg:p-16">
              <div className="lg:col-span-5">
                <h2 id="request-title" className="t-h2 max-w-[14ch]">
                  {u.request.title}
                </h2>
                <p className="t-body mt-5 text-muted">{u.request.lead}</p>
              </div>
              <div className="lg:col-span-6 lg:col-start-7">
                <PriceListForm />
              </div>
            </div>
          </Slab>
        </div>
      </section>

      <Row id="discounts" title={c.discounts.title} lead={c.discounts.note(earlyBirdStacksWithFreshGrad)}>
        <DiscountTable rows={rows} sheet={u.schedule} cols={{ label: c.discounts.cols[0], who: c.discounts.cols[1], proof: c.discounts.cols[3], off: c.discounts.cols[2] }} title={c.discounts.title} />
      </Row>

      <Row id="pay" title={c.faq.title}>
        <Faq items={c.faq.items} />
      </Row>
    </>
  );
}

export default function PricingPage() {
  return (
    <>
      <JsonLd data={breadcrumbLd([{ name: "Pricing", path: "/pricing/" }])} />
      {pricesKnown() ? <KnownPrices /> : <UnknownPrices />}
    </>
  );
}
