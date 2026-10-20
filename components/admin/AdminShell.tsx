"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { RequireAuth } from "@/lib/auth";
import { SheetTag } from "@/components/ds/Devices";
import { Toast } from "@/components/ds/Overlays";
import { adminCopy } from "@/content/copy-admin";
import { cn } from "@/lib/utils";
import { ShellSkeleton } from "./Skeleton";

const rule = { borderColor: "var(--rule)" } as const;

// The admin frame: RequireAuth(admin), a sheet-tagged header, the mono index nav (01 Overview, 02 Applications,
// 03 Leads) and the page body. Non-admins get the 403 from lib/auth; logged-out visitors go to /login/.
export function AdminShell({
  sheet,
  name,
  title,
  lead,
  actions,
  children,
}: {
  sheet: string;
  name: string;
  title: React.ReactNode;
  lead?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <RequireAuth admin fallback={<ShellSkeleton />}>
      <section className="theme-light pt-[72px]">
        <div className="wrap">
          <header className="flex flex-col gap-6 pb-8 pt-10 lg:flex-row lg:items-end lg:justify-between lg:pb-10 lg:pt-14">
            <div className="min-w-0">
              <SheetTag sheet={sheet} name={name} />
              <h1 className="t-h2 mt-6">{title}</h1>
              {lead && <p className="t-lead mt-3 !max-w-[52ch]">{lead}</p>}
            </div>
            {actions && <div className="flex shrink-0 flex-wrap items-center gap-3">{actions}</div>}
          </header>
          <AdminNav />
          <div className="pb-24 pt-10 lg:pb-32 lg:pt-12">{children}</div>
        </div>
      </section>
    </RequireAuth>
  );
}

function AdminNav() {
  const path = usePathname() ?? "";
  return (
    <nav aria-label={adminCopy.navLabel} className="-mx-5 overflow-x-auto overflow-y-hidden border-y px-5 md:mx-0 md:px-0" style={rule}>
      <ul className="flex gap-x-8">
        {adminCopy.nav.map((it, i) => {
          const active = it.match.test(path);
          return (
            <li key={it.href} className="shrink-0">
              <Link
                prefetch={false}
                href={it.href}
                aria-current={active ? "page" : undefined}
                className={cn("relative flex h-12 items-center gap-3 text-[15px] font-medium transition-colors", active ? "text-text" : "text-dim hover:text-text")}
              >
                <span className={cn("mono", active && "!text-accent-text")}>{String(i + 1).padStart(2, "0")}</span>
                {it.label}
                <span aria-hidden className="absolute inset-x-0 -bottom-px h-0.5 bg-accent transition-transform duration-300" style={{ transform: active ? "scaleX(1)" : "scaleX(0)" }} />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

// Short confirmations for the detail and inbox screens. Fixed to the bottom so it never shifts the layout.
export function useToast(ms = 3200) {
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(null), ms);
    return () => clearTimeout(t);
  }, [msg, ms]);
  const node = msg ? (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-5">
      <Toast className="pointer-events-auto shadow-[var(--card-shadow)]">{msg}</Toast>
    </div>
  ) : null;
  return { toast: setMsg, node };
}

// Section heading inside the admin body: mono index + title + a hairline.
export function AdminSection({ index, title, hint, action, children, className }: { index: string; title: string; hint?: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={className} aria-labelledby={`sec-${index}`}>
      <div className="flex flex-wrap items-end justify-between gap-3 border-b pb-3" style={rule}>
        <div>
          <h2 id={`sec-${index}`} className="flex items-baseline gap-3 !text-[1.125rem] !font-semibold !tracking-normal">
            <span className="mono !text-accent-text">{index}</span>
            {title}
          </h2>
          {hint && <p className="t-small mt-1 text-dim">{hint}</p>}
        </div>
        {action}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}
