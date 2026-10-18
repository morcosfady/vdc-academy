import type { Metadata } from "next";
import { PageHero } from "@/components/ui/PageHero";
import { Catalog } from "@/components/programs/Catalog";
import { pages } from "@/content/copy-pages";

export const metadata: Metadata = {
  title: "Programs",
  description: "BIM and VDC programs: Revit, Navisworks, clash detection, 4D/5D simulation, Dynamo and BIM management.",
};

const c = pages.programs;

export default function ProgramsPage() {
  return (
    <>
      <PageHero sheet={c.sheet} eyebrow={c.name} title={[c.title]} subtitle={c.lead} />
      <section className="theme-light section !pt-12 lg:!pt-16">
        <div className="wrap">
          <Catalog />
        </div>
      </section>
    </>
  );
}
