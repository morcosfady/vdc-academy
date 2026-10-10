import { Award, BriefcaseBusiness, FolderGit2, HardHat, MonitorCog, Users } from "lucide-react";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { TiltCard } from "@/components/ui/TiltCard";
import { Reveal } from "@/components/ui/Reveal";

const features = [
  { icon: HardHat, title: "Learn from working BIM professionals", text: "Real projects and real standards, not just theory." },
  { icon: FolderGit2, title: "Real project files", text: "Practice on files modeled after AE firms, GCs, subcontractors and low-voltage technology work." },
  { icon: MonitorCog, title: "Software you will use on the job", text: "Revit, Navisworks, Dynamo and the tools teams actually run." },
  { icon: Users, title: "A portfolio employers can see", text: "Finish with models and coordination work you can show." },
  { icon: BriefcaseBusiness, title: "Career support", text: "CV review, interview prep and LinkedIn tips." },
  { icon: Award, title: "Certificate of completion", text: "Issued by VDC Academy by Bay BIM Designs." },
];

export function Features() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-24 md:px-6">
      <SectionHeader tag="C-301 · WHY VDC ACADEMY" title="Training built by the people who do the work" />
      <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((f, i) => (
          <li key={f.title}>
            <Reveal delay={i * 0.06}>
              <TiltCard className="h-full">
                <f.icon className="mb-4 text-brand-accent" size={32} aria-hidden />
                <h3 className="text-base font-bold">{f.title}</h3>
                <p className="mt-2 text-sm text-text-muted">{f.text}</p>
              </TiltCard>
            </Reveal>
          </li>
        ))}
      </ul>
    </section>
  );
}
