"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { initials } from "@/lib/db";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

// Header account state. Logged out: "Log in" + Apply. Logged in: an initials button with a small index-sheet menu.
// Renders the logged-out chrome until the session is known so server and client HTML match.
export function AccountMenu({ compact = false }: { compact?: boolean }) {
  const { enabled, ready, user, profile, isAdmin, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!ready || !enabled || !user) {
    return (
      <>
        {enabled && ready && (
          <Link prefetch={false} href="/login/" className="ul-draw hidden pb-1 text-[15px] font-medium text-text/80 hover:text-text sm:inline">
            Log in
          </Link>
        )}
        <Button href="/apply" className={cn("!h-10 !px-4 sm:!h-11 sm:!px-5", compact && "!h-10")}>
          Apply
        </Button>
      </>
    );
  }

  const items = [
    { href: "/account/", label: "Dashboard" },
    { href: "/account/profile/", label: "Profile" },
    { href: "/account/#applications", label: "My applications" },
    ...(isAdmin ? [{ href: "/admin/", label: "Admin" }] : []),
  ];

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        className="grid size-10 place-items-center rounded-full border bg-paper text-[13px] font-semibold text-ink transition-colors hover:border-accent sm:size-11"
        style={{ borderColor: "var(--rule)" }}
      >
        {initials(profile?.full_name, user.email)}
      </button>
      {open && (
        <div role="menu" className="theme-light absolute end-0 top-[calc(100%+8px)] z-50 w-56 rounded-[8px] border bg-paper p-2 text-ink shadow-[var(--card-shadow)]" style={{ borderColor: "var(--rule)" }}>
          <p className="mono truncate px-3 py-2">{user.email}</p>
          {items.map((it, i) => (
            <Link key={it.href} role="menuitem" prefetch={false} href={it.href} onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-[4px] px-3 py-2 text-[15px] hover:bg-paper-2">
              <span className="mono">{String(i + 1).padStart(2, "0")}</span>
              {it.label}
            </Link>
          ))}
          <button
            type="button"
            role="menuitem"
            onClick={async () => {
              setOpen(false);
              await signOut();
              window.location.href = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/`;
            }}
            className="mt-1 flex w-full items-center gap-3 rounded-[4px] border-t px-3 py-2 text-start text-[15px] hover:bg-paper-2"
            style={{ borderColor: "var(--rule)" }}
          >
            <span className="mono">{String(items.length + 1).padStart(2, "0")}</span>
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
