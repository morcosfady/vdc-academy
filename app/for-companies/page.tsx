import type { Metadata } from "next";
import { FolderOpen, Users, Workflow } from "lucide-react";
import { PageHero } from "@/components/ui/PageHero";
import { Button } from "@/components/ui/Button";
import { Photo } from "@/components/ui/Photo";
import { LeadForm } from "@/components/forms/LeadForm";
import { FeatureItem } from "@/components/ds/Sections";
import { TestimonialCard } from "@/components/ds/Cards";
import { approvedQuotes } from "@/content/site";
import { media } from "@/content/media";
import { pages } from "@/content/copy-pages";
import { discounts } from "@/config/discounts";

export const metadata: Metadata = { title: "For Companies", description: "Team BIM and VDC training from Bay BIM Designs." };

const c = pages.companies;
const icons = [Users, FolderOpen, Workflow];

export default function CompaniesPage() {
  const quotes = approvedQuotes();
  return (
    <>
      <PageHero sheet={c.sheet} eyebrow={c.name} title={[c.title]} subtitle={c.lead(discounts.group.percent)} />

      <section className="theme-light section !pt-12 lg:!pt-16">
        <div className="wrap">
          <ul className="grid sm:grid-cols-3 sm:gap-x-6">
            {c.offers.map((o, i) => {
              const Icon = icons[i];
              return (
                <li key={o.t}>
                  <FeatureItem icon={<Icon size={26} strokeWidth={1.5} aria-hidden />} title={o.t} text={o.d} />
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <section className="theme-light section !pt-0">
        <div className="wrap">
          <div className="grid-12 items-center gap-y-12">
            <figure className="col-span-12 lg:col-span-6">
              <div className="aspect-[4/3] w-full overflow-hidden rounded-[12px] bg-paper-2">
                <Photo photo={media.team.photo} alt={media.team.alt} className="parallax-y" />
              </div>
            </figure>
            <div className="col-span-12 lg:col-span-5 lg:col-start-8">
              <div className="card p-7 md:p-9">
                <h2 className="t-h3">{c.form.title}</h2>
                <p className="t-small mt-3 text-dim">{c.form.text}</p>
                <div className="mt-8">
                  <LeadForm topic={c.form.topic} button={c.form.button} />
                </div>
              </div>
              <div className="mt-6">
                <Button href="/contact" variant="link">
                  {c.contact}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {quotes.length > 0 && (
        <section className="theme-light section !pt-0">
          <div className="wrap grid gap-6 md:grid-cols-2">
            {quotes.map((q) => (
              <TestimonialCard key={q.who} quote={q.quote} who={`${q.who} · ${c.quoteSource}`} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
