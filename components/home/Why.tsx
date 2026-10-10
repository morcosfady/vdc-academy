import { Award, FolderOpen, Handshake, Layers, Presentation, Wrench } from "lucide-react";
import { photos } from "@/assets/images";
import { Badge } from "@/components/ui/Badge";
import { BlueprintLayer } from "@/components/ui/BlueprintLayer";
import { Photo } from "@/components/ui/Photo";
import { Slab } from "@/components/ui/Slab";

const panels = [
  { n: "01", text: "Taught by people who coordinate real projects.", photo: photos.steel, pos: "50% 60%" },
  { n: "02", text: "Practice on real-world project files.", photo: photos.glass, pos: "50% 50%" },
  { n: "03", text: "Leave with a portfolio, not just a certificate.", photo: photos.facade, pos: "40% 50%" },
];

const benefits = [
  { icon: Presentation, t: "Live training", d: "Learn with an instructor, not a video." },
  { icon: FolderOpen, t: "Real project files", d: "Models like the ones teams build." },
  { icon: Wrench, t: "Job-ready tools", d: "The software firms actually use." },
  { icon: Layers, t: "A portfolio", d: "Work you can show an employer." },
  { icon: Handshake, t: "Career support", d: "CV review, interviews, LinkedIn." },
  { icon: Award, t: "A certificate", d: "From VDC Academy by Bay BIM Designs." },
];

const software = ["Revit", "Navisworks", "AutoCAD", "Autodesk Construction Cloud", "Dynamo", "Enscape", "Bluebeam", "Primavera P6"];

export function Why() {
  return (
    <section id="ch-3" aria-labelledby="why-title" className="theme-light cv-auto relative overflow-hidden py-24 md:py-36">
      <BlueprintLayer className="drift pointer-events-none absolute inset-0 h-full w-full text-[#1f5c99] opacity-[0.07]" />
      <div className="relative z-10 mx-auto max-w-[1280px] px-5 md:px-8">
        <Slab className="max-w-3xl">
          <p className="label mb-5">03 · Why VDC Academy</p>
          <h2 id="why-title" className="display-lg">Training built around real projects.</h2>
        </Slab>

        <ul className="mt-14 grid gap-6 md:grid-cols-3">
          {panels.map((p, i) => (
            <Slab as="li" key={p.n} index={i} className={i === 1 ? "md:mt-12" : i === 2 ? "md:mt-24" : ""}>
              <figure className="group relative aspect-[4/5] overflow-hidden rounded-2xl bg-[#0a1d23] shadow-[0_24px_60px_-28px_rgba(10,29,35,0.6)]">
                <Photo photo={p.photo} className="transition-transform duration-[1200ms] group-hover:scale-105" style={{ objectPosition: p.pos }} />
                <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-[#000e12] via-[#0a1d23]/45 to-transparent" />
                <figcaption className="absolute inset-x-0 bottom-0 p-7">
                  <p className="label mb-3 !text-[#c9a36a]">{p.n}</p>
                  <p className="text-[1.45rem] font-semibold leading-snug tracking-tight text-[#f2f7fb]">{p.text}</p>
                </figcaption>
              </figure>
            </Slab>
          ))}
        </ul>

        <Slab className="mt-28 md:mt-44">
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {benefits.map((b) => (
              <li key={b.t} className="glass flex gap-4 p-5">
                <b.icon className="mt-0.5 shrink-0 text-accent" size={26} strokeWidth={1.5} aria-hidden />
                <div>
                  <p className="font-medium">{b.t}</p>
                  <p className="mt-1 text-sm text-muted">{b.d}</p>
                </div>
              </li>
            ))}
          </ul>
        </Slab>

        <Slab className="mt-14">
          <p className="label mb-4">Software you will use</p>
          <ul className="flex flex-wrap gap-2">
            {software.map((s) => (
              <li key={s}>
                <Badge className="bg-white/60 px-4 py-2 text-[0.8rem] transition-colors hover:border-accent hover:text-accent-text">{s}</Badge>
              </li>
            ))}
          </ul>
        </Slab>
      </div>
    </section>
  );
}
