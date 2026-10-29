import Link from "next/link";
import type { CalendarEvent } from "@/content/calendar";
import { CALENDAR_IS_SAMPLE } from "@/content/calendar";
import { Tag } from "@/components/ds/Chips";
import { Button } from "@/components/ui/Button";
import { calendarCopy as copy } from "@/content/copy-calendar";
import { ctaFor, eventDay, formatDay, programTitle, timeRange, whereText } from "@/lib/calendar";
import { AddToCalendar } from "./AddToCalendar";
import { TypeTag } from "./parts";

// The details of one event: type, when, where, program, description, the next step and Add to calendar.
// Used in the event dialog (the dialog supplies the title) and in the day panel (`showTitle`).
export function EventBody({ event, showTitle = false }: { event: CalendarEvent; showTitle?: boolean }) {
  const where = whereText(event);
  const program = programTitle(event.program);
  const cta = ctaFor(event);
  const row = "grid grid-cols-[4.5rem_1fr] gap-x-3 border-t py-3";
  const rule = { borderColor: "var(--rule)" } as const;
  return (
    <div data-testid="event-body">
      <p className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <TypeTag type={event.type} />
        <span className="mono">{copy.types[event.type].label}</span>
        {CALENDAR_IS_SAMPLE && <Tag tone="brass">{copy.event.sampleDate}</Tag>}
      </p>
      {showTitle && <h3 className="mt-3 !text-[1.25rem] !leading-snug">{event.title}</h3>}
      <dl className="mt-5 text-[15px]">
        <div className={row} style={rule}>
          <dt className="mono pt-0.5">{copy.event.when}</dt>
          <dd className="text-text">
            <span className="block">{formatDay(eventDay(event))}</span>
            <span className="block" data-testid="event-time">
              {timeRange(event)}
            </span>
          </dd>
        </div>
        {where && (
          <div className={row} style={rule}>
            <dt className="mono pt-0.5">{copy.event.where}</dt>
            <dd className="text-text">{where}</dd>
          </div>
        )}
        {program && event.program && (
          <div className={row} style={rule}>
            <dt className="mono pt-0.5">{copy.event.program}</dt>
            <dd>
              <Link prefetch={false} href={`/programs/${event.program}/`} className="ul-draw pb-0.5 text-accent-text">
                {program}
              </Link>
            </dd>
          </div>
        )}
      </dl>
      <p className="t-small mt-2 border-t pt-4 text-muted" style={rule}>
        {event.description}
      </p>
      <div className="mt-6 flex flex-wrap items-start gap-x-5 gap-y-3">
        <Button href={cta.href} className="!h-11 !px-5">
          {cta.label}
        </Button>
        <AddToCalendar event={event} />
      </div>
    </div>
  );
}
