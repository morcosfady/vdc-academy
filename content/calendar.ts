// Calendar data. TODAY THESE EVENTS ARE A SAMPLE (CALENDAR_IS_SAMPLE = true): they show how the calendar will look.
//
// How the sample dates work
// - SAMPLE_BASE is the first Monday after the build. next.config.ts computes it once at build time and exposes it as
//   NEXT_PUBLIC_CALENDAR_BASE, so the server render and the browser read the same value and the page hydrates cleanly.
//   Every sample event sits N days after SAMPLE_BASE (daysFromBase), so the sample is never in the past at build time.
// - Times are wall-clock Central Time (America/Chicago), written "YYYY-MM-DDTHH:mm". A date alone ("YYYY-MM-DD") with
//   allDay: true is an all-day event. lib/calendar.ts also accepts a full ISO instant ("...Z" or "...-06:00"), so rows
//   from a database can be passed through unchanged.
//
// Going live with real dates
// 1. Replace `sampleEvents` below with the confirmed events (or let the admin dashboard feed lib/calendar.ts loadEvents).
// 2. Set CALENDAR_IS_SAMPLE to false. That removes the sample banner and the noindex tag, and turns on the Event
//    structured data for the next five events.
import type { Program } from "@/content/programs";

export type CalendarEventType = "session" | "info" | "workshop" | "deadline" | "cohort";
export type CalendarFormat = "Live online" | "On site, Dallas Fort Worth" | "Hybrid";

export type CalendarEvent = {
  id: string;
  title: string;
  type: CalendarEventType;
  start: string; // "YYYY-MM-DDTHH:mm" (Central Time) or "YYYY-MM-DD", or a full ISO instant
  end?: string;
  allDay?: boolean;
  program?: Program["slug"];
  format: CalendarFormat;
  location?: string;
  description: string;
  link?: { label: string; href: string };
  spots?: null; // seat counts stay empty until the owner confirms them
};

// Flip to false when the owner confirms real dates.
export const CALENDAR_IS_SAMPLE = true;

const pad = (n: number) => String(n).padStart(2, "0");

// First Monday after the build, "YYYY-MM-DD". The fallback only runs where next.config.ts did not (scripts, type checks).
function fallbackBase(): string {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", { timeZone: "America/Chicago", year: "numeric", month: "2-digit", day: "2-digit" })
      .formatToParts(new Date())
      .map((x) => [x.type, x.value]),
  );
  const t = new Date(Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day)));
  t.setUTCDate(t.getUTCDate() + ((8 - t.getUTCDay()) % 7 || 7));
  return t.toISOString().slice(0, 10);
}

export const SAMPLE_BASE: string = process.env.NEXT_PUBLIC_CALENDAR_BASE || fallbackBase();

// "YYYY-MM-DD" that is n days after SAMPLE_BASE.
export function daysFromBase(n: number, base: string = SAMPLE_BASE): string {
  const [y, m, d] = base.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}

const at = (n: number, time: string) => `${daysFromBase(n)}T${time}`;
const DFW = "On site, Dallas Fort Worth" as const;
const venue = "Dallas Fort Worth area, venue to be confirmed";
const apply = { label: "Start your application", href: "/apply/" };

function live(id: string, n: number, program: string, title: string, description: string): CalendarEvent {
  return { id, title, type: "session", start: at(n, "18:30"), end: at(n, "20:30"), program, format: "Live online", description };
}

function openHouse(id: string, n: number, format: CalendarFormat): CalendarEvent {
  return {
    id,
    title: "Open house: meet the instructors",
    type: "info",
    start: at(n, "18:00"),
    end: at(n, "19:00"),
    format,
    ...(format === "Live online" ? {} : { location: venue }),
    description: "An hour to see how the academy works, meet the teaching team and ask about the programs. Questions are welcome.",
  };
}

function deadline(id: string, n: number, program: string, cohort: string): CalendarEvent {
  return {
    id,
    title: `Application deadline: ${cohort} cohort`,
    type: "deadline",
    start: daysFromBase(n),
    allDay: true,
    program,
    format: "Live online",
    description: `Applications for the ${cohort} cohort close today. Apply before the end of the day to be considered for this start date.`,
    link: apply,
  };
}

function cohort(id: string, n: number, program: string, name: string, format: CalendarFormat, text: string): CalendarEvent {
  return {
    id,
    title: `Cohort starts: ${name}`,
    type: "cohort",
    start: at(n, "18:30"),
    end: at(n, "20:30"),
    program,
    format,
    ...(format === "Live online" ? {} : { location: venue }),
    description: text,
    link: apply,
  };
}

