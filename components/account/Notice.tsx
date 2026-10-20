"use client";

import { cn } from "@/lib/utils";

// Calm inline messages. `ok` and `info` are announced politely (status); `error` is an alert with an optional retry.
export function Notice({
  tone = "info",
  children,
  action,
  className,
}: {
  tone?: "ok" | "info" | "error";
  children: React.ReactNode;
  action?: { label: string; onClick: () => void };
  className?: string;
}) {
  const error = tone === "error";
  return (
    <div
      role={error ? "alert" : "status"}
      aria-live={error ? undefined : "polite"}
      className={cn("flex flex-col gap-3 rounded-[8px] border px-5 py-4 text-[15px] leading-6 text-text sm:flex-row sm:items-start sm:justify-between", className)}
      style={{ borderColor: error ? "var(--err)" : "var(--rule)", background: tone === "ok" ? "var(--surface)" : undefined }}
    >
      <div className="flex items-start gap-3">
        {tone === "ok" && (
          <svg aria-hidden width="16" height="16" viewBox="0 0 16 16" className="mt-1 shrink-0 text-accent-text">
            <path d="M2 8.5l4 4 8-9" fill="none" stroke="currentColor" strokeWidth="1.8" />
          </svg>
        )}
        {error && (
          <svg aria-hidden width="16" height="16" viewBox="0 0 16 16" className="mt-1 shrink-0 text-err">
            <circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <path d="M8 4.5v4M8 11v.5" stroke="currentColor" strokeWidth="1.8" />
          </svg>
        )}
        <span>{children}</span>
      </div>
      {action && (
        <button type="button" onClick={action.onClick} className="ul-draw shrink-0 self-start pb-0.5 text-[15px] font-medium text-text hover:text-accent-text">
          {action.label}
        </button>
      )}
    </div>
  );
}

// Live region for short form status text (sending, saved). Visually quiet, always announced.
export function LiveStatus({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p role="status" aria-live="polite" className={cn("min-h-5 text-[13px] text-dim", className)}>
      {children}
    </p>
  );
}
