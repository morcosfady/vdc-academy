// Calendar helpers. Pure functions over CalendarEvent (content/calendar.ts), plus loadEvents(), the one place the
// event list comes from. Everything is computed in Central Time (America/Chicago). Date and time text is built from
// numbers and fixed word lists, not from Intl strings, so the server render and the browser always print the same text.
import { SITE_URL } from "@/config/site";
import { sampleEvents, type CalendarEvent, type CalendarEventType } from "@/content/calendar";
import { calendarCopy as copy } from "@/content/copy-calendar";
import { programs } from "@/content/programs";

export const CAL_TZ = "America/Chicago";
export const TZ_LABEL = "CT";
export const TYPE_ORDER: CalendarEventType[] = ["session", "info", "workshop", "deadline", "cohort"];

export type TypeFilter = "all" | CalendarEventType;
export type Filters = { type: TypeFilter; program: string };

const pad = (n: number, w = 2) => String(n).padStart(w, "0");
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// ---------------------------------------------------------------- loading

// The one place events come from. Today it returns the sample.
export async function loadEvents(): Promise<CalendarEvent[]> {
  // TODO(admin dashboard): when the `calendar_events` table exists, select the published rows from Supabase here
  // (getSupabase() in lib/supabase.ts, ordered by start), map them to CalendarEvent, and fall back to the sample when
  // the client is not configured or the request fails. Nothing else in the calendar needs to change.
  return sampleEvents;
}

// ---------------------------------------------------------------- Central Time

export type Wall = { y: number; mo: number; d: number; h: number; mi: number };

const wallFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: CAL_TZ,
  hourCycle: "h23",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

function wallFromMs(ms: number): Wall & { s: number } {
  const o: Record<string, number> = {};
  for (const p of wallFmt.formatToParts(ms)) if (p.type !== "literal") o[p.type] = Number(p.value);
  return { y: o.year, mo: o.month, d: o.day, h: o.hour % 24, mi: o.minute, s: o.second };
}

// Central Time offset from UTC at an instant, in ms (negative: CST is -6h, CDT is -5h).
function offsetMs(ms: number): number {
  const w = wallFromMs(ms);
  return Date.UTC(w.y, w.mo - 1, w.d, w.h, w.mi, w.s) - Math.floor(ms / 1000) * 1000;
}

function wallToMs(w: Wall): number {
  const guess = Date.UTC(w.y, w.mo - 1, w.d, w.h, w.mi);
  let t = guess - offsetMs(guess);
  t = guess - offsetMs(t);
  return t;
}

export const dayKeyOf = (w: Pick<Wall, "y" | "mo" | "d">) => `${w.y}-${pad(w.mo)}-${pad(w.d)}`;
export const todayKey = (nowMs: number) => dayKeyOf(wallFromMs(nowMs));

function parseDay(key: string) {
  const [y, mo, d] = key.split("-").map(Number);
  return { y, mo, d };
}

export function addDays(key: string, n: number): string {
  const { y, mo, d } = parseDay(key);
  const t = new Date(Date.UTC(y, mo - 1, d + n));
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}

export const weekdayIndex = (key: string) => {
  const { y, mo, d } = parseDay(key);
  return new Date(Date.UTC(y, mo - 1, d)).getUTCDay();
};

// ---------------------------------------------------------------- resolving events

// "2026-11-03T18:30" and "2026-11-03" are Central Time wall clock. Anything else ("...Z", "...-06:00") is a real instant.
const WALL_RE = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::\d{2}(?:\.\d+)?)?)?$/;

type Parsed = { ms: number; wall: Wall; dateOnly: boolean };

function parseTime(iso: string): Parsed | null {
  const m = WALL_RE.exec(iso);
  if (m) {
    const wall = { y: +m[1], mo: +m[2], d: +m[3], h: m[4] ? +m[4] : 0, mi: m[5] ? +m[5] : 0 };
    return { wall, ms: wallToMs(wall), dateOnly: !m[4] };
  }
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return null;
  const { s: _s, ...wall } = wallFromMs(ms);
  void _s;
  return { ms, wall, dateOnly: false };
}

export type Resolved = {
  allDay: boolean;
  day: string; // Central Time day of the start, "YYYY-MM-DD"
  endDay: string;
  startMs: number;
  endMs: number; // exclusive for all-day events
  start: Wall;
  end: Wall | null;
};

