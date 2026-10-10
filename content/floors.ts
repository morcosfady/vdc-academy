import type { Isolate } from "@/lib/modelState";

// The career path as a building: each floor is a level. Program slugs match content/programs.ts.
export const floors = [
  { n: 0, title: "Foundations", note: "Start from zero", slugs: ["bim-fundamentals-revit"] },
  { n: 1, title: "Discipline modeling", note: "Pick your trade", slugs: ["revit-architecture", "revit-structure", "revit-mep", "low-voltage-bim"] },
  { n: 2, title: "Advanced modeling", note: "Build smarter", slugs: ["revit-family-creation", "dynamo-for-revit"] },
  { n: 3, title: "Coordination", note: "Find problems early", slugs: ["navisworks-clash-detection"] },
  { n: 4, title: "Construction", note: "Plan the build", slugs: ["4d-5d-simulation"] },
  { n: 5, title: "Leadership", note: "Run the model", slugs: ["bim-management-iso-19650", "vdc-professional-bootcamp"] },
];

export const programMeta: Record<string, { floor: number; disciplines: string[] }> = {
  "bim-fundamentals-revit": { floor: 0, disciplines: ["Foundations"] },
  "revit-architecture": { floor: 1, disciplines: ["Architecture"] },
  "revit-structure": { floor: 1, disciplines: ["Structure"] },
  "revit-mep": { floor: 1, disciplines: ["MEP"] },
  "low-voltage-bim": { floor: 1, disciplines: ["Low voltage", "MEP"] },
  "revit-family-creation": { floor: 2, disciplines: ["Modeling"] },
  "dynamo-for-revit": { floor: 2, disciplines: ["Automation"] },
  "navisworks-clash-detection": { floor: 3, disciplines: ["Coordination"] },
  "4d-5d-simulation": { floor: 4, disciplines: ["Construction"] },
  "bim-management-iso-19650": { floor: 5, disciplines: ["Management"] },
  "vdc-professional-bootcamp": { floor: 5, disciplines: ["Foundations", "Coordination", "Construction", "Management"] },
};

export type Discipline = {
  id: Isolate;
  label: string;
  sentence: string;
  software: string[];
  slug: string;
  program: string;
};

// The explorer buttons on the home page.
export const disciplines: Discipline[] = [
  { id: "architecture", label: "Architecture", sentence: "The glass, walls and floors people see. You model the shape and the documents.", software: ["Revit"], slug: "revit-architecture", program: "Revit Architecture" },
  { id: "structure", label: "Structure", sentence: "Columns, beams and slabs that hold the building up, modeled to real sizes.", software: ["Revit"], slug: "revit-structure", program: "Revit Structure" },
  { id: "mep", label: "MEP", sentence: "Ducts and pipes that move air and water, laid out so they fit above the ceiling.", software: ["Revit"], slug: "revit-mep", program: "Revit MEP" },
  { id: "lowvoltage", label: "Low voltage", sentence: "Cable trays and devices for data, security, audio video and fire alarm.", software: ["Revit", "Navisworks"], slug: "low-voltage-bim", program: "Low Voltage & Technology Systems BIM" },
  { id: "clash", label: "Clash detection", sentence: "Find where systems collide in the model, fix it on screen, not on site.", software: ["Navisworks"], slug: "navisworks-clash-detection", program: "Navisworks: Coordination & Clash Detection" },
  { id: "4d", label: "4D", sentence: "Link the model to the schedule and watch the building go up week by week.", software: ["Navisworks", "Primavera P6"], slug: "4d-5d-simulation", program: "4D/5D Construction Simulation" },
];
