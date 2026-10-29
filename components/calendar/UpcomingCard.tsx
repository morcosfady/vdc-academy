"use client";

import { useEffect, useMemo, useState } from "react";
import { CALENDAR_IS_SAMPLE } from "@/content/calendar";
import { Tag } from "@/components/ds/Chips";
import { Button } from "@/components/ui/Button";
import { calendarCopy as copy } from "@/content/copy-calendar";
import { eventDay, formatDay, timeShort, upcoming } from "@/lib/calendar";
import { TypeTag, useEvents } from "./parts";

// Student dashboard card: the next three calendar events and a link to the calendar.
export function UpcomingCard({ className }: { className?: string }) {
  const events = useEvents();
  const [nowMs, setNowMs] = useState<number | null>(null);
  useEffect(() => setNowMs(Date.now()), []);
  const next = useMemo(() => (nowMs === null ? [] : upcoming(events, nowMs, 3)), [events, nowMs]);
  return (
    <div className={className} data-testid="upcoming-card">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <p className="mono">{copy.upcoming.title}</p>
        {CALENDAR_IS_SAMPLE && <Tag tone="brass">{copy.event.sampleDate}</Tag>}
      </div>
      {nowMs !== null && next.length === 0 ? (
        <p className="t-small mt-3 text-muted">{copy.upcoming.empty}</p>
      ) : (
        <ul className="mt-3 grid gap-3">
          {next.map((e) => (
            <li key={e.id} className="grid grid-cols-[auto_1fr] gap-x-3">
              <TypeTag type={e.type} className="mt-0.5" />
              <span className="min-w-0">
                <span className="t-small block font-medium leading-snug text-text">{e.title}</span>
                <span className="mono mt-1 block !normal-case !tracking-normal">
                  {formatDay(eventDay(e), "short")} · {timeShort(e)}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-5">
        <Button href="/calendar/" variant="link">
          {copy.upcoming.open}
        </Button>
      </div>
    </div>
  );
}
