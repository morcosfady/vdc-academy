import { Marquee } from "@/components/ui/Marquee";

// Text badges, not official logos. Confirm trademark use before swapping in logos (see HANDOFF).
const software = [
  "Autodesk Revit",
  "Navisworks",
  "AutoCAD",
  "Autodesk Construction Cloud",
  "Dynamo",
  "Enscape",
  "Twinmotion",
  "Bluebeam",
  "Microsoft Project",
  "Primavera P6",
];

export function SoftwareMarquee() {
  return (
    <section className="border-y border-border py-10">
      <p className="mb-6 text-center font-mono text-xs uppercase tracking-[0.2em] text-text-muted">
        D-401 · Software you will use
      </p>
      <Marquee items={software} />
    </section>
  );
}
