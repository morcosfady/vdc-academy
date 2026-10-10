import type { Metadata } from "next";
import { PageHero } from "@/components/ui/PageHero";
import { Button } from "@/components/ui/Button";
import { LeadForm } from "@/components/forms/LeadForm";
import { approvedQuotes } from "@/content/site";

export const metadata: Metadata = { title: "For Companies", description: "Team BIM and VDC training from Bay BIM Designs." };

const offers = [
  { t: "Train your team", d: "Revit, Navisworks and coordination skills for your designers, modelers and project engineers." },
  { t: "Build your standards", d: "Custom families, templates and workflows set up for how your firm works." },
  { t: "Bring BIM into daily work", d: "Coordination routines, clash detection and model checks your team can run on its own." },
];

export default function CompaniesPage() {
  const quotes = approvedQuotes();
  return (
    <>
      <PageHero eyebrow="For companies" title={["Train your team", "on real BIM."]} subtitle="Group training from the team behind Bay BIM Designs. Groups of 3 or more save 15%." />
      <section className="mx-auto max-w-[1280px] px-5 pb-24 md:px-10">
        <ul className="grid gap-px border border-border bg-border md:grid-cols-3">
          {offers.map((o, i) => (
            <li key={o.t} className="bg-bg p-8">
              <p className="label !text-accent-text">{String(i + 1).padStart(2, "0")}</p>
              <p className="display-md mt-4 !text-2xl">{o.t}</p>
              <p className="mt-3 text-muted">{o.d}</p>
            </li>
          ))}
        </ul>
      </section>

      {quotes.length > 0 && (
        <section className="mx-auto max-w-4xl px-5 pb-24 md:px-10">
          {quotes.map((q) => (
            <figure key={q.who}>
              <blockquote className="display-md !text-[clamp(1.2rem,2.2vw,1.8rem)] !leading-snug">&ldquo;{q.quote}&rdquo;</blockquote>
              <figcaption className="meta mt-5">{q.who} · From Bay BIM Designs clients</figcaption>
            </figure>
          ))}
        </section>
      )}

      <section className="mx-auto max-w-[1280px] px-5 pb-32 md:px-10">
        <div className="glass p-7 md:p-10">
          <h2 className="display-md !text-2xl">Tell us about your team.</h2>
          <p className="mb-6 mt-3 max-w-xl text-muted">Leave your details and we will propose a plan.</p>
          <LeadForm topic="Team training" button="Contact me" />
        </div>
        <div className="mt-8"><Button href="/contact" variant="link">Prefer to write a message? <span aria-hidden>→</span></Button></div>
      </section>
    </>
  );
}
