"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { CALENDAR_IS_SAMPLE, SAMPLE_BASE, type CalendarEvent } from "@/content/calendar";
import { calendarCopy as copy } from "@/content/copy-calendar";
import { Chip } from "@/components/ds/Chips";
import { SegmentedControl } from "@/components/ds/Controls";
import { Drawer, Modal } from "@/components/ds/Overlays";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import {
  TYPE_ORDER,
  eventDay,
  eventsInMonth,
  filterEvents,
  formatDay,
  groupByDay,
  isEventType,
  isMonthKey,
  monthLabel,
  monthOf,
  programOptions,
  shiftMonth,
  todayKey,
  upcoming,
  type TypeFilter,
} from "@/lib/calendar";
import { Agenda } from "./Agenda";
import { downloadAllIcs } from "./AddToCalendar";
import { EventBody } from "./EventBody";
import { MonthGrid } from "./MonthGrid";
import { NextUp } from "./NextUp";
import { TypeTag, useEvents } from "./parts";

type View = "month" | "agenda";
const rule = { borderColor: "var(--rule)" } as const;

// The public calendar. Server and browser render the same first frame (the sample month, no "today", both views),
// then one effect reads the date, the address query (?m=2026-11&type=workshop&program=revit-mep&view=agenda) and the
// screen width. The query holds only these choices, never personal data.
export function CalendarView() {
  const events = useEvents();
  const programId = useId();
  const [nowMs, setNowMs] = useState<number | null>(null);
  const [ym, setYm] = useState(monthOf(SAMPLE_BASE));
  const [type, setType] = useState<TypeFilter>("all");
  const [program, setProgram] = useState("all");
  const [view, setView] = useState<View | null>(null);
  const [viewChosen, setViewChosen] = useState(false);
  const [ready, setReady] = useState(false);
  const [focusDay, setFocusDay] = useState<string | null>(null);
  const [selected, setSelected] = useState<CalendarEvent | null>(null);
  const [dayOpen, setDayOpen] = useState<string | null>(null);
  const opener = useRef<HTMLElement | null>(null);
  const dayRefs = useRef(new Map<string, HTMLButtonElement>());
  const pendingFocus = useRef(false);

  const programs = useMemo(() => programOptions(events), [events]);
  const filtered = useMemo(() => filterEvents(events, { type, program }), [events, type, program]);
  const byDayAll = useMemo(() => groupByDay(filtered), [filtered]);
  const monthEvents = useMemo(() => eventsInMonth(filtered, ym), [filtered, ym]);
  const byDay = useMemo(() => groupByDay(monthEvents), [monthEvents]);
  const today = nowMs === null ? null : todayKey(nowMs);
  const nextItems = useMemo(() => (nowMs === null ? null : upcoming(filtered, nowMs, 3)), [filtered, nowMs]);

  // First frame in the browser: date, address query, screen width.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const t = q.get("type");
    const p = q.get("program");
    const v = q.get("view");
    const m = q.get("m");
    const nextType: TypeFilter = isEventType(t) ? t : "all";
    const nextProgram = p && programOptions(events).some((o) => o.slug === p) ? p : "all";
    const now = Date.now();
    const first = upcoming(filterEvents(events, { type: nextType, program: nextProgram }), now, 1)[0];
    const chosen = v === "month" || v === "agenda";
    const preset: View = v === "agenda" ? "agenda" : "month";
    setNowMs(now);
    setType(nextType);
    setProgram(nextProgram);
    setYm(isMonthKey(m) ? m : first ? monthOf(eventDay(first)) : monthOf(todayKey(now)));
    setView(chosen ? preset : window.matchMedia("(max-width: 767px)").matches ? "agenda" : "month");
    setViewChosen(chosen);
    setReady(true);
    // Run once. `events` is the sample here; a later list from loadEvents() does not move the page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the address in step with the choices (no new history entries).
  useEffect(() => {
    if (!ready) return;
    const q = new URLSearchParams({ m: ym });
    if (type !== "all") q.set("type", type);
    if (program !== "all") q.set("program", program);
    if (viewChosen && view) q.set("view", view);
    window.history.replaceState(null, "", `${window.location.pathname}?${q.toString()}${window.location.hash}`);
  }, [ready, ym, type, program, view, viewChosen]);

  // The day that holds the grid's one tab stop.
  const fallbackDay = today && monthOf(today) === ym ? today : ([...byDay.keys()].sort()[0] ?? `${ym}-01`);
  const activeDay = focusDay && monthOf(focusDay) === ym ? focusDay : fallbackDay;

  useEffect(() => {
    if (!pendingFocus.current) return;
    pendingFocus.current = false;
    dayRefs.current.get(activeDay)?.focus();
  });

  const dayRef = (day: string) => (el: HTMLButtonElement | null) => {
    if (el) dayRefs.current.set(day, el);
    else dayRefs.current.delete(day);
  };

  function move(day: string) {
    pendingFocus.current = true;
    setFocusDay(day);
    if (monthOf(day) !== ym) setYm(monthOf(day));
  }

  function goMonth(n: number) {
    setYm(shiftMonth(ym, n));
    setFocusDay(null);
  }

  function goToday() {
    const now = Date.now();
    setNowMs(now);
    setYm(monthOf(todayKey(now)));
    setFocusDay(null);
  }

  function openEvent(e: CalendarEvent, trigger: HTMLElement) {
    opener.current = trigger;
    setSelected(e);
  }

  function openDay(day: string, trigger: HTMLElement) {
    opener.current = trigger;
    setDayOpen(day);
  }

  // Native dialogs return focus on their own in most browsers; do it by hand so Safari behaves the same.
  function restoreFocus() {
    const el = opener.current;
    window.requestAnimationFrame(() => {
      if (el?.isConnected) el.focus();
    });
  }

  function chooseView(v: View) {
    setView(v);
    setViewChosen(true);
  }

  const filtersOn = type !== "all" || program !== "all";
  const later = filtered.map((e) => eventDay(e)).filter((d) => monthOf(d) > ym).sort()[0];
  const gridEl = <MonthGrid ym={ym} byDay={byDay} today={today} activeDay={activeDay} dayRef={dayRef} onActive={setFocusDay} onMove={move} onOpenDay={openDay} onOpenEvent={openEvent} />;
  const agendaEl = <Agenda ym={ym} byDay={byDay} today={today} onOpenEvent={openEvent} />;

  return (
    <div data-testid="calendar" data-ready={ready ? "true" : "false"}>
      {CALENDAR_IS_SAMPLE && (
        <div role="note" data-testid="sample-banner" className="border border-s-[3px] bg-[var(--surface)] px-5 py-4 md:px-6" style={{ ...rule, borderInlineStartColor: "var(--brass)" }}>
          <p className="text-[15px] leading-relaxed text-text">
            <strong className="font-semibold">{copy.sampleBanner.title}</strong> {copy.sampleBanner.text}
          </p>
        </div>
      )}

      <div className="mt-10">
        <NextUp items={nextItems} onOpen={openEvent} />
      </div>

      <div className="mt-12 flex flex-wrap items-center justify-between gap-x-6 gap-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <NavButton label={copy.nav.prev} onClick={() => goMonth(-1)} dir="prev" />
          <h2 data-testid="month-label" className="t-h3 min-w-[10.5rem] px-1 text-center">
            {monthLabel(ym)}
          </h2>
          <NavButton label={copy.nav.next} onClick={() => goMonth(1)} dir="next" />
          <Button variant="secondary" onClick={goToday} className="!h-11 !px-4">
            {copy.nav.today}
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <SegmentedControl label={copy.nav.view} value={view ?? "month"} onChange={(id) => chooseView(id as View)} options={[{ id: "month", label: copy.nav.month }, { id: "agenda", label: copy.nav.agenda }]} />
          <Button variant="secondary" onClick={() => downloadAllIcs(filtered)} disabled={filtered.length === 0} className="!h-11 !px-4" data-testid="download-all">
            {filtered.length ? copy.add.all(filtered.length) : copy.add.allNone}
          </Button>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div role="group" aria-label={copy.filters.label} className="flex flex-wrap gap-2">
          <Chip active={type === "all"} onClick={() => setType("all")}>
            {copy.filters.all}
          </Chip>
          {TYPE_ORDER.map((t) => (
            <Chip key={t} active={type === t} onClick={() => setType(t)} className="gap-2.5 !px-3.5">
              <TypeTag type={t} className={type === t ? "!border-white" : undefined} />
              {copy.types[t].plural}
            </Chip>
          ))}
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={programId} className="mono">
            {copy.filters.program}
          </label>
          <span className="relative block">
            <select
              id={programId}
              value={program}
              onChange={(e) => setProgram(e.target.value)}
              className="h-11 w-full min-w-[16rem] appearance-none rounded-[4px] border bg-transparent ps-4 pe-10 text-[15px] text-text outline-none transition-colors duration-200 hover:border-[color:var(--text-dim)] focus:border-accent"
              style={rule}
            >
              <option value="all" className="bg-white text-ink">
                {copy.filters.allPrograms}
              </option>
              {programs.map((p) => (
                <option key={p.slug} value={p.slug} className="bg-white text-ink">
                  {p.title}
                </option>
              ))}
            </select>
            <svg aria-hidden width="12" height="8" viewBox="0 0 12 8" className="pointer-events-none absolute end-4 top-[18px] text-dim">
              <path d="M1 1l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </span>
        </div>
      </div>

      <p role="status" aria-live="polite" className="sr-only">
        {copy.status(monthLabel(ym), monthEvents.length)}
      </p>

      <div className="mt-8">
        {view === null ? (
          <>
            <div className="max-md:hidden">{gridEl}</div>
            <div className="md:hidden">{agendaEl}</div>
          </>
        ) : view === "month" ? (
          gridEl
        ) : monthEvents.length > 0 ? (
          agendaEl
        ) : null}
        {monthEvents.length === 0 && (
          <EmptyMonth
            filtersOn={filtersOn}
            canJump={Boolean(later)}
            onJump={() => later && setYm(monthOf(later))}
            onClear={() => {
              setType("all");
              setProgram("all");
            }}
            className={view === "agenda" ? "" : "mt-6"}
          />
        )}
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
        <ul aria-label={copy.filters.legend} className="flex flex-wrap gap-x-6 gap-y-3 text-[14px] text-muted">
          {TYPE_ORDER.map((t) => (
            <li key={t} className="inline-flex items-center gap-2">
              <TypeTag type={t} />
              {copy.types[t].label}
            </li>
          ))}
        </ul>
        <p className="mono">{copy.timeZoneNote}</p>
      </div>

      <Modal
        open={selected !== null}
        onClose={() => {
          setSelected(null);
          restoreFocus();
        }}
        title={selected?.title ?? ""}
      >
        {selected && <EventBody event={selected} />}
      </Modal>

      <Drawer
        open={dayOpen !== null}
        onClose={() => {
          setDayOpen(null);
          restoreFocus();
        }}
        title={dayOpen ? formatDay(dayOpen) : ""}
      >
        {dayOpen && (
          <ul className="grid gap-9">
            {(byDayAll.get(dayOpen) ?? []).map((e) => (
              <li key={e.id}>
                <EventBody event={e} showTitle />
              </li>
            ))}
          </ul>
        )}
      </Drawer>
    </div>
  );
}

