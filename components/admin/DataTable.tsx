"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { useNarrow } from "./util";

// A schedule-style table on wide screens, stacked cards on phones. Columns carry their own render function;
// `primary` marks the one that becomes the card title and, with `href`, the row link.
export type Column<T> = {
  key: string;
  label: string;
  render: (row: T) => React.ReactNode;
  sortKey?: string;
  primary?: boolean;
  className?: string;
  hideOnCard?: boolean;
};

const rule = { borderColor: "var(--rule)" } as const;

export function DataTable<T>({
  rows,
  columns,
  rowKey,
  href,
  sort,
  onSort,
  openLabel = "Open",
  testId = "row",
  className,
}: {
  rows: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string;
  href?: (row: T) => string;
  sort?: { key: string; asc: boolean };
  onSort?: (key: string) => void;
  openLabel?: string;
  testId?: string;
  className?: string;
}) {
  const narrow = useNarrow();
  const primary = columns.find((c) => c.primary) ?? columns[0];

  if (narrow) {
    return (
      <ul className={cn("grid gap-4", className)}>
        {rows.map((r) => {
          const to = href?.(r);
          return (
            <li key={rowKey(r)} data-testid={testId} className="card p-5">
              <div className="flex items-start justify-between gap-4">
                <h3 className="!text-[1.0625rem] !font-semibold !tracking-normal">
                  {to ? (
                    <Link prefetch={false} href={to} className="hover:text-accent-text">
                      {primary.render(r)}
                    </Link>
                  ) : (
                    primary.render(r)
                  )}
                </h3>
                {to && (
                  <Link prefetch={false} href={to} aria-label={openLabel} className="-me-2 -mt-1 grid size-10 shrink-0 place-items-center text-dim hover:text-accent-text">
                    <svg aria-hidden width="18" height="12" viewBox="0 0 22 14">
                      <path d="M0 7h20M14 1l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="1.5" />
                    </svg>
                  </Link>
                )}
              </div>
              <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-5 gap-y-2">
                {columns
                  .filter((c) => c !== primary && !c.hideOnCard)
                  .map((c) => (
                    <div key={c.key} className="contents">
                      <dt className="mono pt-0.5">{c.label}</dt>
                      <dd className="min-w-0 break-words text-[15px] text-text">{c.render(r)}</dd>
                    </div>
                  ))}
              </dl>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <div className={cn("card overflow-x-auto", className)}>
      <table className="w-full border-collapse text-[15px]">
        <thead>
          <tr className="border-b text-start" style={rule}>
            {columns.map((c) => {
              const sortable = Boolean(c.sortKey && onSort);
              const active = sort && c.sortKey === sort.key;
              return (
                <th
                  key={c.key}
                  scope="col"
                  aria-sort={active ? (sort!.asc ? "ascending" : "descending") : undefined}
                  className={cn("mono whitespace-nowrap px-4 py-3.5 text-start font-normal first:ps-5 last:pe-5", c.className)}
                >
                  {sortable ? (
                    <button type="button" onClick={() => onSort!(c.sortKey!)} className={cn("mono inline-flex items-center gap-1.5 hover:!text-text", active && "!text-text")}>
                      {c.label}
                      <svg aria-hidden width="8" height="10" viewBox="0 0 8 10" className={cn("transition-opacity", active ? "opacity-100" : "opacity-30")}>
                        {active && !sort!.asc ? <path d="M1 3l3 4 3-4" fill="none" stroke="currentColor" strokeWidth="1.25" /> : <path d="M1 7l3-4 3 4" fill="none" stroke="currentColor" strokeWidth="1.25" />}
                      </svg>
                    </button>
                  ) : (
                    c.label
                  )}
                </th>
              );
            })}
            {href && (
              <th scope="col" className="w-12">
                <span className="sr-only">{openLabel}</span>
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const to = href?.(r);
            return (
              <tr key={rowKey(r)} data-testid={testId} className="group border-b align-top transition-colors last:border-b-0 hover:bg-paper-2/60" style={rule}>
                {columns.map((c) => (
                  <td key={c.key} className={cn("px-4 py-4 text-muted first:ps-5 last:pe-5", c === primary && "font-medium text-text", c.className)}>
                    {c === primary && to ? (
                      <Link prefetch={false} href={to} className="hover:text-accent-text">
                        {c.render(r)}
                      </Link>
                    ) : (
                      c.render(r)
                    )}
                  </td>
                ))}
                {to && (
                  <td className="py-3 pe-3 text-end">
                    <Link prefetch={false} href={to} aria-label={openLabel} className="inline-grid size-10 place-items-center text-dim transition-transform hover:text-accent-text group-hover:translate-x-0.5">
                      <svg aria-hidden width="18" height="12" viewBox="0 0 22 14">
                        <path d="M0 7h20M14 1l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="1.5" />
                      </svg>
                    </Link>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
