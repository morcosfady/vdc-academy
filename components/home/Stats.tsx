import { Reveal } from "@/components/ui/Reveal";

// Real numbers are not available yet, so each stat shows a visible placeholder. Swap `value` for a number
// and it will count up (use <Counter to={n} /> in place of the chip).
const stats = [
  { label: "Students trained", value: null },
  { label: "Hands-on projects", value: null },
  { label: "Hiring partners", value: null },
  { label: "Hours of practice", value: null },
];

export function Stats() {
  return (
    <section className="border-y border-border bg-bg-elevated">
      <dl className="mx-auto grid max-w-7xl grid-cols-2 gap-8 px-4 py-12 md:grid-cols-4 md:px-6">
        {stats.map((s, i) => (
          <Reveal key={s.label} delay={i * 0.08}>
            <dd className="font-heading text-4xl font-bold">
              <span className="placeholder-chip">[XX]</span>
            </dd>
            <dt className="mt-2 text-sm text-text-muted">{s.label}</dt>
          </Reveal>
        ))}
      </dl>
    </section>
  );
}