function NavButton({ label, onClick, dir }: { label: string; onClick: () => void; dir: "prev" | "next" }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="grid size-11 place-items-center rounded-[8px] border text-text transition-colors duration-200 hover:border-accent hover:text-accent-text"
      style={{ borderColor: "color-mix(in srgb, var(--text) 35%, transparent)" }}
    >
      <svg aria-hidden width="9" height="14" viewBox="0 0 9 14">
        <path d={dir === "prev" ? "M8 1 2 7l6 6" : "M1 1l6 6-6 6"} fill="none" stroke="currentColor" strokeWidth="1.6" />
      </svg>
    </button>
  );
}

// Empty month: a small line drawing of a calendar page and a way forward.
function EmptyMonth({ filtersOn, canJump, onJump, onClear, className }: { filtersOn: boolean; canJump: boolean; onJump: () => void; onClear: () => void; className?: string }) {
  return (
    <div data-testid="calendar-empty" className={cn("flex flex-col items-start gap-6 border p-7 md:flex-row md:items-center md:gap-10 md:p-10", className)} style={rule}>
      <svg aria-hidden width="132" height="108" viewBox="0 0 132 108" className="shrink-0 text-slate">
        <rect x="6" y="14" width="120" height="88" rx="3" fill="none" stroke="currentColor" strokeWidth="1.2" />
        <path d="M6 36h120M34 4v20M98 4v20" fill="none" stroke="currentColor" strokeWidth="1.2" />
        <path d="M22 52h16M50 52h16M78 52h16M22 68h16M50 68h16M22 84h16" fill="none" stroke="currentColor" strokeWidth="1.2" strokeDasharray="2 3" />
        <circle cx="102" cy="82" r="11" fill="none" stroke="var(--brass)" strokeWidth="1.5" />
        <path d="M97 82h10" stroke="var(--brass)" strokeWidth="1.5" />
      </svg>
      <div>
        <h3 className="t-h3">{copy.empty.title}</h3>
        <p className="t-small mt-2 max-w-[44ch] text-muted">{filtersOn ? copy.empty.textFiltered : copy.empty.text}</p>
        <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
          {canJump && (
            <Button onClick={onJump} className="!h-11 !px-5">
              {copy.empty.jump}
            </Button>
          )}
          {filtersOn && (
            <button type="button" onClick={onClear} className="ul-draw min-h-11 pb-0.5 text-[15px] text-text hover:text-accent-text">
              {copy.empty.clear}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
