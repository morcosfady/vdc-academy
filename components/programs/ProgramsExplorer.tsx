"use client";

import { useMemo, useState } from "react";
import { programs, type Program } from "@/content/programs";
import { cn } from "@/lib/utils";
import { ProgramCard } from "./ProgramCard";

const levels: ("All" | Program["level"])[] = ["All", "Beginner", "Intermediate", "Advanced"];

export function ProgramsExplorer() {
  const [level, setLevel] = useState<(typeof levels)[number]>("All");
  const [q, setQ] = useState("");

  const list = useMemo(
    () =>
      programs.filter(
        (p) =>
          (level === "All" || p.level === level || p.level === "All levels") &&
          (p.title + p.summary).toLowerCase().includes(q.toLowerCase()),
      ),
    [level, q],
  );

  return (
    <>
      <div className="mb-8 flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by level">
          {levels.map((l) => (
            <button
              key={l}
              type="button"
              aria-pressed={level === l}
              onClick={() => setLevel(l)}
              className={cn("rounded-btn border px-4 py-2 text-sm", level === l ? "border-brand-accent bg-surface" : "border-border text-text-muted")}
            >
              {l}
            </button>
          ))}
        </div>
        <label className="ms-auto">
          <span className="sr-only">Search programs</span>
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search programs"
            className="rounded-btn border border-border bg-bg-elevated px-4 py-2 text-sm"
          />
        </label>
      </div>
      <p className="sr-only" aria-live="polite">{list.length} programs shown</p>
      <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((p) => (
          <li key={p.slug}><ProgramCard p={p} /></li>
        ))}
      </ul>
      {list.length === 0 && <p className="text-text-muted">No programs match. Try another filter.</p>}
    </>
  );
}
