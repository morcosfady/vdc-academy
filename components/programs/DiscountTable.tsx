import { discounts, earlyBird } from "@/config/discounts";
import { cn } from "@/lib/utils";

const rule = { borderColor: "var(--rule)" } as const;

export type DiscountRow = { key: string; label: string; who: string; proof: string; percent: number };

// Every discount in config/discounts.ts plus early bird, in one place for /pricing and /fresh-graduates.
export function discountRows(autoLabel: string): DiscountRow[] {
  return [
    ...Object.values(discounts).map((d) => ({ key: d.id, label: d.label, who: d.who, proof: d.proof, percent: d.percent })),
    { key: "early", label: earlyBird.label, who: earlyBird.who, proof: autoLabel, percent: earlyBird.percent },
  ];
}

// Hairline table on wide screens, a stacked list on phones. The fresh graduate row carries the brass percent.
export function DiscountTable({ rows, cols, title, className }: { rows: DiscountRow[]; cols: { label: string; who: string; proof: string; off: string }; title: string; className?: string }) {
  const pct = (r: DiscountRow) => <span className={cn("font-semibold tabular-nums", r.key === "freshGrad" ? "text-warm" : "text-text")}>{r.percent}%</span>;
  return (
    <div className={className}>
      <table className="hidden w-full border-collapse text-[15px] md:table">
        <caption className="sr-only">{title}</caption>
        <thead>
          <tr>
            {[cols.label, cols.who, cols.proof, cols.off].map((h) => (
              <th key={h} scope="col" className="mono border-b pb-3 pe-4 text-start font-normal last:pe-0 last:text-end" style={rule}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key}>
              <th scope="row" className="border-b py-4 pe-4 text-start font-medium text-text" style={rule}>
                {r.label}
              </th>
              <td className="border-b py-4 pe-4 text-muted" style={rule}>
                {r.who}
              </td>
              <td className="border-b py-4 pe-4 text-muted" style={rule}>
                {r.proof}
              </td>
              <td className="border-b py-4 text-end" style={rule}>
                {pct(r)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <ul className="border-t md:hidden" style={rule}>
        {rows.map((r) => (
          <li key={r.key} className="border-b py-5" style={rule}>
            <div className="flex items-baseline justify-between gap-4">
              <p className="font-medium text-text">{r.label}</p>
              {pct(r)}
            </div>
            <dl className="mt-3 grid grid-cols-[64px_1fr] gap-x-4 gap-y-1.5 text-[15px]">
              <dt className="mono pt-0.5">{cols.who}</dt>
              <dd className="text-muted">{r.who}</dd>
              <dt className="mono pt-0.5">{cols.proof}</dt>
              <dd className="text-muted">{r.proof}</dd>
            </dl>
          </li>
        ))}
      </ul>
    </div>
  );
}
