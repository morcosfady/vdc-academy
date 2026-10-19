import type { Metadata } from "next";
import { Button } from "@/components/ui/Button";
import { Photo } from "@/components/ui/Photo";
import { Slab } from "@/components/ui/Slab";
import { CompanyForm } from "@/components/forms/CompanyForm";
import { DimensionString, SheetTag } from "@/components/ds/Devices";
import { Tag } from "@/components/ds/Chips";
import { TestimonialCard } from "@/components/ds/Cards";
import { Steps } from "@/components/ds/Timeline";
import { approvedQuotes } from "@/content/site";
import { media } from "@/content/media";
import { pages } from "@/content/copy-pages";
import { discounts } from "@/config/discounts";

export const metadata: Metadata = { title: "For Companies", description: "Team BIM and VDC training from Bay BIM Designs." };

const c = pages.companies;
const rule = { borderColor: "var(--rule)" } as const;

// Line drawings for the coverage grid: 28px, currentColor, 1.25px strokes, drawn here so they match the sheet.
const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 1.25, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
const icons: React.ReactNode[] = [
  // template: a sheet with a title block
  <svg key="t" width="28" height="28" viewBox="0 0 28 28" aria-hidden {...stroke}>
    <rect x="3.5" y="3.5" width="21" height="21" />
    <path d="M3.5 19.5h21M16 19.5v5M8 9h8M8 13h5" />
  </svg>,
  // family: a parametric box with a dimension
  <svg key="f" width="28" height="28" viewBox="0 0 28 28" aria-hidden {...stroke}>
    <path d="M6 10l8-4 8 4v9l-8 4-8-4z M6 10l8 4 8-4M14 14v9" />
    <path d="M3 22v-12M3 10h2M3 22h2" opacity="0.6" />
  </svg>,
  // coordination routine: three overlapping circles
  <svg key="c" width="28" height="28" viewBox="0 0 28 28" aria-hidden {...stroke}>
    <circle cx="11" cy="11" r="6" />
    <circle cx="17" cy="11" r="6" />
    <circle cx="14" cy="17" r="6" />
  </svg>,
  // clash: a duct crossing a beam, a small ring at the crossing
  <svg key="x" width="28" height="28" viewBox="0 0 28 28" aria-hidden {...stroke}>
    <path d="M3 10h22M3 14h22" />
    <path d="M12 3v22M16 3v22" />
    <circle cx="14" cy="12" r="4.5" />
  </svg>,
  // QA/QC: a sheet with a tick
  <svg key="q" width="28" height="28" viewBox="0 0 28 28" aria-hidden {...stroke}>
    <path d="M7 3.5h10l5 5v16H7z M17 3.5v5h5" />
    <path d="M10 16l3 3 5-6" />
  </svg>,
  // execution plan: a timeline with milestones
  <svg key="p" width="28" height="28" viewBox="0 0 28 28" aria-hidden {...stroke}>
    <path d="M3 14h22" />
    <circle cx="7" cy="14" r="2.5" />
    <circle cx="14" cy="14" r="2.5" />
    <circle cx="21" cy="14" r="2.5" />
    <path d="M7 8v3.5M14 20v-3.5M21 8v3.5" />
  </svg>,
  // low voltage: a device on a cable tray
  <svg key="l" width="28" height="28" viewBox="0 0 28 28" aria-hidden {...stroke}>
    <path d="M3 20h22M3 24h22M7 20v4M14 20v4M21 20v4" />
    <rect x="10" y="6" width="8" height="8" />
    <path d="M14 14v6" />
  </svg>,
];