// 30 sample events over about 15 weeks, in date order. Titles and descriptions are generic on purpose.
export const sampleEvents: CalendarEvent[] = [
  deadline("d-revit-mep", 1, "revit-mep", "Revit MEP"),
  openHouse("i-open-1", 3, "Live online"),
  cohort("c-revit-mep", 8, "revit-mep", "Revit MEP", "Live online", "The first live class of the Revit MEP cohort: course setup, how the evenings run and a first look at spaces and zones."),
  live("s-revit-mep-2", 10, "revit-mep", "Revit MEP live session: Duct layout", "A live class with the instructor on duct layout. Bring a laptop with Revit installed."),
  {
    id: "w-clash-60",
    title: "Clash detection in 60 minutes",
    type: "workshop",
    start: at(12, "10:00"),
    end: at(12, "11:00"),
    program: "navisworks-clash-detection",
    format: "Live online",
    description: "A short, hands-on look at federating models, running a clash test and reading the results.",
  },
  live("s-revit-mep-3", 15, "revit-mep", "Revit MEP live session: Equipment and fittings", "A live class with the instructor on equipment and fittings. Bring a laptop with Revit installed."),
  {
    id: "i-admissions",
    title: "Info session: how admissions work",
    type: "info",
    start: at(16, "18:00"),
    end: at(16, "18:45"),
    format: "Live online",
    description: "How to apply, what happens after you apply and what to prepare. Time for questions at the end.",
    link: { label: "Start your application", href: "/apply/" },
  },
  live("s-revit-mep-4", 17, "revit-mep", "Revit MEP live session: Pipe systems", "A live class with the instructor on pipe systems. Bring a laptop with Revit installed."),
  live("s-revit-mep-5", 22, "revit-mep", "Revit MEP live session: Panels and circuits", "A live class with the instructor on panels and circuits. Bring a laptop with Revit installed."),
  live("s-revit-mep-6", 24, "revit-mep", "Revit MEP live session: Conduit and cable tray", "A live class with the instructor on conduit and cable tray. Bring a laptop with Revit installed."),
  {
    id: "w-family",
    title: "Build your first Revit family",
    type: "workshop",
    start: at(26, "10:00"),
    end: at(26, "12:00"),
    program: "revit-family-creation",
    format: DFW,
    location: venue,
    description: "A hands-on morning building a simple parametric family from a blank template. Bring a laptop with Revit installed.",
  },
  openHouse("i-open-2", 31, "Hybrid"),
  deadline("d-navisworks", 37, "navisworks-clash-detection", "Navisworks"),
  cohort("c-navisworks", 44, "navisworks-clash-detection", "Navisworks Coordination", "Live online", "The first live class of the Navisworks cohort: how the evenings run, appending models and a first set of viewpoints."),
  {
    id: "w-dynamo",
    title: "Dynamo in an afternoon",
    type: "workshop",
    start: at(47, "13:00"),
    end: at(47, "16:00"),
    program: "dynamo-for-revit",
    format: "Hybrid",
    location: venue,
    description: "A first visual script that reads and changes Revit data. Join on site or online.",
  },
  live("s-navisworks-2", 51, "navisworks-clash-detection", "Navisworks live session: Clash tests and rules", "A live class with the instructor on clash tests, tolerances and rules."),
  live("s-navisworks-3", 58, "navisworks-clash-detection", "Navisworks live session: Reports and issue tracking", "A live class with the instructor on clash reports and how issues are tracked between meetings."),
  openHouse("i-open-3", 59, DFW),
  deadline("d-bim-fundamentals", 63, "bim-fundamentals-revit", "BIM Fundamentals"),
  live("s-navisworks-4", 65, "navisworks-clash-detection", "Navisworks live session: Running a coordination meeting", "A live class with the instructor on running a coordination meeting from a federated model."),
  {
    id: "w-4d",
    title: "A first look at 4D sequencing",
    type: "workshop",
    start: at(68, "10:00"),
    end: at(68, "11:30"),
    program: "4d-5d-simulation",
    format: "Live online",
    description: "How a model is linked to a schedule, shown step by step on a small example.",
  },
  cohort("c-bim-fundamentals", 70, "bim-fundamentals-revit", "BIM Fundamentals with Revit", "Live online", "The first live class of the BIM Fundamentals cohort: what BIM is, how the evenings run and a first tour of Revit."),
  live("s-bim-fundamentals-2", 77, "bim-fundamentals-revit", "BIM Fundamentals live session: Levels, grids and walls", "A live class with the instructor on levels, grids and walls. Bring a laptop with Revit installed."),
  live("s-bim-fundamentals-3", 84, "bim-fundamentals-revit", "BIM Fundamentals live session: Views and annotations", "A live class with the instructor on views and annotations. Bring a laptop with Revit installed."),
  deadline("d-bootcamp", 84, "vdc-professional-bootcamp", "VDC Professional Bootcamp"),
  openHouse("i-open-4", 87, "Live online"),
  live("s-bim-fundamentals-4", 91, "bim-fundamentals-revit", "BIM Fundamentals live session: Schedules and sheets", "A live class with the instructor on schedules and sheets. Bring a laptop with Revit installed."),
  {
    id: "w-portfolio",
    title: "Portfolio review clinic",
    type: "workshop",
    start: at(96, "10:00"),
    end: at(96, "12:00"),
    program: "vdc-professional-bootcamp",
    format: "Live online",
    description: "A working session on how to present BIM and VDC projects in a portfolio, with time to ask about yours.",
  },
  cohort("c-bootcamp", 98, "vdc-professional-bootcamp", "VDC Professional Bootcamp", "Hybrid", "The first session of the VDC Professional Bootcamp: the learning path, the capstone and how the weeks are organised."),
  live("s-bootcamp-2", 105, "vdc-professional-bootcamp", "VDC Professional Bootcamp live session: BIM concepts and workflows", "A live class with the instructor on BIM concepts and workflows."),
];
