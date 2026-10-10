"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { AnimatePresence, m } from "motion/react";
import { X } from "lucide-react";
import { site } from "@/config/site";
import { content, shown } from "@/content/site";
import { LogoMark } from "@/components/ui/Logo";

// Full-screen menu. Links enter as stepped slabs. Focus is trapped while open, Escape closes.
export function MenuOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const panel = useRef<HTMLDivElement>(null);
  const email = shown(content.contact.email);
  const phone = shown(content.contact.phone);

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
          className="fixed inset-0 z-[60] overflow-y-auto bg-bg"
          initial={{ clipPath: "inset(0 0 100% 0)" }}
          animate={{ clipPath: "inset(0 0 0% 0)" }}
          exit={{ clipPath: "inset(0 0 100% 0)" }}
          transition={{ duration: 0.6, ease: [0.76, 0, 0.24, 1] }}
        >
          <div className="mx-auto flex min-h-full max-w-[1600px] flex-col px-5 py-6 md:px-10">
            <div className="flex items-center justify-between">
              <span className="label">Menu</span>
              <button type="button" onClick={onClose} aria-label="Close menu" className="grid size-11 place-items-center border border-border hover:border-accent">
                <X size={18} aria-hidden />
              </button>
            </div>

            <ul className="my-auto py-12">
              {site.menu.map((l, i) => (
                <m.li
                  key={l.href}
                  initial={{ opacity: 0, x: -40 + i * 6 }}
                  animate={{ opacity: 1, x: i * 14 }}
                  transition={{ delay: 0.25 + i * 0.05, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                  className="border-b border-border"
                >
                  <Link prefetch={false} href={l.href} onClick={onClose} className="group flex items-baseline gap-6 py-3 md:py-4">
                    <span className="label w-8">{String(i + 1).padStart(2, "0")}</span>
                    <span className="display-md transition-colors group-hover:text-accent-text">{l.label}</span>
                  </Link>
                </m.li>
              ))}
            </ul>

            <div className="flex flex-wrap items-end justify-between gap-6">
              <div className="label space-y-1">
                <p>{site.city}</p>
                {email && <p><a href={`mailto:${email}`} className="hover:text-text">{email}</a></p>}
                {phone && <p>{phone}</p>}
              </div>
              <LogoMark size={72} className="text-accent opacity-60" />
            </div>
          </div>
        </m.div>
      )}
    </AnimatePresence>
  );
}