const cache = new WeakMap<CalendarEvent, Resolved | null>();

export function resolve(e: CalendarEvent): Resolved | null {
  if (cache.has(e)) return cache.get(e) ?? null;
  const s = parseTime(e.start);
  let out: Resolved | null = null;
  if (s) {
    const allDay = Boolean(e.allDay) || s.dateOnly;
    const day = dayKeyOf(s.wall);
    const en = e.end ? parseTime(e.end) : null;
    if (allDay) {
      const endDay = en && dayKeyOf(en.wall) > day ? dayKeyOf(en.wall) : day;
      const next = addDays(endDay, 1);
      const { y, mo, d } = parseDay(next);
      out = { allDay, day, endDay, startMs: wallToMs({ ...s.wall, h: 0, mi: 0 }), endMs: wallToMs({ y, mo, d, h: 0, mi: 0 }), start: { ...s.wall, h: 0, mi: 0 }, end: null };
    } else {
      const endMs = en && en.ms > s.ms ? en.ms : s.ms + 60 * 60 * 1000;
      const end = en && en.ms > s.ms ? en.wall : null;
      out = { allDay, day, endDay: end ? dayKeyOf(end) : day, startMs: s.ms, endMs, start: s.wall, end };
    }
  }
  cache.set(e, out);
  return out;
}

export function compareEvents(a: CalendarEvent, b: CalendarEvent): number {
  const x = resolve(a);
  const y = resolve(b);
  if (!x || !y) return 0;
  if (x.day !== y.day) return x.day < y.day ? -1 : 1;
  if (x.allDay !== y.allDay) return x.allDay ? -1 : 1;
  return x.startMs - y.startMs || a.title.localeCompare(b.title);
}

// Valid events only, in date order.
export function sortEvents(events: CalendarEvent[]): CalendarEvent[] {
  return events.filter((e) => resolve(e)).sort(compareEvents);
}

export function groupByDay(events: CalendarEvent[]): Map<string, CalendarEvent[]> {
  const map = new Map<string, CalendarEvent[]>();
  for (const e of sortEvents(events)) {
    const day = resolve(e)!.day;
    const list = map.get(day);
    if (list) list.push(e);
    else map.set(day, [e]);
  }
  return map;
}

export function filterEvents(events: CalendarEvent[], f: Filters): CalendarEvent[] {
  return events.filter((e) => (f.type === "all" || e.type === f.type) && (f.program === "all" || e.program === f.program));
}

// Events that have not ended yet, soonest first.
export function upcoming(events: CalendarEvent[], nowMs: number, n: number): CalendarEvent[] {
  return sortEvents(events)
    .filter((e) => resolve(e)!.endMs > nowMs)
    .slice(0, n);
}

export function programOptions(events: CalendarEvent[]): { slug: string; title: string }[] {
  const used = new Set(events.map((e) => e.program).filter(Boolean));
  return programs.filter((p) => used.has(p.slug)).map((p) => ({ slug: p.slug, title: p.title }));
}

export const programTitle = (slug?: string) => programs.find((p) => p.slug === slug)?.title;

export const isEventType = (v: string | null): v is CalendarEventType => TYPE_ORDER.includes(v as CalendarEventType);

// ---------------------------------------------------------------- months

export const isMonthKey = (v: string | null): v is string => !!v && /^\d{4}-(0[1-9]|1[0-2])$/.test(v);
export const monthOf = (day: string) => day.slice(0, 7);

