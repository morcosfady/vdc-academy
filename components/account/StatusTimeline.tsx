import { PIPELINE, statusLabel, type ApplicationEvent, type ApplicationStatus } from "@/lib/db";
import { account } from "@/content/copy-account";
import { fmtDate } from "./format";
import { cn } from "@/lib/utils";

const c = account.timeline;

// The pipeline drawn like a construction schedule: five steps on one rule, past steps dated from the student-visible
// events, the current step marked. Horizontal from sm, a vertical list on phones. Waitlist and rejected sit outside
// the rule and get one plain sentence under it.
export function StatusTimeline({ status, events, submittedAt, className }: { status: ApplicationStatus; events: ApplicationEvent[]; submittedAt?: string | null; className?: string }) {
  const dates: Partial<Record<ApplicationStatus, string>> = {};
  for (const e of [...events].sort((a, b) => a.created_at.localeCompare(b.created_at))) {
    if (e.type === "status_change" && e.to_status && !dates[e.to_status]) dates[e.to_status] = e.created_at;
  }
  if (submittedAt && !dates.submitted) dates.submitted = submittedAt;

  const idx = PIPELINE.indexOf(status);
  const reachedByDates = PIPELINE.reduce((m, s, i) => (dates[s] ? i : m), -1);
  const current = status === "draft" ? -1 : idx >= 0 ? idx : reachedByDates;
  const outside = status === "waitlist" || status === "rejected";

  return (
    <div className={className}>
      <ol aria-label={c.label} className="grid gap-y-0 sm:grid-cols-5">
        {PIPELINE.map((s, i) => {
          const done = i < current || (i === current && status === "enrolled");
          const now = i === current && !outside && status !== "enrolled";
          const date = dates[s];
          const tone = done || now ? "var(--accent)" : "var(--rule)";
          return (
            <li
              key={s}
              aria-current={now ? "step" : undefined}
              className={cn("relative border-s ps-6 pb-7 last:pb-0 sm:border-s-0 sm:border-t sm:pb-0 sm:pe-4 sm:ps-0 sm:pt-5")}
              style={{ borderColor: i <= current ? "var(--accent)" : "var(--rule)" }}
            >
              <span
                aria-hidden
                className={cn("absolute -start-[7px] top-0 grid size-[13px] place-items-center rounded-full border bg-paper sm:-top-[7px] sm:start-0", now && "size-[15px] -start-2 sm:-top-2")}
                style={{ borderColor: tone, background: done ? "var(--accent)" : "var(--paper)" }}
              >
                {now && <span className="size-[7px] rounded-full" style={{ background: "var(--accent)" }} />}
              </span>
              <p className="mono -mt-1 sm:mt-0">{String(i + 1).padStart(2, "0")}</p>
              <p className={cn("mt-1 text-[15px] font-medium", done || now ? "text-text" : "text-dim")}>{statusLabel[s]}</p>
              <p className="mono mt-1 !normal-case">{date ? fmtDate(date) : now ? c.current : status === "draft" && i === 0 ? c.draft : c.pending}</p>
            </li>
          );
        })}
      </ol>
      {outside && (
        <p className="mt-6 flex items-start gap-3 text-[15px] text-muted">
          <span className="mono mt-0.5 shrink-0 rounded-[4px] border px-2 py-0.5 !text-text" style={{ borderColor: "var(--rule)" }}>
            {statusLabel[status]}
          </span>
          {status === "waitlist" ? c.waitlist : c.rejected}
        </p>
      )}
    </div>
  );
}
