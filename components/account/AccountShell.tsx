"use client";

import { RequireAuth } from "@/lib/auth";
import { SheetTag } from "@/components/ds/Devices";
import { AccountSkeleton } from "./Skeleton";

// Paper page for the signed-in screens: client-side gate (RLS does the real work), sheet tag, headline, lead, body.
export function AccountShell({ sheet, name, title, lead, actions, children }: { sheet: string; name: string; title: React.ReactNode; lead?: React.ReactNode; actions?: React.ReactNode; children: React.ReactNode }) {
  return (
    <RequireAuth fallback={<AccountSkeleton />}>
      <section className="theme-light pt-[72px]">
        <div className="wrap">
          <header className="rule-b flex flex-col gap-8 pb-10 pt-12 lg:flex-row lg:items-end lg:justify-between lg:pb-14 lg:pt-20">
            <div>
              <SheetTag sheet={sheet} name={name} />
              <h1 className="t-h1 mt-8 max-w-[18ch]">{title}</h1>
              {lead && <p className="t-lead mt-5">{lead}</p>}
            </div>
            {actions && <div className="flex flex-wrap items-center gap-5 lg:pb-2">{actions}</div>}
          </header>
          <div className="pb-24 pt-10 lg:pb-32 lg:pt-14">{children}</div>
        </div>
      </section>
    </RequireAuth>
  );
}

// A titled panel on the account pages: mono label on a hairline, then the content.
export function Panel({ id, label, children, className }: { id?: string; label: string; children: React.ReactNode; className?: string }) {
  return (
    <section id={id} aria-labelledby={id ? `${id}-h` : undefined} className={className}>
      <h2 id={id ? `${id}-h` : undefined} className="mono rule-b pb-3 !text-xs !font-normal !tracking-[0.08em]">
        {label}
      </h2>
      <div className="mt-6">{children}</div>
    </section>
  );
}