export function shiftMonth(ym: string, n: number): string {
  const [y, m] = ym.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1 + n, 1));
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}`;
}

export function monthLabel(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  return `${MONTHS[m - 1]} ${y}`;
}

// Weeks (Sunday first) of day keys. "" marks a cell outside the month.
export function monthGrid(ym: string): string[][] {
  const [y, m] = ym.split("-").map(Number);
  const count = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const lead = weekdayIndex(`${ym}-01`);
  const cells: string[] = [...Array<string>(lead).fill(""), ...Array.from({ length: count }, (_, i) => `${ym}-${pad(i + 1)}`)];
  while (cells.length % 7) cells.push("");
  return Array.from({ length: cells.length / 7 }, (_, i) => cells.slice(i * 7, i * 7 + 7));
}

export const eventsInMonth = (events: CalendarEvent[], ym: string) => sortEvents(events).filter((e) => monthOf(resolve(e)!.day) === ym);

export function shiftDayByMonth(day: string, n: number): string {
  const ym = shiftMonth(monthOf(day), n);
  const [y, m] = ym.split("-").map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return `${ym}-${pad(Math.min(parseDay(day).d, last))}`;
}

// ---------------------------------------------------------------- text

export const weekdayName = (day: string) => DAYS[weekdayIndex(day)];

export function formatDay(day: string, style: "long" | "short" | "date" = "long"): string {
  const { y, mo, d } = parseDay(day);
  const wd = DAYS[weekdayIndex(day)];
  if (style === "short") return `${wd.slice(0, 3)}, ${MONTHS[mo - 1].slice(0, 3)} ${d}`;
  if (style === "date") return `${MONTHS[mo - 1]} ${d}`;
  return `${wd}, ${MONTHS[mo - 1]} ${d}, ${y}`;
}

export function clock(w: Pick<Wall, "h" | "mi">): string {
  const h12 = w.h % 12 || 12;
  return `${h12}:${pad(w.mi)} ${w.h < 12 ? "AM" : "PM"}`;
}

// "6:30p", "10a" or "" for all-day events (cell pills)
export function timeCompact(e: CalendarEvent): string {
  const r = resolve(e);
  if (!r || r.allDay) return "";
  const h12 = r.start.h % 12 || 12;
  return `${h12}${r.start.mi ? `:${pad(r.start.mi)}` : ""}${r.start.h < 12 ? "a" : "p"}`;
}

// "6:30 PM" or "All day"
export function timeShort(e: CalendarEvent): string {
  const r = resolve(e);
  if (!r) return "";
  return r.allDay ? copy.event.allDay : clock(r.start);
}

// "6:30 PM to 8:30 PM CT", "6:30 PM CT" or "All day"
export function timeRange(e: CalendarEvent): string {
  const r = resolve(e);
  if (!r) return "";
  if (r.allDay) return copy.event.allDay;
  if (!r.end) return `${clock(r.start)} ${TZ_LABEL}`;
  if (r.endDay !== r.day) return `${clock(r.start)} to ${formatDay(r.endDay, "short")}, ${clock(r.end)} ${TZ_LABEL}`;
  return `${clock(r.start)} to ${clock(r.end)} ${TZ_LABEL}`;
}

export const eventDay = (e: CalendarEvent) => resolve(e)?.day ?? "";

// Where text: "Live online", "On site, Dallas Fort Worth", "Hybrid" and the optional location. Deadlines have no place.
export function whereText(e: CalendarEvent): string {
  if (e.type === "deadline") return "";
  return e.location ? `${e.format}. ${e.location}` : e.format;
}

export function ctaFor(e: CalendarEvent): { label: string; href: string } {
  if (e.link) return e.link;
  return e.type === "deadline" || e.type === "cohort" ? { label: copy.event.apply, href: "/apply/" } : { label: copy.event.ask, href: "/contact/" };
}

// ---------------------------------------------------------------- .ics and Google Calendar

const icsEscape = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
const utcStamp = (ms: number) => new Date(ms).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const dateStamp = (day: string) => day.replace(/-/g, "");
const absolute = (href: string) => (href.startsWith("/") ? `${SITE_URL}${href}` : href);

// Content lines are folded at 75 octets, continuation lines start with a space (RFC 5545).
function fold(line: string): string {
  const enc = new TextEncoder();
  if (enc.encode(line).length <= 75) return line;
  const out: string[] = [];
  let cur = "";
  let bytes = 0;
  let limit = 75;
  for (const ch of line) {
    const n = enc.encode(ch).length;
    if (bytes + n > limit) {
      out.push(cur);
      cur = "";
      bytes = 0;
      limit = 74;
    }
    cur += ch;
    bytes += n;
  }
  out.push(cur);
  return out.join("\r\n ");
}

function description(e: CalendarEvent, sample: boolean): string {
  const parts = [e.description];
  if (e.link) parts.push(`${e.link.label}: ${absolute(e.link.href)}`);
  parts.push(`${SITE_URL}/calendar/`);
  if (sample) parts.unshift(copy.add.sampleNote);
  return parts.join("\n\n");
}

function locationOf(e: CalendarEvent): string {
  if (e.type === "deadline") return "";
  return e.location ?? (e.format === "Live online" ? "Online" : e.format);
}

function vevent(e: CalendarEvent, stampMs: number, sample: boolean): string[] {
  const r = resolve(e)!;
  const lines = ["BEGIN:VEVENT", `UID:${e.id}@vdc-academy`, `DTSTAMP:${utcStamp(stampMs)}`];
  if (r.allDay) lines.push(`DTSTART;VALUE=DATE:${dateStamp(r.day)}`, `DTEND;VALUE=DATE:${dateStamp(addDays(r.endDay, 1))}`);
  else lines.push(`DTSTART:${utcStamp(r.startMs)}`, `DTEND:${utcStamp(r.endMs)}`);
  lines.push(`SUMMARY:${icsEscape(e.title)}`, `DESCRIPTION:${icsEscape(description(e, sample))}`);
  const place = locationOf(e);
  if (place) lines.push(`LOCATION:${icsEscape(place)}`);
  lines.push(`CATEGORIES:${icsEscape(copy.types[e.type].label)}`, "END:VEVENT");
  return lines;
}

// A calendar file for one or many events. `sample` adds a "this date is an example" note to each description.
export function eventsToIcs(events: CalendarEvent[], opts: { sample?: boolean; nowMs?: number } = {}): string {
  const stamp = opts.nowMs ?? Date.now();
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//VDC Academy//Calendar//EN",
    "CALSCALE:GREGORIAN",
    "X-WR-CALNAME:VDC Academy",
    `X-WR-TIMEZONE:${CAL_TZ}`,
    ...sortEvents(events).flatMap((e) => vevent(e, stamp, Boolean(opts.sample))),
    "END:VCALENDAR",
  ];
  return lines.map(fold).join("\r\n") + "\r\n";
}

export const eventToIcs = (e: CalendarEvent, opts: { sample?: boolean; nowMs?: number } = {}) => eventsToIcs([e], opts);

export function googleCalendarUrl(e: CalendarEvent, sample = false): string {
  const r = resolve(e);
  const dates = !r ? "" : r.allDay ? `${dateStamp(r.day)}/${dateStamp(addDays(r.endDay, 1))}` : `${utcStamp(r.startMs)}/${utcStamp(r.endMs)}`;
  const q = new URLSearchParams({ action: "TEMPLATE", text: e.title, dates, details: description(e, sample), ctz: CAL_TZ });
  const place = locationOf(e);
  if (place) q.set("location", place);
  return `https://calendar.google.com/calendar/render?${q.toString()}`;
}

