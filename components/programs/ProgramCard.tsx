import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { calcPrice, money } from "@/lib/pricing";
import { discounts } from "@/config/discounts";
import type { Program } from "@/content/programs";
import { ProgramGlyph } from "./ProgramGlyph";

// Unique icon per program. Price area only shows what we know: no placeholders.
export function ProgramCard({ p, freshGrad = false }: { p: Program; freshGrad?: boolean }) {
  const r = calcPrice(p.priceFull, freshGrad ? "freshGrad" : null, false);
  return (
    <Link
      href={`/programs/${p.slug}`}
      className="glass group relative flex h-full flex-col p-6 transition-[border-color,box-shadow,transform] duration-500 hover:-translate-y-1 hover:border-accent hover:shadow-[0_0_40px_var(--glow)]"
    >
      <ProgramGlyph slug={p.slug} className="mb-8 size-14 text-text transition-transform duration-500 group-hover:-translate-y-1 group-hover:text-accent-text" />
      <p className="label mb-2">{p.level}</p>
      <h3 className="text-[1.05rem] leading-snug">{p.title}</h3>
      <p className="mt-3 flex-1 text-sm text-muted">{p.summary}</p>
      <ul className="mt-5 flex flex-wrap gap-2">
        {p.software.slice(0, 2).map((s) => (
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
        <span aria-hidden className="text-accent-text transition-transform group-hover:translate-x-1">→</span>
      </div>
    </Link>
  );
}
