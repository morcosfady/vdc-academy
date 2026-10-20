import { SheetTag, GridBubble, DimensionString } from "@/components/ds/Devices";
import { SteppedPoster } from "@/components/three/SteppedPoster";

// Auth pages: form on the left (max 480px), the white study model still (the pre-rendered AVIF, never WebGL) on a
// paper-2 panel on the right. The grid marks are drawn, not buttons: small, faint, and never styled like the hero's
// controls. The still loads eagerly so the panel is never an empty grey box. On phones the panel sits below the form.
export function AuthSplit({ sheet, name, title, lead, children, panelLabel }: { sheet: string; name: string; title: string; lead?: string; children: React.ReactNode; panelLabel: string }) {
  return (
    <section className="theme-light pt-[72px]">
      <div className="wrap">
        <div className="grid-12 items-stretch gap-y-12 pb-20 pt-10 lg:min-h-[calc(100svh-72px)] lg:py-16">
          <div className="col-span-12 flex items-center lg:col-span-6 xl:col-span-5">
            <div className="w-full max-w-[480px]">
              <SheetTag sheet={sheet} name={name} />
              <h1 className="t-h1 mt-8">{title}</h1>
              {lead && <p className="t-lead mt-4">{lead}</p>}
              <div className="mt-10">{children}</div>
            </div>
          </div>
          <aside aria-hidden className="col-span-12 lg:col-span-6 lg:col-start-7 xl:col-span-6 xl:col-start-7">
            <div className="relative flex h-full min-h-[340px] flex-col justify-center rounded-[12px] bg-paper-2 px-8 py-12 text-slate lg:min-h-[560px] lg:px-14 lg:py-16" data-testid="auth-panel">
              <div className="pointer-events-none absolute inset-x-[16%] top-8 flex justify-between opacity-50 select-none">
                {["A", "B", "C"].map((l) => (
                  <GridBubble key={l} label={l} size={22} />
                ))}
              </div>
              <div className="pointer-events-none absolute inset-y-[22%] end-8 flex flex-col justify-between opacity-50 select-none">
                {["1", "2", "3"].map((l) => (
                  <GridBubble key={l} label={l} size={22} />
                ))}
              </div>
              <div className="mx-auto w-[78%]">
                <SteppedPoster priority className="block aspect-[5/4] w-full" />
              </div>
              <DimensionString label={panelLabel} className="mx-auto mt-8 w-[78%]" />
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}

// A small hairline divider with a word in the middle ("or").
export function OrRule({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-4" aria-hidden>
      <span className="h-px flex-1" style={{ background: "var(--rule)" }} />
      <span className="mono">{label}</span>
      <span className="h-px flex-1" style={{ background: "var(--rule)" }} />
    </div>
  );
}
