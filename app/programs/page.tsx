import type { Metadata } from "next";
import { PageHero } from "@/components/ui/PageHero";
import { Finder } from "@/components/programs/Finder";

export const metadata: Metadata = {
  title: "Programs",
  description: "BIM and VDC programs: Revit, Navisworks, clash detection, 4D/5D simulation, Dynamo and BIM management.",
};

export default function ProgramsPage() {
  return (
    <>
      <PageHero eyebrow="Programs" title={["Find your floor."]} subtitle="Browse by level of the career path, or filter by what you need." />
      <section className="mx-auto max-w-[1600px] px-5 pb-32 md:px-10">
        <Finder />
      </section>
    </>
  );
}
