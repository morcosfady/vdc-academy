"use client";

import { useRef } from "react";
import { SceneSlot } from "@/components/three/SceneSlot";
import { SheetTag } from "@/components/ds/Devices";
import { FactRow } from "@/components/ds/Sections";
import { Tag } from "@/components/ds/Chips";
import { newState } from "@/lib/modelState";
import { pages } from "@/content/copy-pages";
import { isolateFor } from "./sheet";

const c = pages.program;

// Program hero on paper. Text in columns 1 to 6, the white study model with this program's systems isolated in 7 to 12.
export function ProgramHero({ slug, sheet, level, title, summary, facts }: { slug: string; sheet: string; level: string; title: string; summary: string; facts: string[] }) {
  const iso = isolateFor(slug);
  const state = useRef(
    newState({
      lod: 400,
      mood: 0,
      isolate: iso.isolate,
      ...(iso.isolate === "clash" ? { clash: 0.3 } : {}),
      ...(iso.isolate === "4d" ? { sim: 0.7 } : {}),
    }),
  );
  return (
    <section className="theme-light pt-[72px]">
      <div className="wrap">
        <div className="grid-12 items-center gap-y-12 pb-16 pt-14 lg:pb-24 lg:pt-24">
          <div className="col-span-12 lg:col-span-6">
            <div className="flex flex-wrap items-center gap-4">
              <SheetTag sheet={sheet} name={iso.label} />
              <Tag>{level}</Tag>
            </div>
            <h1 className="t-h1 mt-8 max-w-[14ch]">{title}</h1>
            <p className="t-lead mt-6 max-w-[32rem]">{summary}</p>
            {facts.length > 0 && <FactRow className="mt-10" items={facts} />}
          </div>
          <div className="col-span-12 lg:col-span-6">
            <SceneSlot stateRef={state} autoRotate rotateSpeed={0.08} fit={0.95} label={c.modelAlt(iso.label)} className="mx-auto aspect-square w-[80%] sm:w-[64%] lg:aspect-[5/4] lg:w-full" />
          </div>
        </div>
      </div>
    </section>
  );
}
