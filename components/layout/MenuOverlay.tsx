"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { AnimatePresence, m } from "motion/react";
import { site } from "@/config/site";
import { content, shown } from "@/content/site";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/lib/auth";
import { account as copy } from "@/content/copy-account";
import { accountLinks, SuperAdminBadge } from "./AccountMenu";

// Full-screen paper menu, like an index sheet: mono numbers, big titles, hairlines. Focus is trapped, Escape closes.
export function MenuOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const panel = useRef<HTMLDivElement>(null);
  const { enabled, ready, user, isAdmin, isSuperAdmin, isRecruiter, signOut } = useAuth();
  const signedIn = ready && enabled && Boolean(user);
  const account = signedIn ? accountLinks({ isAdmin, isRecruiter }) : ready && enabled ? [{ href: "/login/", label: copy.menu.login }] : [];
  const hire = signedIn && isRecruiter;
  const email = shown(content.contact.email);
  const rule = { borderColor: "var(--rule)" };

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const prev = document.activeElement as HTMLElement | null;
    panel.current?.querySelector<HTMLElement>("button, a")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key !== "Tab" || !panel.current) return;
      const els = panel.current.querySelectorAll<HTMLElement>("a, button");
      const first = els[0];
      const last = els[els.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
      prev?.focus();
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <m.div
          ref={panel}
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
          className="theme-light fixed inset-0 z-[60] overflow-y-auto bg-paper"
          initial={{ clipPath: "inset(0 0 100% 0)" }}
          animate={{ clipPath: "inset(0 0 0% 0)" }}
          exit={{ clipPath: "inset(0 0 100% 0)" }}
          transition={{ duration: 0.45, ease: [0.2, 0.7, 0.1, 1] }}
        >
          <div className="wrap flex min-h-full flex-col py-5">
            <div className="flex h-[52px] items-center justify-between">
              <span className="flex items-center gap-4 text-ink">
                <Logo />
                {signedIn && isSuperAdmin && <SuperAdminBadge />}
              </span>
              <button type="button" onClick={onClose} aria-label="Close menu" className="mono grid h-11 place-items-center rounded-[4px] border px-4 !text-text hover:border-accent" style={rule}>
                Close
              </button>
            </div>

            <ol className="my-auto border-t py-6" style={rule}>
              {[...site.menu, ...account].map((l, i) => (
                <m.li
                  key={l.href}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 + i * 0.05, duration: 0.5, ease: [0.2, 0.7, 0.1, 1] }}
                  className="border-b"
                  style={rule}
                >
                  <Link prefetch={false} href={l.href} onClick={onClose} className="group flex items-baseline gap-6 py-3 md:py-4">
                    <span className="mono w-8">{String(i + 1).padStart(2, "0")}</span>
                    <span className="t-h3 transition-colors group-hover:text-accent-text">{l.label}</span>
                  </Link>
                </m.li>
              ))}
            </ol>

            <div className="flex flex-wrap items-end justify-between gap-6">
              <div className="mono space-y-1">
                <p>{site.city}</p>
                <p>{site.coords}</p>
                {email && (
                  <p>
                    <a href={`mailto:${email}`} className="hover:!text-text">{email}</a>
                  </p>
                )}
              </div>
              <span className="flex flex-wrap items-center gap-4">
                {signedIn && (
                  <button type="button" onClick={async () => { onClose(); await signOut(); window.location.href = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/`; }} className="ul-draw pb-0.5 text-[15px] font-medium text-text">
                    {copy.menu.signOut}
                  </button>
                )}
                <Button href={hire ? "/account/#hiring" : "/apply"} onClick={onClose}>
                  {hire ? copy.menu.hire : copy.menu.applyNow}
                </Button>
              </span>
            </div>
          </div>
        </m.div>
      )}
    </AnimatePresence>
  );
}
