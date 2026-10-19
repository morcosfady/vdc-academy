import { Slab } from "@/components/ui/Slab";
import { cn } from "@/lib/utils";

export type TimelineItem = { k?: string; t: string; d: string };

const dot = { borderColor: "var(--slate)", background: "var(--bg, var(--paper))" } as const;
const line = { background: "var(--rule)" } as const;

// Vertical timeline: a dot per item and a connector that draws down (.draw-y) as each block reveals.
// The connector stays inside its own item so the Slab mask never cuts it.
export function Timeline({ items, className }: { items: TimelineItem[]; className?: string }) {
  return (
    <ol className={cn("list-none", className)}>
      {items.map((it, i) => {
        const last = i === items.length - 1;
        return (
          <Slab as="li" key={it.t} index={i} className={cn("relative grid grid-cols-[20px_1fr] gap-x-5", !last && "pb-10")}>
            <div className="relative flex justify-center">
              <span aria-hidden className="relative z-10 mt-1.5 size-[13px] shrink-0 rounded-full border" style={dot} />
              {!last && <span aria-hidden className="draw-y absolute bottom-0 top-5 w-px" style={line} />}
            </div>
            <div className="min-w-0">
              {it.k && <p className="mono">{it.k}</p>}
              <h3 className="mt-1 !text-[1.25rem]">{it.t}</h3>
              <p className="t-small mt-2 max-w-md text-dim">{it.d}</p>
            </div>
          </Slab>
        );
      })}
    </ol>
  );
}

// Process steps: a horizontal stepper from lg (dots joined by a hairline that draws left to right, .draw-x),
// a vertical timeline below lg (.draw-y). Mono step numbers.
export function Steps({ items, className }: { items: TimelineItem[]; className?: string }) {
  return (
    <ol className={cn("list-none lg:grid lg:grid-cols-4", className)}>
      {items.map((it, i) => {
        const last = i === items.length - 1;
        return (
          <Slab as="li" key={it.t} index={i} className={cn("relative grid grid-cols-[20px_1fr] gap-x-5 lg:block lg:pe-8", !last && "pb-10 lg:pb-0")}>
            {/* phones: dot and the vertical connector */}
            <div className="relative flex justify-center lg:hidden">
              <span aria-hidden className="relative z-10 mt-1.5 size-[13px] shrink-0 rounded-full border" style={dot} />
              {!last && <span aria-hidden className="draw-y absolute bottom-0 top-5 w-px" style={line} />}
            </div>
            {/* desktop: dot and the horizontal connector */}
            <div className="hidden h-[13px] items-center lg:flex">
              <span aria-hidden className="size-[13px] shrink-0 rounded-full border" style={dot} />
              {!last && <span aria-hidden className="draw-x ms-3 h-px flex-1" style={line} />}
            </div>
            <div className="min-w-0 lg:mt-6">
              <p className="mono !text-accent-text">{it.k ?? String(i + 1).padStart(2, "0")}</p>
              <h3 className="mt-2 !text-[1.25rem]">{it.t}</h3>
              <p className="t-small mt-2 max-w-xs text-dim">{it.d}</p>
            </div>
          </Slab>
        );
      })}
    </ol>
  );
}
