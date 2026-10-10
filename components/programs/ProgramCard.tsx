import Link from "next/link";
import { photos, type Photo as PhotoData } from "@/assets/images";
import { Badge } from "@/components/ui/Badge";
import { Photo } from "@/components/ui/Photo";
import { calcPrice, money } from "@/lib/pricing";
import { discounts } from "@/config/discounts";
import type { Program } from "@/content/programs";
import { InView } from "@/components/ui/InView";
import { ProgramGlyph } from "./ProgramGlyph";

// Each program gets its own cover: a graded photo crop (steel frame, glass tower or facade) at its own focus point.
const covers: Record<string, { photo: PhotoData; pos: string }> = {
  "bim-fundamentals-revit": { photo: photos.cardGlass, pos: "20% 30%" },
  "revit-architecture": { photo: photos.cardFacade, pos: "30% 40%" },
  "revit-structure": { photo: photos.cardSteel, pos: "55% 70%" },
  "revit-mep": { photo: photos.cardGlass, pos: "80% 60%" },
  "low-voltage-bim": { photo: photos.cardGlass, pos: "45% 15%" },
  "revit-family-creation": { photo: photos.cardFacade, pos: "85% 20%" },
  "navisworks-clash-detection": { photo: photos.cardSteel, pos: "20% 40%" },
  "4d-5d-simulation": { photo: photos.cardSteel, pos: "85% 25%" },
  "dynamo-for-revit": { photo: photos.cardGlass, pos: "60% 85%" },
  "bim-management-iso-19650": { photo: photos.cardFacade, pos: "60% 80%" },
  "vdc-professional-bootcamp": { photo: photos.cardSteel, pos: "50% 40%" },
};

// Price area only shows what we know: no placeholders.
export function ProgramCard({ p, freshGrad = false }: { p: Program; freshGrad?: boolean }) {
  const r = calcPrice(p.priceFull, freshGrad ? "freshGrad" : null, false);
  const cover = covers[p.slug] ?? covers["bim-fundamentals-revit"];
  return (
    <Link
      prefetch={false}
      href={`/programs/${p.slug}`}
      className="glass draw-border group relative flex h-full flex-col overflow-hidden hover:-translate-y-1 hover:shadow-[0_18px_44px_-14px_var(--glow)]"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-[#0a1d23]">
        <Photo photo={cover.photo} className="transition-transform duration-700 group-hover:scale-[1.04]" style={{ objectPosition: cover.pos }} />
        <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-[#0a1d23] via-[#0a1d23]/40 to-transparent" />
        {["navisworks-clash-detection", "4d-5d-simulation"].includes(p.slug) ? <InView><ProgramGlyph slug={p.slug} className="absolute bottom-3 start-4 size-12 text-[#eaf2f7] transition-transform duration-500 group-hover:-rotate-6 group-hover:text-[#7db3e8]" /></InView> : <ProgramGlyph slug={p.slug} className="absolute bottom-3 start-4 size-12 text-[#eaf2f7] transition-transform duration-500 group-hover:-rotate-6 group-hover:text-[#7db3e8]" />}
        <span className="absolute end-4 top-4 rounded-lg border border-[#365b62] bg-[#0a1d23]/80 px-3 py-1 text-[13px] font-medium text-[#eaf2f7] backdrop-blur-sm">{p.level}</span>
      </div>
      <div className="flex flex-1 flex-col p-6">
        <h3 className="text-[1.1rem] leading-snug">{p.title}</h3>
        <p className="mt-3 flex-1 text-sm text-muted">{p.summary}</p>
        <ul className="mt-5 flex flex-wrap gap-2">
          {p.software.slice(0, 3).map((s) => (
            <li key={s}><Badge>{s}</Badge></li>
          ))}
        </ul>
        <div className="mt-5 flex items-center justify-between border-t border-border pt-4 text-sm">
          {p.priceFull === null ? (
            <span className="text-muted">Price on request</span>
          ) : (
            <span>
              {r.final !== null && money(r.final)}
              {freshGrad && <span className="ms-2 text-warm">−{discounts.freshGrad.percent}% for fresh grads</span>}
            </span>
          )}
          <span className="font-medium text-accent-text">
            View program <span aria-hidden className="inline-block transition-transform group-hover:translate-x-1">→</span>
          </span>
        </div>
      </div>
    </Link>
  );
}
