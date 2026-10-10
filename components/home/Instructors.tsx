import { SectionHeader } from "@/components/ui/SectionHeader";

// Placeholders until instructor details are provided.
const people = [1, 2, 3];

export function Instructors() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-24 md:px-6">
      <SectionHeader tag="I-901 · INSTRUCTORS" title="Learn from working professionals" />
      <ul className="grid gap-5 md:grid-cols-3">
        {people.map((n) => (
          <li key={n} className="group [perspective:900px]">
            <div className="relative h-72 transition-transform duration-500 [transform-style:preserve-3d] group-hover:[transform:rotateY(180deg)] group-focus-within:[transform:rotateY(180deg)]">
              <div className="absolute inset-0 flex flex-col justify-end rounded-card border border-border bg-bg-elevated p-6 [backface-visibility:hidden] blueprint-grid">
                <p className="font-heading font-bold"><span className="placeholder-chip">[INSTRUCTOR NAME]</span></p>
                <p className="text-sm text-text-muted"><span className="placeholder-chip">[ROLE]</span> · <span className="placeholder-chip">[YEARS]</span> years</p>
              </div>
              <div className="absolute inset-0 flex flex-col justify-center rounded-card border border-brand-accent bg-surface p-6 [backface-visibility:hidden] [transform:rotateY(180deg)]">
                <p className="text-sm text-text-muted"><span className="placeholder-chip">[SHORT BIO]</span></p>
                <a href="#" tabIndex={0} className="mt-4 text-sm text-brand-accent underline">LinkedIn <span className="placeholder-chip">[LINK]</span></a>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
