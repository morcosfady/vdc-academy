import { Button } from "@/components/ui/Button";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Badge } from "@/components/ui/Badge";
import { site } from "@/config/site";

// Phase 1 placeholder. The 3D showcase arrives in Phase 2.
export default function Home() {
  return (
    <section className="blueprint-grid">
      <div className="mx-auto max-w-7xl px-4 py-24 md:px-6 md:py-32">
        <SectionHeader
          tag="A-001 · PHASE 1 FOUNDATION"
          title={site.tagline}
          subtitle="Hands-on training in Revit, Navisworks, clash detection, and virtual construction, taught by working professionals from Bay BIM Designs."
        />
        <div className="flex flex-wrap items-center gap-4">
          <Button href="/apply" variant="glow">Apply Now</Button>
          <Button href="/programs" variant="secondary">Explore Programs</Button>
          <Badge>🎓 Fresh grad? Get up to {site.freshGradMaxDiscount}% off</Badge>
        </div>
      </div>
    </section>
  );
}
