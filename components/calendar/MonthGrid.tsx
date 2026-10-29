"use client";

import type { CalendarEvent } from "@/content/calendar";
import { calendarCopy as copy } from "@/content/copy-calendar";
import { addDays, formatDay, monthGrid, monthLabel, shiftDayByMonth, timeCompact, timeShort, weekdayIndex } from "@/lib/calendar";
import { cn } from "@/lib/utils";
import { TypeTag } from "./parts";

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MAX_PILLS = 3;
const rule = { borderColor: "var(--rule)" } as const;

type Props = {
  ym: string;
  byDay: Map<string, CalendarEvent[]>;
  today: string | null;
  activeDay: string;
  dayRef: (day: string) => (el: HTMLButtonElement | null) => void;
  onActive: (day: string) => void;
  onMove: (day: string) => void;
  onOpenDay: (day: string, trigger: HTMLElement) => void;
  onOpenEvent: (event: CalendarEvent, trigger: HTMLElement) => void;
  className?: string;
};

// Month grid, weeks start on Sunday. role="grid": one tab stop (the active day), arrow keys move by day and week,
// Home and End go to the start and end of the week, Page Up and Page Down change month. Enter opens the day panel.
// Event pills are for the pointer; the day panel lists the same events for the keyboard.
export function MonthGrid({ ym, byDay, today, activeDay, dayRef, onActive, onMove, onOpenDay, onOpenEvent, className }: Props) {
  const weeks = monthGrid(ym);

  function key(e: React.KeyboardEvent, day: string) {
    const step: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    let next: string | null = null;
    if (e.key in step) next = addDays(day, step[e.key]);
    else if (e.key === "Home") next = addDays(day, -weekdayIndex(day));
    else if (e.key === "End") next = addDays(day, 6 - weekdayIndex(day));
    else if (e.key === "PageUp") next = shiftDayByMonth(day, -1);
    else if (e.key === "PageDown") next = shiftDayByMonth(day, 1);
    if (next) {
      e.preventDefault();
      onMove(next);
    }
  }

  return (
    <div role="grid" aria-label={copy.grid.label(monthLabel(ym))} className={cn("border-s border-t", className)} style={rule}>
      <div role="row" className="grid grid-cols-7">
        {WEEKDAYS.map((d) => (
          <div key={d} role="columnheader" className="mono border-b border-e py-2 text-center" style={rule}>
            <span className="sr-only">{d}</span>
            <span aria-hidden className="md:hidden">
              {d[0]}
            </span>
            <span aria-hidden className="hidden md:inline">
              {d.slice(0, 3)}
            </span>
          </div>
        ))}
      </div>
      {weeks.map((week, wi) => (
        <div key={wi} role="row" className="grid grid-cols-7">
          {week.map((day, di) => {
            if (!day) return <div key={`x${wi}-${di}`} role="gridcell" aria-hidden className="min-h-[60px] border-b border-e md:min-h-[120px]" style={{ ...rule, background: "var(--bg-2)", opacity: 0.55 }} />;
            const list = byDay.get(day) ?? [];
            const isToday = day === today;
            const shown = list.slice(0, MAX_PILLS);
            const more = list.length - shown.length;
            return (
              <div
                key={day}
                role="gridcell"
                data-day={day}
                data-today={isToday ? "true" : undefined}
                className="relative flex min-h-[60px] flex-col gap-1 border-b border-e bg-[var(--surface)] p-1 md:min-h-[120px] md:gap-1.5 md:p-2"
                style={{ ...rule, ...(isToday ? { boxShadow: "inset 0 0 0 2px var(--brass)" } : {}) }}
              >
                {/* The day number is the cell's button; its ::after stretches over the cell so a click anywhere opens the day. */}
                <button
                  ref={dayRef(day)}
                  type="button"
                  tabIndex={day === activeDay ? 0 : -1}
                  aria-label={copy.grid.dayLabel(formatDay(day), list.length, isToday)}
                  data-testid="cal-day"
                  data-day={day}
                  onFocus={() => onActive(day)}
                  onKeyDown={(e) => key(e, day)}
                  onClick={(e) => list.length && onOpenDay(day, e.currentTarget)}
                  className={cn(
                    "mono inline-grid size-7 place-items-center self-start rounded-full !text-[13px] after:absolute after:inset-0 after:z-0 after:content-[''] md:!text-[14px]",
                    isToday ? "!bg-ink !text-white" : list.length ? "!text-text" : "!text-dim",
                    list.length ? "cursor-pointer hover:!bg-[var(--mist)] hover:!text-ink" : "cursor-default",
                  )}
                  style={isToday ? { background: "var(--ink)" } : undefined}
                >
                  {Number(day.slice(8))}
                </button>
                {list.length > 0 && (
                  <ul className="relative z-10 flex flex-wrap gap-0.5 md:flex-col md:flex-nowrap md:gap-1">
                    {shown.map((e) => (
                      <li key={e.id} className="md:w-full">
                        <button
                          type="button"
                          tabIndex={-1}
                          data-testid="cal-pill"
                          data-type={e.type}
                          data-program={e.program ?? ""}
                          aria-label={`${copy.types[e.type].label}, ${timeShort(e)}, ${e.title}`}
                          onClick={(ev) => onOpenEvent(e, ev.currentTarget)}
                          className="flex w-full items-center gap-1.5 rounded-[4px] p-0.5 text-start text-[12px] leading-none text-ink transition-colors duration-200 hover:brightness-95 md:h-6 md:px-1"
                          style={{ background: e.type === "deadline" ? "rgba(184,146,90,0.18)" : "var(--mist)" }}
                        >
                          <TypeTag type={e.type} />
                          <span className="hidden min-w-0 flex-1 truncate md:block">
                            <span className="hidden text-[#1c4a96] xl:inline">{timeCompact(e) ? `${timeCompact(e)} ` : ""}</span>
                            {e.title}
                          </span>
                        </button>
                      </li>
                    ))}
                    {more > 0 && (
                      <li className="md:w-full">
                        <button
                          type="button"
                          tabIndex={-1}
                          data-testid="cal-more"
                          aria-label={`${copy.grid.more(more)} on ${formatDay(day, "short")}`}
                          onClick={(ev) => onOpenDay(day, ev.currentTarget)}
                          className="mono grid h-[22px] min-w-[22px] place-items-center rounded-[4px] px-1 !text-[11px] !tracking-normal !text-text md:flex md:h-5 md:w-full md:justify-start md:px-1"
                        >
                          <span className="md:hidden">+{more}</span>
                          <span className="hidden md:inline">{copy.grid.more(more)}</span>
                        </button>
                      </li>
                    )}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
