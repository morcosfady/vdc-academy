"use client";

import { useEffect, useState } from "react";
import { sampleEvents, type CalendarEvent, type CalendarEventType } from "@/content/calendar";
import { calendarCopy as copy } from "@/content/copy-calendar";
import { loadEvents } from "@/lib/calendar";
import { cn } from "@/lib/utils";

// The five event types are told apart by a mono letter (S, I, W, D, C) and a fill, never by colour alone.
const tagStyle: Record<CalendarEventType, React.CSSProperties> = {
  session: { background: "#1c4a96", color: "#ffffff", border: "1px solid #1c4a96" },
  info: { background: "transparent", color: "#1c4a96", border: "1px solid #1c4a96" },
  workshop: { background: "#ffffff", color: "#1c4a96", border: "1px solid #1c4a96" },
  deadline: { background: "rgba(184,146,90,0.22)", color: "var(--warm)", border: "1px solid var(--brass)" },
  cohort: { background: "var(--ink)", color: "#ffffff", border: "1px solid var(--ink)" },
};

export function TypeTag({ type, className }: { type: CalendarEventType; className?: string }) {
  return (
    <span
      aria-hidden
      data-testid="pill-tag"
      className={cn("mono inline-grid size-[18px] shrink-0 place-items-center rounded-[3px] !text-[11px] !leading-none !tracking-normal", className)}
      style={{ ...tagStyle[type], fontWeight: 500 }}
    >
      {copy.types[type].letter}
    </span>
  );
}

// Events for the calendar. Starts from the sample (same on the server and in the browser), then asks loadEvents()
// once, so a database-backed list can replace it later without changing any caller.
export function useEvents(): CalendarEvent[] {
  const [events, setEvents] = useState<CalendarEvent[]>(sampleEvents);
  useEffect(() => {
    let live = true;
    loadEvents()
      .then((list) => live && setEvents((prev) => (prev === list ? prev : list)))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, []);
  return events;
}
