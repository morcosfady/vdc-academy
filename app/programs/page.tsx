import type { Metadata } from "next";
import { PageHero } from "@/components/ui/PageHero";
import { ProgramsExplorer } from "@/components/programs/ProgramsExplorer";

export const metadata: Metadata = {
  title: "Programs",
  description: "BIM and VDC programs: Revit, Navisworks, clash detection, 4D/5D simulation, Dynamo and BIM management.",
};

export default function ProgramsPage() {
  return (
    <>
      <PageHero tag="E-501 · PROGRAMS" title="BIM & VDC programs" subtitle="From first model to coordination lead. Pick a single course or the full bootcamp." />
      <section className="mx-auto max-w-7xl px-4 py-16 md:px-6">
        <ProgramsExplorer />
      </section>
    </>
  );
}
