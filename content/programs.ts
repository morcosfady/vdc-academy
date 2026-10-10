// Program catalog. Syllabus text is a DRAFT outline. Durations, formats, schedules, prices, dates and seats
// are null until the owner confirms them; the UI shows [PLACEHOLDER] chips for null values.
// Fresh grad / student prices are computed from priceFull in config/discounts.ts, not stored here.
export type Module = { title: string; lessons: string[] };

export type Program = {
  slug: string;
  title: string;
  summary: string;
  level: "Beginner" | "Intermediate" | "Advanced" | "All levels";
  icon: string; // lucide icon name
  featured?: boolean;
  durationWeeks: number | null;
  hours: number | null;
  format: string | null; // Online live / In-person / Hybrid
  schedule: string | null;
  prerequisites: string[];
  outcomes: string[];
  modules: Module[];
  software: string[];
  projects: string[];
  certificate: string;
  priceFull: number | null;
  nextCohortDate: string | null;
  seats: number | null;
};

type Input = Pick<Program, "slug" | "title" | "summary" | "level" | "icon" | "outcomes" | "modules" | "software" | "projects"> &
  Partial<Program>;

const p = (x: Input): Program => ({
  featured: false,
  durationWeeks: null,
  hours: null,
  format: null,
  schedule: null,
  prerequisites: ["None"],
  certificate: "Certificate of completion from VDC Academy by Bay BIM Designs",
  priceFull: null,
  nextCohortDate: null,
  seats: null,
  ...x,
});

