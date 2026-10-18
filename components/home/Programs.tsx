"use client";

import { useState } from "react";
import { programs } from "@/content/programs";
import { programMeta } from "@/content/floors";
import { cover } from "@/content/media";
import { copy } from "@/content/copy";
import { site } from "@/config/site";
import { money } from "@/lib/pricing";
import { Tabs } from "@/components/ds/Controls";
import { ProgramCard } from "@/components/ds/Cards";
import { SectionHeader } from "@/components/ds/Sections";
import { Button } from "@/components/ui/Button";
import { Slab } from "@/components/ui/Slab";
import { cn } from "@/lib/utils";

// Tab to floor numbers (content/floors.ts)
const tracks: Record<string, number[] | null> = { All: null, Foundations: [0], Modeling: [1, 2], Coordination: [3], Construction: [4], Leadership: [5] };
const sheet = (slug: string) => `P-${String(programs.findIndex((p) => p.slug === slug) + 1).padStart(2, "0")}`;

// S4. Ink. Program cards as drawing sheets. The bootcamp is featured and spans two columns and two rows.
export function Programs() {
  const c = copy.programs;
  const [tab, setTab] = useState("All");
  const floors = tracks[tab];
  const list = floors ? programs.filter((p) => floors.includes(programMeta[p.slug]?.floor ?? -1)) : [programs.find((p) => p.featured)!, ...programs.filter((p) => !p.featured).slice(0, 4)];

  return (
    <section id="programs" aria-labelledby="programs-title" className="theme-dark section">
      <div className="wrap">
        <Slab>
          <SectionHeader sheet={c.sheet} name={c.name} title={<span id="programs-title">{c.title}</span>} lead={c.lead} />
        </Slab>
        <Slab index={1}>
          <Tabs className="mt-12" label="Program track" value={tab} onChange={setTab} tabs={c.tabs.map((t) => ({ id: t, label: t }))} />
        </Slab>

        <ul key={tab} className="mt-10 grid auto-rows-fr gap-6 md:grid-cols-2 lg:grid-cols-3">
          {list.map((p, i) => {
            const feat = tab === "All" && p.featured;
            return (
              <li key={p.slug} className={cn("fan-in", feat && "md:col-span-2")} style={{ "--i": i } as React.CSSProperties}>
                <ProgramCard
                  href={`/programs/${p.slug}`}
                  sheet={sheet(p.slug)}
                  title={p.title}
                  line={p.summary}
                  level={p.level}
                  software={p.software.slice(0, 3)}
                  photo={cover(p.slug).photo}
                  pos={cover(p.slug).pos}
                  price={p.priceFull !== null ? money(p.priceFull) : undefined}
                  featured={!!feat}
                />
              </li>
            );
          })}
        </ul>

        <div className="mt-12 flex flex-wrap items-center justify-between gap-6 border-t pt-8" style={{ borderColor: "var(--rule)" }}>
          <p className="t-small text-dim">{c.note(site.freshGradMaxDiscount)}</p>
          <Button href="/programs" variant="link">
            {c.all(programs.length)}
          </Button>
        </div>
      </div>
    </section>
  );
}
