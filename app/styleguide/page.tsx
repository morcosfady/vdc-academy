import type { Metadata } from "next";
import { photos } from "@/assets/images";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";
import { ProgramCard, TestimonialCard, InstructorCard } from "@/components/ds/Cards";
import { Software, Tag } from "@/components/ds/Chips";
import { DimensionString, GridBubble, NorthArrow, SectionMarker, SheetTag, TitleBlock } from "@/components/ds/Devices";
import { FactRow, FeatureItem, Stat } from "@/components/ds/Sections";
import { ControlsDemo, FormsDemo, OverlayDemo } from "@/components/ds/StyleguideDemo";

export const metadata: Metadata = {
  title: "Styleguide",
  robots: { index: false, follow: false },
};

const swatches = [
  { name: "paper", hex: "#F6F4EF", use: "Main light background", dark: false },
  { name: "paper-2", hex: "#ECEAE3", use: "Alternate light panels", dark: false },
  { name: "white", hex: "#FFFFFF", use: "Cards on paper", dark: false },
  { name: "ink", hex: "#0A1D23", use: "Text on light, main dark sections", dark: true },
  { name: "ink-2", hex: "#10272F", use: "Dark surfaces", dark: true },
  { name: "ink-3", hex: "#06141A", use: "Deepest dark (footer)", dark: true },
  { name: "slate", hex: "#365B62", use: "Lines, secondary text, icons", dark: true },
  { name: "mist", hex: "#DEEFFD", use: "Highlights, selection", dark: false },
  { name: "blueprint", hex: "#2A63C4", use: "The one accent: buttons, links, active", dark: true },
  { name: "brass", hex: "#B8925A", use: "Rare: fresh-grad offer, small rules", dark: false },
  { name: "clash", hex: "#D9463E", use: "Only inside the clash animation", dark: true },
];

const pairs = [
  { on: "paper", fg: "Headings #0A1D23", ratio: "15.8:1" },
  { on: "paper", fg: "Body #2E3F45", ratio: "10.0:1" },
  { on: "paper", fg: "Muted #566A71", ratio: "5.2:1" },
  { on: "paper", fg: "Blueprint #2A63C4", ratio: "5.2:1" },
  { on: "ink", fg: "Headings #EEF3F6", ratio: "15.5:1" },
  { on: "ink", fg: "Body #AFC0C7", ratio: "9.2:1" },
  { on: "ink", fg: "Muted #7F959C", ratio: "5.5:1" },
  { on: "ink", fg: "Accent #7FAEF0", ratio: "7.6:1" },
];

const scale = [
  { cls: "t-display", name: "Display", spec: "Poppins 600 · 88 / 1.02 · mobile 44", sample: "Learn BIM the way it is built." },
  { cls: "t-h1", name: "H1", spec: "64 / 1.05 · mobile 38", sample: "Pick your track." },
  { cls: "t-h2", name: "H2", spec: "48 / 1.1 · mobile 32", sample: "Taught by people who coordinate." },
  { cls: "t-h3", name: "H3", spec: "32 / 1.15 · mobile 24", sample: "Practice on real project files" },
  { cls: "t-h4", name: "H4", spec: "24 / 1.2 · mobile 20", sample: "Revit Architecture" },
];

const spacing = [8, 16, 24, 32, 48, 64, 96, 128, 176];

function Block({ id, sheet, title, children, dark }: { id: string; sheet: string; title: string; children: React.ReactNode; dark?: boolean }) {
  return (
    <section id={id} className={`${dark ? "theme-dark" : "theme-light"} section !py-20 lg:!py-24`}>
      <div className="wrap">
        <SheetTag sheet={sheet} name={title} className="mb-12" />
        {children}
      </div>
    </section>
  );
}

function Variants({ children }: { children: (light: boolean) => React.ReactNode }) {
  return (
    <div className="grid gap-px overflow-hidden rounded-[12px] border lg:grid-cols-2" style={{ borderColor: "var(--rule)", background: "var(--rule)" }}>
      <div className="theme-light p-7 md:p-10">
        <p className="mono mb-8">On paper</p>
        {children(true)}
      </div>
      <div className="theme-dark p-7 md:p-10">
        <p className="mono mb-8">On ink</p>
        {children(false)}
      </div>
    </div>
  );
}

