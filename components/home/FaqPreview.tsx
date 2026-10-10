import Link from "next/link";
import { SectionHeader } from "@/components/ui/SectionHeader";

// Answers avoid anything the owner has not confirmed (prices, dates, policies).
const faqs = [
  { q: "Do I need BIM experience to start?", a: "No. BIM Fundamentals with Revit starts from zero. Later programs list their prerequisites." },
  { q: "Who is the academy for?", a: "Fresh graduates, current students, working professionals and career changers in architecture, engineering and construction." },
  { q: "Who teaches the programs?", a: "Working professionals from Bay BIM Designs, a BIM and VDC company in Fort Worth, TX." },
  { q: "What do I need to run Revit?", a: "A laptop that can run Revit. The application form asks, and minimum specs are listed there." },
  { q: "How does the fresh graduate discount work?", a: "If you graduated within the last 24 months, upload your certificate or transcript. The discount stays pending until we verify it." },
  { q: "How much do programs cost and when do they start?", a: "Prices and cohort dates are being finalized. Apply and we will send the details." },
];

export function FaqPreview() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-24 md:px-6">
      <SectionHeader tag="L-1201 · FAQ" title="Questions, answered" />
      <div className="divide-y divide-border border-y border-border">
        {faqs.map((f) => (
          <details key={f.q} className="group py-4">
            <summary className="flex cursor-pointer list-none items-center justify-between font-medium">
              {f.q}
              <span aria-hidden className="ms-4 transition group-open:rotate-45">+</span>
            </summary>
            <p className="mt-3 text-text-muted">{f.a}</p>
          </details>
        ))}
      </div>
      <p className="mt-6">
        <Link href="/faq" className="text-brand-accent underline">See all questions</Link>
      </p>
    </section>
  );
}
