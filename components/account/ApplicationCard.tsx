import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Tag } from "@/components/ds/Chips";
import { getProgram } from "@/content/programs";
import { discountStatusLabel, statusLabel, type Application } from "@/lib/db";
import { account } from "@/content/copy-account";
import { fmtDate, shortId } from "./format";
import { cn } from "@/lib/utils";

const c = account.dashboard.card;

export const programTitles = (slugs: string[] | null | undefined) => (slugs ?? []).map((s) => getProgram(s)?.title ?? s);

// One application as a drawing sheet: sheet id, programs, status, discount, date, two actions.
export function ApplicationCard({ app, className }: { app: Application; className?: string }) {
  const titles = programTitles(app.programs);
  const draft = app.status === "draft";
  const active = !draft && app.status !== "rejected";
  return (
    <article className={cn("card p-6 md:p-7", className)} aria-labelledby={`app-${app.id}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="mono !text-text">APP-{shortId(app.id)}</span>
        <Tag tone={active ? "blueprint" : "default"}>{statusLabel[app.status]}</Tag>
      </div>
      <h3 id={`app-${app.id}`} className="mt-5 !text-[1.375rem]">
        {titles.length ? titles.join(", ") : c.none}
      </h3>
      <dl className="mt-5 grid gap-x-8 gap-y-3 border-t pt-4 sm:grid-cols-2" style={{ borderColor: "var(--rule)" }}>
        <div>
          <dt className="mono">{draft ? c.updated : c.submitted}</dt>
          <dd className="mt-1 text-[15px] text-text">{fmtDate(draft ? app.updated_at : app.submitted_at ?? app.updated_at)}</dd>
        </div>
        {app.discount_type && (
          <div>
            <dt className="mono">{c.discount}</dt>
            <dd className="mt-1 text-[15px] text-warm">
              {app.discount_percent ? `${app.discount_percent}% · ` : ""}
              {discountStatusLabel[app.discount_status]}
            </dd>
          </div>
        )}
      </dl>
      <div className="mt-6 flex flex-wrap items-center gap-5">
        {draft && (
          <Button href="/apply/" className="!h-12 !px-6">
            {c.continue}
          </Button>
        )}
        <Link prefetch={false} href={`/account/application/?id=${encodeURIComponent(app.id)}`} className="ul-draw inline-flex items-center gap-2 pb-1 text-[15px] font-medium text-text hover:text-accent-text">
          {c.view}
          <svg aria-hidden width="16" height="12" viewBox="0 0 16 12">
            <path d="M0 6h14M9 1l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </Link>
      </div>
    </article>
  );
}
