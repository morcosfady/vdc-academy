"use client";

import type { CalendarEvent } from "@/content/calendar";
import { calendarCopy as copy } from "@/content/copy-calendar";
import { eventDay, formatDay, timeRange } from "@/lib/calendar";
import { TypeTag } from "./parts";

// "Next up": the next three events as cards. A swipe row on phones, three columns from md.
// `items` is null until the page has mounted (the real date is only known in the browser), then the space is already reserved.
export function NextUp({ items, onOpen }: { items: CalendarEvent[] | null; onOpen: (event: CalendarEvent, trigger: HTMLElement) => void }) {
  return (
    <section aria-label={copy.nextUp.title} data-testid="next-up">
      <p className="mono">{copy.nextUp.title}</p>
      {items === null ? (
        <div aria-hidden className="mt-4 h-[132px]" />
      ) : items.length === 0 ? (
        <p className="t-small mt-4 text-muted">{copy.nextUp.empty}</p>
      ) : (
        <ul className="-mx-5 mt-4 flex snap-x gap-3 overflow-x-auto px-5 pb-2 md:mx-0 md:grid md:grid-cols-3 md:gap-4 md:overflow-visible md:px-0 md:pb-0">
          {items.map((e) => (
            <li key={e.id} className="w-[78%] shrink-0 snap-start sm:w-[46%] md:w-auto">
              <button
                type="button"
                data-testid="next-card"
                onClick={(ev) => onOpen(e, ev.currentTarget)}
                className="card flex h-full w-full flex-col items-stretch justify-start p-5 text-start transition-colors duration-200 hover:border-[color:var(--accent)]"
              >
                <span className="flex items-center gap-2">
                  <TypeTag type={e.type} />
                  <span className="mono !text-text">{formatDay(eventDay(e), "short")}</span>
                </span>
                <span className="mt-3 block text-[17px] font-medium leading-snug text-text">{e.title}</span>
                <span className="t-small mt-2 block text-muted">
                  {timeRange(e)}
                  {e.type !== "deadline" ? `. ${e.format}` : ""}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
