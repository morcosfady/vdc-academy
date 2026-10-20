import type { Metadata } from "next";
import { PageHero } from "@/components/ui/PageHero";
import { Catalog } from "@/components/programs/Catalog";
import { pages } from "@/content/copy-pages";
import { programs } from "@/content/programs";
import { pageMeta } from "@/components/seo/meta";
import { JsonLd, breadcrumbLd, courseListLd } from "@/components/seo/JsonLd";

export const metadata: Metadata = pageMeta({ title: "BIM Courses: Revit, Navisworks and VDC", description: "Eleven BIM and VDC programs: Revit, Navisworks clash detection, 4D/5D simulation, Dynamo and BIM management, from beginner to advanced.", path: "/programs/", og: "programs" });

const c = pages.programs;

export default function ProgramsPage() {
  return (
    <>
      <JsonLd data={breadcrumbLd([{ name: "Programs", path: "/programs/" }])} />
      <JsonLd data={courseListLd(programs)} />
      <PageHero sheet={c.sheet} eyebrow={c.name} title={[c.title]} subtitle={c.lead} />
      <section className="theme-light section !pt-12 lg:!pt-16">
        <div className="wrap">
          <Catalog />
        </div>
      </section>
    </>
  );
}