// ---------------------------------------------------------------- structured data

function offsetText(ms: number): string {
  const min = Math.round(offsetMs(ms) / 60000);
  const a = Math.abs(min);
  return `${min < 0 ? "-" : "+"}${pad(Math.floor(a / 60))}:${pad(a % 60)}`;
}

const isoLocal = (w: Wall, ms: number) => `${dayKeyOf(w)}T${pad(w.h)}:${pad(w.mi)}:00${offsetText(ms)}`;

// schema.org Event for one calendar event. Use only when real dates are published (CALENDAR_IS_SAMPLE is false).
export function eventLd(e: CalendarEvent) {
  const r = resolve(e)!;
  const online = e.format === "Live online";
  const place = { "@type": "Place", name: e.location ?? "Dallas Fort Worth", address: { "@type": "PostalAddress", addressLocality: "Dallas Fort Worth", addressRegion: "TX", addressCountry: "US" } };
  const virtual = { "@type": "VirtualLocation", url: `${SITE_URL}/calendar/` };
  return {
    "@context": "https://schema.org",
    "@type": "Event",
    name: e.title,
    description: e.description,
    startDate: r.allDay ? r.day : isoLocal(r.start, r.startMs),
    endDate: r.allDay ? r.endDay : isoLocal(r.end ?? wallFromMs(r.endMs), r.endMs),
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: online ? "https://schema.org/OnlineEventAttendanceMode" : e.format === "Hybrid" ? "https://schema.org/MixedEventAttendanceMode" : "https://schema.org/OfflineEventAttendanceMode",
    location: online ? virtual : e.format === "Hybrid" ? [place, virtual] : place,
    organizer: { "@type": "EducationalOrganization", name: "VDC Academy", url: `${SITE_URL}/` },
    url: `${SITE_URL}/calendar/`,
  };
}
