import { Building2, CalendarClock, Cable, ClipboardCheck, Layers, Puzzle, Rocket, Ruler, ScanSearch, Workflow, Zap, type LucideIcon } from "lucide-react";

export const programIcons: Record<string, LucideIcon> = {
  Rocket, Building2, Ruler, Layers, Workflow, Cable, Puzzle, ScanSearch, CalendarClock, Zap, ClipboardCheck,
};

// Shows the value, or a visible placeholder when the owner has not provided it yet.
export function Val({ v, ph, suffix = "" }: { v: string | number | null; ph: string; suffix?: string }) {
  return v === null || v === "" ? <span className="placeholder-chip">[{ph}]</span> : <>{v}{suffix}</>;
}
