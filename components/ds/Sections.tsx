import { cn } from "@/lib/utils";
import { SheetTag } from "./Devices";

const ruleBorder = { borderColor: "var(--rule)" } as const;

export function SectionHeader({
  sheet,
  name,
  title,
  lead,
  className,
  children,
}: {
  sheet?: string;
  name?: string;
  title: React.ReactNode;
  lead?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <header className={cn("max-w-3xl", className)}>
      {sheet && name && <SheetTag sheet={sheet} name={name} className="mb-8" />}
      <h2>{title}</h2>
      {lead && <p className="t-lead mt-6">{lead}</p>}
      {children}
    </header>
  );
}

export function Stat({ value, label, className }: { value: React.ReactNode; label: string; className?: string }) {
  return (
    <div className={className}>
      <p className="text-[clamp(2rem,1.4rem+2vw,3rem)] font-semibold leading-none tracking-tight text-text">{value}</p>
      <p className="mono mt-3">{label}</p>
    </div>
  );
}

// Inline facts separated by hairlines
export function FactRow({ items, className }: { items: React.ReactNode[]; className?: string }) {
  return (
    <ul className={cn("flex flex-wrap text-[15px] text-muted", className)}>
      {items.map((it, i) => (
        <li key={i} className={cn("py-1 pe-5", i > 0 && "border-s ps-5")} style={ruleBorder}>
          {it}
        </li>
      ))}
    </ul>
  );
}

// Benefit row: icon, one bold line, one light line. No box.
export function FeatureItem({ icon, title, text, className }: { icon: React.ReactNode; title: string; text: string; className?: string }) {
  return (
    <div className={cn("border-t py-8 pe-8", className)} style={ruleBorder}>
      <div className="mb-5 text-accent-text">{icon}</div>
      <h4 className="!text-[1.125rem] !font-semibold !tracking-normal">{title}</h4>
      <p className="t-small mt-2 text-dim">{text}</p>
    </div>
  );
}