export default function CompaniesPage() {
  const quotes = approvedQuotes();
  return (
    <>
      {/* Hero: headline in columns 1 to 6, the team photo in a 16:10 frame in 7 to 12 (the LCP image, eager) */}
      <section className="theme-light pt-[72px]" aria-labelledby="companies-title">
        <div className="wrap">
          <div className="grid-12 items-center gap-y-10 pb-16 pt-14 lg:pb-24 lg:pt-24">
            <div className="col-span-12 lg:col-span-6">
              <SheetTag sheet={c.sheet} name={c.name} />
              <h1 id="companies-title" className="t-h1 mt-8 max-w-[14ch]">
                {c.title}
              </h1>
              <p className="t-lead mt-6 max-w-[32rem]">{c.lead(discounts.group.percent)}</p>
              <div className="mt-9 flex flex-col gap-5 sm:flex-row sm:items-center">
                <Button href="#team-form">{c.primary}</Button>
                <Button href="/contact" variant="link">
                  {c.secondary}
                </Button>
              </div>
            </div>
            <figure className="col-span-12 lg:col-span-6">
              <div className="aspect-[16/10] w-full overflow-hidden rounded-[12px] bg-paper-2">
                <Photo photo={media.team.photo} alt={c.photoAlt} priority />
              </div>
              <DimensionString label={c.formats.items[0].t} className="mt-4" />
            </figure>
          </div>
        </div>
      </section>

      {/* What we do for teams: three hairline rows */}
      <section className="theme-light section rule-t !pt-14 lg:!pt-20" aria-label="What team training covers">
        <div className="wrap">
          <ul className="grid gap-x-6 sm:grid-cols-3">
            {c.offers.map((o, i) => (
              <Slab as="li" key={o.t} index={i} className="border-t border-rule py-8 pe-8">
                <p className="mono !text-accent-text">{String(i + 1).padStart(2, "0")}</p>
                <h2 className="mt-4 !text-[1.25rem]">{o.t}</h2>
                <p className="t-small mt-2 text-dim">{o.d}</p>
              </Slab>
            ))}
          </ul>
        </div>
      </section>

      {/* How team training works: four steps on a drawn line */}
      <section className="theme-light section !pt-0" aria-labelledby="process">
        <div className="wrap">
          <div className="max-w-3xl">
            <h2 id="process" className="t-h3">
              {c.process.title}
            </h2>
            <p className="t-small mt-4 max-w-md text-dim">{c.process.lead}</p>
          </div>
          <Steps items={c.process.steps} className="mt-12 lg:mt-16" />
        </div>
      </section>

      {/* What we can cover: a coverage grid, low voltage flagged as the studio's specialty */}
      <section className="theme-light section !pt-0" aria-labelledby="cover">
        <div className="wrap">
          <div className="grid-12 gap-y-10">
            <div className="col-span-12 lg:col-span-4">
              <h2 id="cover" className="t-h3">
                {c.cover.title}
              </h2>
              <p className="t-small mt-4 max-w-sm text-dim">{c.cover.lead}</p>
            </div>
            <ul className="col-span-12 grid sm:grid-cols-2 sm:gap-x-6 lg:col-span-8">
              {c.cover.items.map((it, i) => (
                <Slab as="li" key={it.t} index={i % 2} className="border-t border-rule py-7 pe-6">
                  <div className="flex items-start justify-between gap-4">
                    <span className="text-accent-text">{icons[i]}</span>
                    {it.specialty && <Tag tone="brass">{c.cover.specialty}</Tag>}
                  </div>
                  <h3 className="mt-5 !text-[1.125rem] !font-semibold !tracking-normal">{it.t}</h3>
                  <p className="t-small mt-2 text-dim">{it.d}</p>
                </Slab>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Formats and team size */}
      <section className="theme-light section !pt-0" aria-labelledby="formats">
        <div className="wrap">
          <div className="grid-12 gap-y-10">
            <div className="col-span-12 lg:col-span-4">
              <h2 id="formats" className="t-h3">
                {c.formats.title}
              </h2>
            </div>
            <div className="col-span-12 lg:col-span-8">
              <ol className="grid gap-x-6 gap-y-8 border-t pt-8 sm:grid-cols-3" style={rule}>
                {c.formats.items.map((f, i) => (
                  <li key={f.t}>
                    <p className="mono !text-accent-text">{String(i + 1).padStart(2, "0")}</p>
                    <h3 className="mt-4 !text-[1.25rem]">{f.t}</h3>
                    <p className="t-small mt-2 text-dim">{f.d}</p>
                  </li>
                ))}
              </ol>
              <p className="mt-8 flex items-center gap-4 border-t pt-5 text-[15px] font-medium text-text" style={rule}>
                <span aria-hidden className="h-px w-8 shrink-0 bg-brass" />
                {c.formats.size(discounts.group.percent)}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Proof, only once the owner approves the client quote */}
      {quotes.length > 0 && (
        <section className="theme-light section !pt-0" aria-label={c.quoteSource}>
          <div className="wrap grid gap-6 md:grid-cols-2">
            {quotes.map((q) => (
              <TestimonialCard key={q.who} quote={q.quote} who={`${q.who} · ${c.quoteSource}`} />
            ))}
          </div>
        </section>
      )}

      {/* The request form beside what happens next */}
      <section id="team-form" className="theme-light section !pt-0" aria-labelledby="form-title">
        <div className="wrap">
          <div className="grid-12 items-start gap-y-12">
            <div className="col-span-12 lg:col-span-7">
              <div className="card p-7 md:p-10">
                <h2 id="form-title" className="t-h3">
                  {c.form.title}
                </h2>
                <p className="t-small mt-3 text-dim">{c.form.text}</p>
                <div className="mt-8">
                  <CompanyForm />
                </div>
              </div>
            </div>
            <aside className="col-span-12 lg:col-span-4 lg:col-start-9" aria-labelledby="next-title">
              <p id="next-title" className="mono">
                {c.form.next.title}
              </p>
              <ol className="mt-5 border-t" style={rule}>
                {c.form.next.steps.map((s, i) => (
                  <li key={s} className="grid grid-cols-[2.5rem_1fr] gap-x-2 border-b py-4 text-[15px] text-muted" style={rule}>
                    <span className="mono pt-0.5">{String(i + 1).padStart(2, "0")}</span>
                    {s}
                  </li>
                ))}
              </ol>
              <div className="mt-6">
                <Button href="/contact" variant="link">
                  {c.contact}
                </Button>
              </div>
            </aside>
          </div>
        </div>
      </section>
    </>
  );
}