export default function Styleguide() {
  const pageLine = { borderColor: "var(--rule)" };
  return (
    <>
      <section className="theme-light section !pb-16 !pt-36 lg:!pt-44">
        <div className="wrap">
          <SheetTag sheet="SG-000" name="Style guide" className="mb-10" />
          <h1 className="t-display max-w-5xl">The Drawing Set</h1>
          <p className="t-lead mt-8">
            Design system v5 for VDC Academy. A premium architectural drawing set: warm paper pages, deep ink sections, precise thin lines and one accent.
          </p>
          <nav aria-label="Style guide sections" className="mt-12 flex flex-wrap gap-x-8 gap-y-3 border-t pt-6" style={pageLine}>
            {["color", "type", "grid", "lines", "devices", "buttons", "cards", "controls", "forms", "overlays", "chrome"].map((s) => (
              <a key={s} href={`#${s}`} className="mono ul-draw pb-0.5 hover:!text-text">
                {s}
              </a>
            ))}
          </nav>
        </div>
      </section>

      <Block id="color" sheet="SG-100" title="Color">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6">
          {swatches.map((s) => (
            <div key={s.name}>
              <div className="h-28 rounded-[8px] border" style={{ background: s.hex, borderColor: "var(--rule)" }} />
              <p className="mt-3 text-[15px] font-medium text-text">{s.name}</p>
              <p className="mono">{s.hex}</p>
              <p className="t-small mt-1 text-dim">{s.use}</p>
            </div>
          ))}
        </div>
        <h3 className="mt-20 !text-[1.25rem]">Text pairs (measured, all AA or better)</h3>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {["paper", "ink"].map((bg) => (
            <div key={bg} className={bg === "ink" ? "theme-dark rounded-[12px] p-7" : "rounded-[12px] border bg-paper p-7"} style={bg === "ink" ? undefined : pageLine}>
              <p className="mono mb-5">On {bg}</p>
              <ul className="space-y-3">
                {pairs
                  .filter((p) => p.on === bg)
                  .map((p) => (
                    <li key={p.fg} className="flex items-baseline justify-between gap-4 border-b pb-3" style={pageLine}>
                      <span className={bg === "ink" ? "text-[#eef3f6]" : "text-ink"} style={{ color: p.fg.includes("Body") ? (bg === "ink" ? "#AFC0C7" : "#2E3F45") : p.fg.includes("Muted") ? (bg === "ink" ? "#7F959C" : "#566A71") : p.fg.includes("Blueprint") ? "#2A63C4" : p.fg.includes("Accent") ? "#7FAEF0" : undefined }}>
                        {p.fg}
                      </span>
                      <span className="mono">{p.ratio}</span>
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="t-small mt-6 max-w-2xl text-dim">
          Blueprint is a steel-leaning blue derived from the Bay BIM Designs palette. The bright blue and the pink on baybimdesigns.com belong to its accessibility plugin, so they are not brand colors. Error text uses a darker red (#B8352E) for AA; clash red stays inside the clash animation.
        </p>
      </Block>

      <Block id="type" sheet="SG-200" title="Typography" dark>
        <div className="space-y-12">
          {scale.map((s) => (
            <div key={s.name} className="grid gap-4 border-t pt-8 lg:grid-cols-[200px_1fr]" style={pageLine}>
              <div>
                <p className="mono !text-text">{s.name}</p>
                <p className="mono mt-1">{s.spec}</p>
              </div>
              <p className={s.cls}>{s.sample}</p>
            </div>
          ))}
          <div className="grid gap-4 border-t pt-8 lg:grid-cols-[200px_1fr]" style={pageLine}>
            <div>
              <p className="mono !text-text">Lead</p>
              <p className="mono mt-1">21 / 1.5 · mobile 18</p>
            </div>
            <p className="t-lead">Live training in Revit, Navisworks and VDC from the engineers at Bay BIM Designs.</p>
          </div>
          <div className="grid gap-4 border-t pt-8 lg:grid-cols-[200px_1fr]" style={pageLine}>
            <div>
              <p className="mono !text-text">Body</p>
              <p className="mono mt-1">18 / 1.6 · mobile 16 · max 60ch</p>
            </div>
            <p className="t-body">You practice on the same files our coordinators use. Each module ends with a deliverable you can show an employer, so your first interview starts from your own work.</p>
          </div>
          <div className="grid gap-4 border-t pt-8 lg:grid-cols-[200px_1fr]" style={pageLine}>
            <div>
              <p className="mono !text-text">Mono</p>
              <p className="mono mt-1">IBM Plex Mono · 12 · 0.08em</p>
            </div>
            <p className="mono">A-101 · LOD 350 · 32.7555° N, 97.3308° W · Fort Worth, TX</p>
          </div>
        </div>
        <p className="t-small mt-10 max-w-2xl text-dim">
          Two families. Poppins for display and UI, IBM Plex Mono for the technical voice only. The Eurostile-style face appears in the logo and nowhere else.
        </p>
      </Block>

      <Block id="grid" sheet="SG-300" title="Grid and spacing">
        <p className="t-body">12 columns, 1320px max, 24px gutters (16 on phones), 32px side margins (20 on phones). Add <span className="mono !text-text">?grid=1</span> to any page to show the overlay.</p>
        <div className="mt-10 grid grid-cols-12 gap-x-4 md:gap-x-6">
          {Array.from({ length: 12 }, (_, i) => (
            <div key={i} className="h-24 rounded-[4px] bg-mist/70 text-center">
              <span className="mono mt-3 inline-block !text-ink">{i + 1}</span>
            </div>
          ))}
        </div>
        <h3 className="mt-16 !text-[1.25rem]">Spacing scale (8px base)</h3>
        <div className="mt-6 space-y-3">
          {spacing.map((s) => (
            <div key={s} className="flex items-center gap-5">
              <span className="mono w-12 !text-text">{s}</span>
              <span className="h-3 rounded-[2px] bg-blueprint" style={{ width: Math.min(s * 2.2, 560) }} />
            </div>
          ))}
        </div>
        <p className="t-small mt-8 text-dim">Section padding is 160px top and bottom on desktop, 96px on phones.</p>
      </Block>

      <Block id="lines" sheet="SG-400" title="Lines, shapes, surfaces" dark>
        <div className="grid gap-6 md:grid-cols-4">
          {[
            ["0px", "Full-bleed images", "0"],
            ["4px", "Inputs, chips, tags", "4px"],
            ["8px", "Buttons", "8px"],
            ["12px", "Cards", "12px"],
          ].map(([r, u, rad]) => (
            <div key={r}>
              <div className="h-28 border-2 border-accent" style={{ borderRadius: rad }} />
              <p className="mono mt-3 !text-text">{r}</p>
              <p className="t-small text-dim">{u}</p>
            </div>
          ))}
        </div>
        <div className="mt-14 grid gap-6 md:grid-cols-2">
          <div className="theme-light rounded-[12px] p-8">
            <div className="card p-8">
              <p className="mono !text-text">Card on paper</p>
              <p className="t-small mt-2">1px border and a very soft shadow. No glass.</p>
            </div>
            <div className="mt-8 border-t pt-4" style={pageLine}>
              <p className="mono">Hairline: slate at 25%</p>
            </div>
          </div>
          <div className="rounded-[12px] border p-8" style={pageLine}>
            <div className="card p-8">
              <p className="mono !text-text">Card on ink</p>
              <p className="t-small mt-2">Border only, no shadow.</p>
            </div>
            <div className="mt-8 border-t pt-4" style={pageLine}>
              <p className="mono">Hairline: white at 10%</p>
            </div>
          </div>
        </div>
      </Block>

      <Block id="devices" sheet="SG-500" title="Drawing-set devices">
        <div className="grid gap-x-10 gap-y-14 md:grid-cols-2">
          <div>
            <p className="mono mb-5">Sheet tag</p>
            <SheetTag sheet="A-101" name="Inside the model" />
          </div>
          <div>
            <p className="mono mb-5">Grid bubbles</p>
            <div className="flex gap-3 text-slate">
              {["A", "B", "C", "1", "2", "3"].map((l) => (
                <GridBubble key={l} label={l} />
              ))}
            </div>
          </div>
          <div className="md:col-span-2">
            <p className="mono mb-5">Dimension string</p>
            <div className="aspect-[16/6] w-full rounded-[2px] bg-paper-2" />
            <DimensionString label="12 weeks" className="mt-3" />
          </div>
          <div>
            <p className="mono mb-5">North arrow and section marker</p>
            <div className="flex items-center gap-6 text-slate">
              <NorthArrow />
              <SectionMarker id="3" />
            </div>
          </div>
          <div className="md:col-span-2">
            <p className="mono mb-5">Title block</p>
            <TitleBlock
              rows={[
                { k: "Project", v: "VDC Academy" },
                { k: "Client", v: "Bay BIM Designs" },
                { k: "Sheet", v: "A-999" },
                { k: "Date", v: "2026-10-18" },
                { k: "Scale", v: "1:1" },
                { k: "Rev", v: "05" },
              ]}
            />
          </div>
        </div>
        <p className="t-small mt-10 max-w-2xl text-dim">Rule: one or two devices per section. Sheet tags appear on four sections only.</p>
      </Block>

      <Block id="buttons" sheet="SG-600" title="Buttons and links">
        <Variants>
          {() => (
            <div className="space-y-8">
              <div className="flex flex-wrap items-center gap-4">
                <Button href="#buttons">Apply now</Button>
                <Button href="#buttons" variant="secondary">
                  Explore programs
                </Button>
                <Button href="#buttons" variant="link">
                  View all 11 programs
                </Button>
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <Button disabled>Disabled</Button>
                <Button variant="secondary" disabled>
                  Disabled
                </Button>
              </div>
              <p className="t-small text-dim">Hover: background shifts and lifts 1px. Links draw their underline. Focus shows a 3px ring.</p>
            </div>
          )}
        </Variants>
      </Block>

      <Block id="cards" sheet="SG-700" title="Cards" dark>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <ProgramCard href="#cards" sheet="P-01" title="Revit Architecture" line="Architectural modeling, documentation and sheets." level="Intermediate" software={["Revit", "AutoCAD"]} photo={photos.cardFacade} />
          <ProgramCard href="#cards" sheet="P-02" title="Revit Structure" line="Structural framing, foundations and analytical models." level="Intermediate" software={["Revit", "Robot"]} photo={photos.cardSteel} />
          <ProgramCard href="#cards" sheet="P-03" title="Navisworks Coordination" line="Clash detection and coordination on live project models." level="Advanced" software={["Navisworks", "ACC"]} photo={photos.cardGlass} />
          <div className="md:col-span-2">
            <ProgramCard featured href="#cards" sheet="P-00" title="VDC Professional Bootcamp" line="Model, coordinate and plan a project from start to finish." level="Pro" software={["Revit", "Navisworks", "ACC"]} photo={photos.hero} />
          </div>
          <div className="space-y-6">
            <TestimonialCard quote="We trained our design team and onboarded BIM into everyday use at the firm." who="COO, Technology Design Firm" />
          </div>
        </div>
        <div className="mt-14 grid items-start gap-10 md:grid-cols-3">
          <FeatureItem
            icon={
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
                <rect x="3" y="6" width="22" height="16" />
                <path d="M3 11h22M9 6v16" />
              </svg>
            }
            title="Real project files"
            text="Practice on the files our coordinators use."
          />
          <Stat value="11" label="Programs" />
          <div className="max-w-[280px]">
            <InstructorCard name="Instructor name" role="BIM coordinator" photo={photos.glass} />
          </div>
        </div>
        <FactRow className="mt-14" items={["11 programs", "Live and hands-on", <span key="f">Fresh grads save <span className="text-brass">40%</span></span>]} />
        <div className="mt-10 flex flex-wrap items-center gap-3">
          <Software>Revit</Software>
          <Software>Navisworks</Software>
          <Tag>Intermediate</Tag>
          <Tag tone="brass">Fresh grads</Tag>
          <Tag tone="blueprint">New cohort</Tag>
        </div>
      </Block>

      <Block id="controls" sheet="SG-800" title="Tabs, segmented, toggle, accordion, stepper">
        <Variants>{() => <ControlsDemo />}</Variants>
      </Block>

      <Block id="forms" sheet="SG-900" title="Inputs, select, upload">
        <Variants>{() => <FormsDemo />}</Variants>
      </Block>

      <Block id="overlays" sheet="SG-910" title="Modal and toast">
        <Variants>{(light) => <OverlayDemo light={light} />}</Variants>
      </Block>

      <Block id="chrome" sheet="SG-920" title="Header and footer" dark>
        <p className="t-body">The header (paper, hairline, blur on scroll) is at the top of this page. The footer, with its title block, is below. The logo wordmark:</p>
        <div className="theme-light mt-8 inline-block rounded-[12px] p-8 text-ink">
          <Logo />
        </div>
      </Block>
    </>
  );
}
