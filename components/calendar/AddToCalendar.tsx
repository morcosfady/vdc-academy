"use client";

import { useId, useState } from "react";
import type { CalendarEvent } from "@/content/calendar";
import { CALENDAR_IS_SAMPLE } from "@/content/calendar";
import { calendarCopy as copy } from "@/content/copy-calendar";
import { eventToIcs, eventsToIcs, googleCalendarUrl } from "@/lib/calendar";
import { cn } from "@/lib/utils";

// Saves text as a file from the browser (no server needed on a static site).
export function downloadFile(filename: string, text: string, type = "text/calendar;charset=utf-8") {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export function downloadEventIcs(e: CalendarEvent) {
  downloadFile(`vdc-academy-${e.id}.ics`, eventToIcs(e, { sample: CALENDAR_IS_SAMPLE }));
}

export function downloadAllIcs(events: CalendarEvent[]) {
  downloadFile("vdc-academy-calendar.ics", eventsToIcs(events, { sample: CALENDAR_IS_SAMPLE }));
}

const item = "ul-draw inline-flex min-h-11 items-center pb-0.5 text-start text-[15px] text-text hover:text-accent-text";

// "Add to calendar": a button that opens a short list (Download .ics, Open in Google Calendar). The list sits in the
// flow below the button, so it never gets clipped inside a dialog or a row. Escape closes only the list.
export function AddToCalendar({ event, className }: { event: CalendarEvent; className?: string }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <div className={cn("inline-block", className)} onKeyDown={(e) => {
      if (e.key === "Escape" && open) {
        e.preventDefault();
        e.stopPropagation();
        setOpen(false);
      }
    }}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((v) => !v)}
        className="mono inline-flex min-h-11 items-center gap-2 rounded-[8px] border px-4 !text-text transition-colors duration-200 hover:border-accent hover:!text-accent-text"
        style={{ borderColor: "color-mix(in srgb, var(--text) 35%, transparent)" }}
      >
        <svg aria-hidden width="14" height="14" viewBox="0 0 14 14">
          <path d="M1.5 3h11v9.5h-11zM1.5 6h11M4.5 1v3M9.5 1v3" fill="none" stroke="currentColor" strokeWidth="1.2" />
        </svg>
        {copy.add.button}
      </button>
      {open && (
        <div id={id} className="mt-1 flex flex-col">
          <button type="button" className={item} onClick={() => downloadEventIcs(event)}>
            {copy.add.ics}
          </button>
          <a className={item} href={googleCalendarUrl(event, CALENDAR_IS_SAMPLE)} target="_blank" rel="noopener noreferrer">
            {copy.add.google}
          </a>
        </div>
      )}
    </div>
  );
}
