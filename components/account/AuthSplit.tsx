import { SheetTag, GridBubble, DimensionString } from "@/components/ds/Devices";
import { SteppedPoster } from "@/components/three/SteppedPoster";

// Auth pages: form on the left (max 480px), the white study model still on a paper-2 panel with grid bubbles on
// the right. The panel is decorative and hidden below lg, so phones get the form first and nothing else.
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
          <aside aria-hidden className="hidden lg:col-span-6 lg:col-start-7 lg:block xl:col-span-6 xl:col-start-7">
            <div className="relative flex h-full min-h-[560px] flex-col justify-center rounded-[12px] bg-paper-2 px-14 py-16 text-slate">
              <div className="absolute inset-x-[16%] top-8 flex justify-between">
                {["A", "B", "C"].map((l) => (
                  <GridBubble key={l} label={l} size={32} />
                ))}
              </div>
              <div className="absolute inset-y-[22%] end-8 flex flex-col justify-between">
                {["1", "2", "3"].map((l) => (
                  <GridBubble key={l} label={l} size={32} />
                ))}
              </div>
              <div className="mx-auto w-[78%]">
                <SteppedPoster className="block aspect-[5/4] w-full" />
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
