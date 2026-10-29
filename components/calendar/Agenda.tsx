"use client";

import { useId } from "react";
import type { CalendarEvent } from "@/content/calendar";
import { calendarCopy as copy } from "@/content/copy-calendar";
import { formatDay, monthLabel, timeShort } from "@/lib/calendar";
import { cn } from "@/lib/utils";
import { AddToCalendar } from "./AddToCalendar";
import { TypeTag } from "./parts";

const rule = { borderColor: "var(--rule)" } as const;

// Agenda: a plain list grouped by date. The default on phones and the accessible alternative to the grid.
export function Agenda({
  ym,
  byDay,
  today,
  onOpenEvent,
  className,
}: {
  ym: string;
  byDay: Map<string, CalendarEvent[]>;
  today: string | null;
  onOpenEvent: (event: CalendarEvent, trigger: HTMLElement) => void;
  className?: string;
}) {
  const uid = useId();
  const days = [...byDay.keys()].sort();
  return (
    <div role="region" aria-label={copy.agenda.label(monthLabel(ym))} data-testid="agenda" className={cn("border-t", className)} style={rule}>
      {days.map((day) => (
        <section key={day} aria-labelledby={`${uid}-${day}`} className="grid gap-x-8 border-b py-5 md:grid-cols-[11rem_1fr]" style={rule}>
          <h3 id={`${uid}-${day}`} className="mono !text-[12px] md:pt-3">
            <span className={day === today ? "!text-text" : undefined}>{formatDay(day, "short")}</span>
            {day === today && <span className="ms-2 rounded-[3px] px-1.5 py-0.5 !text-text" style={{ background: "rgba(184,146,90,0.22)" }}>{copy.agenda.today}</span>}
          </h3>
          <ul className="mt-2 md:mt-0">
            {byDay.get(day)!.map((e, i) => (
              <li
                key={e.id}
                data-testid="agenda-row"
                data-type={e.type}
                data-program={e.program ?? ""}
                className={cn("grid grid-cols-[5.5rem_1fr] gap-x-3 gap-y-2 py-3 sm:grid-cols-[5.5rem_1fr_auto] sm:items-start", i > 0 && "border-t")}
                style={rule}
              >
                <p className="mono whitespace-nowrap pt-1 !text-text">{timeShort(e)}</p>
                <div className="min-w-0">
                  <button
                    type="button"
                    onClick={(ev) => onOpenEvent(e, ev.currentTarget)}
                    className="min-h-11 text-start text-[17px] font-medium leading-snug text-text hover:text-accent-text sm:min-h-0 sm:py-0.5"
                  >
                    {e.title}
                  </button>
                  <p className="t-small mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-muted">
                    <span className="inline-flex items-center gap-2">
                      <TypeTag type={e.type} />
                      {copy.types[e.type].label}
                    </span>
                    {e.type !== "deadline" && <span>{e.format}</span>}
                  </p>
                </div>
                <div className="col-start-2 sm:col-start-3">
                  <AddToCalendar event={e} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
