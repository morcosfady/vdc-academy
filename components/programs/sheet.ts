import { programs, type Program } from "@/content/programs";
import { programMeta } from "@/content/floors";
import type { Isolate } from "@/lib/modelState";

// Sheet number by catalog order: P-01 .. P-11
export const sheetOf = (p: Program) => `P-${String(programs.indexOf(p) + 1).padStart(2, "0")}`;

// Which systems the study model isolates for a program, from its disciplines in content/floors.ts.
// Programs that span three or more disciplines (the bootcamp) show the whole model.
const byDiscipline: Record<string, Isolate> = {
  Architecture: "architecture",
  Structure: "structure",
  MEP: "mep",
  "Low voltage": "lowvoltage",
  Coordination: "clash",
  Construction: "4d",
};

export function isolateFor(slug: string): { isolate: Isolate; label: string } {
  const d = programMeta[slug]?.disciplines ?? [];
  if (d.length >= 3) return { isolate: "all", label: "Whole model" };
  for (const name of d) {
    const iso = byDiscipline[name];
    if (iso) return { isolate: iso, label: name };
  }
  return { isolate: "all", label: "Whole model" };
}
