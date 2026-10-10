// Starter program list. Durations, formats, prices and dates are placeholders until the owner confirms them.
// Phase 3 extends this with modules, outcomes, prices and cohort dates.
export type Program = {
  slug: string;
  title: string;
  level: "Beginner" | "Intermediate" | "Advanced" | "All levels";
  summary: string;
  icon: string; // lucide icon name, resolved in components/home/ProgramsPreview
  featured?: boolean;
};

export const programs: Program[] = [
  { slug: "vdc-professional-bootcamp", title: "VDC Professional Bootcamp", level: "All levels", summary: "The flagship path: core tracks, a capstone project and career support.", icon: "Rocket", featured: true },
  { slug: "bim-fundamentals-revit", title: "BIM Fundamentals with Revit", level: "Beginner", summary: "Start from zero and build your first coordinated model.", icon: "Building2" },
  { slug: "revit-architecture", title: "Revit Architecture", level: "Intermediate", summary: "Architectural modeling, documentation and sheets.", icon: "Ruler" },
  { slug: "revit-structure", title: "Revit Structure", level: "Intermediate", summary: "Structural framing, foundations and analytical models.", icon: "Layers" },
  { slug: "revit-mep", title: "Revit MEP", level: "Intermediate", summary: "Mechanical, electrical and plumbing systems in Revit.", icon: "Workflow" },
  { slug: "low-voltage-bim", title: "Low Voltage & Technology Systems BIM", level: "Intermediate", summary: "Data, security, AV and fire alarm modeling.", icon: "Cable" },
  { slug: "revit-family-creation", title: "Revit Family Creation", level: "Advanced", summary: "Build custom parametric families.", icon: "Puzzle" },
  { slug: "navisworks-clash-detection", title: "Navisworks: Coordination & Clash Detection", level: "Intermediate", summary: "Federate models and resolve clashes.", icon: "ScanSearch" },
  { slug: "4d-5d-simulation", title: "4D/5D Construction Simulation", level: "Advanced", summary: "Link models to schedule and cost.", icon: "CalendarClock" },
  { slug: "dynamo-for-revit", title: "Dynamo for Revit (BIM Automation)", level: "Advanced", summary: "Automate repetitive modeling tasks.", icon: "Zap" },
  { slug: "bim-management-iso-19650", title: "BIM Management & ISO 19650 basics", level: "Advanced", summary: "Standards, execution plans and information management.", icon: "ClipboardCheck" },
];
