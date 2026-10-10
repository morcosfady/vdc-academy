import type { Metadata } from "next";
import { PageHero } from "@/components/ui/PageHero";
import { Button } from "@/components/ui/Button";
import { Slab } from "@/components/ui/Slab";
import { site } from "@/config/site";

export const metadata: Metadata = { title: "About", description: "VDC Academy is the training academy of Bay BIM Designs in Fort Worth, TX." };

const values = [
  { t: "Hands-on", d: "You learn by modeling, coordinating and fixing real problems, not by watching slides." },
  { t: "Real files", d: "Practice projects are modeled after the work AE firms, contractors and technology teams do every day." },
  { t: "Honest", d: "Clear programs, clear prices, clear discounts. No inflated promises." },
];

export default function AboutPage() {
  return (
    <>
      <PageHero eyebrow="About" title={["Training from", "people who build", "models for a living."]} />
      <section className="mx-auto grid max-w-[1280px] gap-16 px-5 pb-24 md:px-10 lg:grid-cols-2">
        <Slab>
          <p className="text-xl leading-relaxed">
            VDC Academy is the training academy of {site.parent}, a BIM and VDC company in {site.city}. {site.parent} provides BIM modeling, coordination, clash detection and construction simulation to design and construction teams.
          </p>
        </Slab>
        <Slab index={1}>
          <p className="text-muted">
            We started the academy to train the next group of BIM modelers, coordinators and VDC engineers with the same methods we use on projects. Fresh graduates get our biggest discount because the first step into the industry should be the easiest one to take.
          </p>
          <p className="mt-6"><a href={site.parentUrl} className="text-accent-text underline underline-offset-8">Visit {site.parent} <span aria-hidden>→</span></a></p>
        </Slab>
      </section>

      <section className="mx-auto max-w-[1280px] px-5 pb-32 md:px-10">
        <h2 className="label mb-6">What we stand for</h2>
        <ul className="grid gap-px border border-border bg-border md:grid-cols-3">
          {values.map((v, i) => (
            <li key={v.t} className="bg-bg p-8">
              <p className="label !text-accent-text">{String(i + 1).padStart(2, "0")}</p>
              <p className="display-md mt-4 !text-2xl">{v.t}</p>
              <p className="mt-3 text-muted">{v.d}</p>
            </li>
          ))}
        </ul>
        <div className="mt-12 flex flex-wrap gap-x-8 gap-y-4">
          <Button href="/apply" variant="glow">Apply now</Button>
          <Button href="/programs" variant="link">See programs <span aria-hidden>→</span></Button>
        </div>
      </section>
    </>
  );
}
