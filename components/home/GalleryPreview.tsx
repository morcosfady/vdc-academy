"use client";

import { useRef, useState } from "react";
import dynamic from "next/dynamic";
import { WhenVisible } from "@/components/three/WhenVisible";
import { SceneFallback } from "@/components/three/SceneFallback";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { newModelState, type Cats } from "@/lib/modelState";

const ViewerScene = dynamic(() => import("@/components/three/ViewerScene"), { ssr: false });

const toggles: { key: keyof Cats; label: string }[] = [
  { key: "structure", label: "Structure" },
  { key: "ducts", label: "Ducts" },
  { key: "pipes", label: "Pipes" },
  { key: "trays", label: "Cable trays" },
  { key: "facade", label: "Facade" },
];

const tiles = ["h-48", "h-64", "h-40", "h-56", "h-44", "h-60"];

export function GalleryPreview() {
  const stateRef = useRef(newModelState());
  const [cats, setCats] = useState<Cats>(stateRef.current.cats);
  const [cut, setCut] = useState(100);

  function toggle(k: keyof Cats) {
    const next = { ...cats, [k]: !cats[k] };
    setCats(next);
    stateRef.current.cats = next;
  }
  function section(v: number) {
    setCut(v);
    stateRef.current.sim = v >= 100 ? -1 : v / 100;
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-24 md:px-6">
      <SectionHeader tag="H-801 · STUDENT WORK" title="Models built by our students" subtitle="Student projects will appear here. Try the interactive viewer with a sample building." />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <WhenVisible className="h-[50vh] rounded-card border border-border blueprint-grid" fallback={<SceneFallback />} label="Interactive 3D building model. Drag to orbit, use the buttons below to show or hide disciplines.">
            {(active) => <ViewerScene active={active} stateRef={stateRef} />}
          </WhenVisible>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            {toggles.map((t) => (
              <button
                key={t.key}
                type="button"
                aria-pressed={cats[t.key]}
                onClick={() => toggle(t.key)}
                className={`rounded-btn border px-3 py-2 text-sm ${cats[t.key] ? "border-brand-accent bg-surface" : "border-border text-text-muted"}`}
              >
                {t.label}
              </button>
            ))}
            <label className="ms-auto flex items-center gap-2 text-sm">
              Section
              <input type="range" min={10} max={100} value={cut} onChange={(e) => section(Number(e.target.value))} className="accent-[var(--brand-accent)]" aria-label="Section box height" />
            </label>
          </div>
        </div>
        <ul className="columns-2 gap-3 lg:columns-1">
          {tiles.map((h, i) => (
            <li key={i} className={`${h} mb-3 break-inside-avoid rounded-card border border-border blueprint-grid grid place-items-end p-3`}>
              <span className="placeholder-chip text-xs">[STUDENT PROJECT {i + 1}]</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
