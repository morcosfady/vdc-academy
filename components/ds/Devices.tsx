import { cn } from "@/lib/utils";

// Drawing-set graphic devices. Use one or two per section, never more.

const line = { background: "var(--rule)" } as const;
const ruleBorder = { borderColor: "var(--rule)" } as const;

// Sheet tag: mono sheet number, section name and a thin rule. Top-left of the four major sections.
export function SheetTag({ sheet, name, className }: { sheet: string; name: string; className?: string }) {
  return (
    <div className={cn("flex items-center gap-4", className)}>
      <span className="mono !text-text">{sheet}</span>
      <span aria-hidden className="h-px w-10" style={line} />
      <span className="mono">{name}</span>
    </div>
  );
}

// Grid bubble: a circle with a letter or number, as on a structural grid.
export function GridBubble({ label, size = 28, className }: { label: string; size?: number; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("mono inline-grid place-items-center rounded-full border border-current", className)}
      style={{ width: size, height: size, fontSize: 11 }}
    >
      {label}
    </span>
  );
}

// Dimension string: |<-- 12 WEEKS -->| under an image or a model.
export function DimensionString({ label, className }: { label: string; className?: string }) {
  return (
    <div className={cn("flex items-center gap-3", className)} role="img" aria-label={label}>
      <svg aria-hidden width="10" height="14" viewBox="0 0 10 14" className="shrink-0" style={{ color: "var(--text-dim)" }}>
        <path d="M1 0v14M10 7H1M4 4 1 7l3 3" fill="none" stroke="currentColor" strokeWidth="1" />
      </svg>
      <span aria-hidden className="h-px flex-1" style={line} />
      <span className="mono shrink-0">{label}</span>
      <span aria-hidden className="h-px flex-1" style={line} />
      <svg aria-hidden width="10" height="14" viewBox="0 0 10 14" className="shrink-0" style={{ color: "var(--text-dim)" }}>
        <path d="M9 0v14M0 7h9M6 4l3 3-3 3" fill="none" stroke="currentColor" strokeWidth="1" />
      </svg>
    </div>
  );
}

// North arrow
export function NorthArrow({ size = 36, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" aria-hidden className={className}>
      <circle cx="18" cy="18" r="16.5" fill="none" stroke="currentColor" strokeWidth="1" />
      <path d="M18 6 24 26 18 22 12 26Z" fill="currentColor" />
    </svg>
  );
}

// Section marker: a circle split by a line, with a sheet reference, as on a section cut.
export function SectionMarker({ id, size = 36, className }: { id: string; size?: number; className?: string }) {
  return (
    <span aria-hidden className={cn("relative inline-block", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 36 36">
        <circle cx="18" cy="18" r="16.5" fill="none" stroke="currentColor" strokeWidth="1" />
        <path d="M1.5 18h33" stroke="currentColor" strokeWidth="1" />
      </svg>
      <span className="mono absolute inset-x-0 top-[3px] text-center" style={{ fontSize: 10 }}>{id}</span>
      <span className="mono absolute inset-x-0 bottom-[3px] text-center" style={{ fontSize: 10 }}>A-1</span>
    </span>
  );
}

// Architectural title block, used across the bottom of the footer.
export function TitleBlock({ rows, className }: { rows: { k: string; v: React.ReactNode }[]; className?: string }) {
  return (
    <dl className={cn("flex flex-wrap border", className)} style={ruleBorder}>
      {rows.map((r) => (
        <div key={r.k} className="min-w-[140px] flex-1 border-e p-4 last:border-e-0" style={ruleBorder}>
          <dt className="mono">{r.k}</dt>
          <dd className="mt-1 text-[15px] text-text">{r.v}</dd>
        </div>
      ))}
    </dl>
  );
}