export const programs: Program[] = [
  p({
    slug: "vdc-professional-bootcamp",
    title: "VDC Professional Bootcamp",
    summary: "The flagship path: core tracks, a capstone project and career support.",
    level: "All levels",
    icon: "Rocket",
    featured: true,
    prerequisites: ["Basic computer skills"],
    outcomes: ["Model in Revit across disciplines", "Run coordination and clash detection in Navisworks", "Build a 4D simulation", "Present a portfolio-ready capstone"],
    modules: [
      { title: "BIM foundations", lessons: ["BIM concepts and workflows", "Revit interface and project setup", "Views, sheets and documentation"] },
      { title: "Discipline modeling", lessons: ["Architecture and structure basics", "MEP and low voltage systems", "Families and parameters"] },
      { title: "Coordination and simulation", lessons: ["Federated models in Navisworks", "Clash detection and reports", "4D sequencing"] },
      { title: "Capstone and career", lessons: ["Capstone project", "CV and portfolio review", "Interview preparation"] },
    ],
    software: ["Autodesk Revit", "Navisworks", "Dynamo"],
    projects: ["Multi-discipline coordinated building model", "Clash report and resolution log", "4D simulation video"],
  }),
  p({
    slug: "bim-fundamentals-revit",
    title: "BIM Fundamentals with Revit",
    summary: "Start from zero and build your first coordinated model.",
    level: "Beginner",
    icon: "Building2",
    outcomes: ["Explain BIM and VDC", "Create walls, floors, roofs and levels", "Produce views and sheets", "Share a clean model"],
    modules: [
      { title: "What is BIM?", lessons: ["BIM vs CAD", "Roles on a BIM project", "LOD basics"] },
      { title: "Revit essentials", lessons: ["Interface and templates", "Levels, grids and walls", "Doors, windows and components"] },
      { title: "Documentation", lessons: ["Views and annotations", "Schedules", "Sheets and printing"] },
    ],
    software: ["Autodesk Revit"],
    projects: ["Small building model with sheets"],
  }),
  p({
    slug: "revit-architecture",
    title: "Revit Architecture",
    summary: "Architectural modeling, documentation and sheets.",
    level: "Intermediate",
    icon: "Ruler",
    prerequisites: ["BIM Fundamentals with Revit or equal experience"],
    outcomes: ["Model complex architectural elements", "Create detailed drawing sets", "Manage design options and phases"],
    modules: [
      { title: "Advanced modeling", lessons: ["Curtain walls", "Stairs and railings", "Roofs and ceilings"] },
      { title: "Documentation", lessons: ["Details and callouts", "Schedules and tags", "Sheet standards"] },
      { title: "Collaboration", lessons: ["Worksets", "Linking models", "Design options"] },
    ],
    software: ["Autodesk Revit"],
    projects: ["Architectural model and drawing set"],
  }),
  p({
    slug: "revit-structure",
    title: "Revit Structure",
    summary: "Structural framing, foundations and analytical models.",
    level: "Intermediate",
    icon: "Layers",
    prerequisites: ["BIM Fundamentals with Revit or equal experience"],
    outcomes: ["Model structural frames and foundations", "Document reinforcement basics", "Coordinate with architecture"],
    modules: [
      { title: "Structural modeling", lessons: ["Grids and columns", "Beams and framing", "Slabs and foundations"] },
      { title: "Documentation", lessons: ["Structural views", "Schedules", "Sheets"] },
      { title: "Coordination", lessons: ["Linked architecture", "Shared coordinates", "Change tracking"] },
    ],
    software: ["Autodesk Revit"],
    projects: ["Structural model of a multi-story building"],
  }),
  p({
    slug: "revit-mep",
    title: "Revit MEP",
    summary: "Mechanical, electrical and plumbing systems in Revit.",
    level: "Intermediate",
    icon: "Workflow",
    prerequisites: ["BIM Fundamentals with Revit or equal experience"],
    outcomes: ["Model ducts, pipes and electrical systems", "Size and tag systems", "Coordinate above ceilings"],
    modules: [
      { title: "Mechanical", lessons: ["Spaces and zones", "Duct layout", "Equipment and fittings"] },
      { title: "Plumbing and piping", lessons: ["Pipe systems", "Fixtures", "Slopes and sizing"] },
      { title: "Electrical", lessons: ["Panels and circuits", "Conduit and cable tray", "Lighting"] },
    ],
    software: ["Autodesk Revit"],
    projects: ["Full MEP model for a commercial floor"],
  }),
  p({
    slug: "low-voltage-bim",
    title: "Low Voltage & Technology Systems BIM",
    summary: "Data, security, AV and fire alarm modeling.",
    level: "Intermediate",
    icon: "Cable",
    prerequisites: ["BIM Fundamentals with Revit or equal experience"],
    outcomes: ["Model data, security, AV and fire alarm systems", "Use custom device families", "Produce device schedules and riser diagrams"],
    modules: [
      { title: "Technology systems in BIM", lessons: ["System types", "Device placement rules", "Pathways and cable tray"] },
      { title: "Families and data", lessons: ["Device families", "Parameters and schedules", "Bills of materials"] },
      { title: "Coordination", lessons: ["Clash with MEP", "Ceiling coordination", "Deliverables"] },
    ],
    software: ["Autodesk Revit", "Navisworks"],
    projects: ["Low voltage model with device schedules"],
  }),
  p({
    slug: "revit-family-creation",
    title: "Revit Family Creation",
    summary: "Build custom parametric families.",
    level: "Advanced",
    icon: "Puzzle",
    prerequisites: ["Revit modeling experience"],
    outcomes: ["Build parametric families", "Use types, formulas and visibility", "Create connectors for MEP families"],
    modules: [
      { title: "Family basics", lessons: ["Templates and categories", "Reference planes", "Extrusions and blends"] },
      { title: "Parametric logic", lessons: ["Parameters and formulas", "Type catalogs", "Visibility and detail levels"] },
      { title: "MEP families", lessons: ["Connectors", "Nested families", "Quality checks"] },
    ],
    software: ["Autodesk Revit"],
    projects: ["Library of custom families"],
  }),
  p({
    slug: "navisworks-clash-detection",
    title: "Navisworks: Coordination & Clash Detection",
    summary: "Federate models and resolve clashes.",
    level: "Intermediate",
    icon: "ScanSearch",
    prerequisites: ["Revit basics"],
    outcomes: ["Federate multi-discipline models", "Set up clash tests and rules", "Write and track clash reports"],
    modules: [
      { title: "Federation", lessons: ["Appending models", "Search sets", "Viewpoints"] },
      { title: "Clash detection", lessons: ["Clash tests", "Tolerances and rules", "Grouping clashes"] },
      { title: "Coordination process", lessons: ["Reports", "Issue tracking", "Running meetings"] },
    ],
    software: ["Navisworks", "Autodesk Construction Cloud"],
    projects: ["Coordinated model with a clash report"],
  }),
  p({
    slug: "4d-5d-simulation",
    title: "4D/5D Construction Simulation",
    summary: "Link models to schedule and cost.",
    level: "Advanced",
    icon: "CalendarClock",
    prerequisites: ["Navisworks coordination experience"],
    outcomes: ["Link a model to a schedule", "Build a 4D simulation", "Extract quantities for 5D"],
    modules: [
      { title: "Schedule basics", lessons: ["Schedule structure", "Importing schedules", "Task types"] },
      { title: "4D simulation", lessons: ["Linking model to tasks", "Appearance and timeline", "Exporting video"] },
      { title: "5D basics", lessons: ["Quantity takeoff", "Cost linking", "Reporting"] },
    ],
    software: ["Navisworks", "Microsoft Project", "Primavera P6"],
    projects: ["4D simulation of a building"],
  }),
  p({
    slug: "dynamo-for-revit",
    title: "Dynamo for Revit (BIM Automation)",
    summary: "Automate repetitive modeling tasks.",
    level: "Advanced",
    icon: "Zap",
    prerequisites: ["Revit modeling experience"],
    outcomes: ["Read and write Revit data", "Build visual scripts", "Automate checks and tagging"],
    modules: [
      { title: "Dynamo basics", lessons: ["Nodes and wires", "Lists", "Selecting elements"] },
      { title: "Working with data", lessons: ["Parameters", "Excel exchange", "Filtering"] },
      { title: "Automation projects", lessons: ["Batch tagging", "Model checks", "Sheet creation"] },
    ],
    software: ["Dynamo", "Autodesk Revit"],
    projects: ["Three automation scripts"],
  }),
  p({
    slug: "bim-management-iso-19650",
    title: "BIM Management & ISO 19650 basics",
    summary: "Standards, execution plans and information management.",
    level: "Advanced",
    icon: "ClipboardCheck",
    prerequisites: ["Some BIM project experience"],
    outcomes: ["Write a BIM execution plan", "Set up a common data environment", "Apply ISO 19650 concepts"],
    modules: [
      { title: "Standards", lessons: ["ISO 19650 overview", "Roles and responsibilities", "Information requirements"] },
      { title: "Execution planning", lessons: ["BIM execution plan", "Naming and folder standards", "LOD specification"] },
      { title: "Quality management", lessons: ["Model audits", "Handover data", "Team training"] },
    ],
    software: ["Autodesk Construction Cloud", "Navisworks"],
    projects: ["BIM execution plan"],
  }),
];

export const getProgram = (slug: string) => programs.find((x) => x.slug === slug);
