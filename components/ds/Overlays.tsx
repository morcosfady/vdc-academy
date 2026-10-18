"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

// Modal on the native <dialog>: focus trap, Escape and backdrop handled by the browser.
export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      aria-labelledby="modal-title"
      className="m-auto w-[min(92vw,560px)] rounded-[12px] border bg-white p-0 text-ink backdrop:bg-[rgba(10,29,35,0.55)]"
      style={{ borderColor: "var(--rule)" }}
    >
      <div className="p-7 md:p-9">
        <div className="flex items-start justify-between gap-6">
          <h3 id="modal-title" className="!text-[1.5rem]">
            {title}
          </h3>
          <button type="button" onClick={onClose} aria-label="Close" className="-m-2 grid size-11 place-items-center text-ink hover:text-blueprint">
            <svg aria-hidden width="14" height="14" viewBox="0 0 14 14">
              <path d="M1 1l12 12M13 1 1 13" stroke="currentColor" strokeWidth="1.5" fill="none" />
            </svg>
          </button>
        </div>
        <div className="mt-5 text-[#2e3f45]">{children}</div>
      </div>
    </dialog>
  );
}

// Toast: a short confirmation. role="status" so it is announced politely.
export function Toast({ children, tone = "ink", className }: { children: React.ReactNode; tone?: "ink" | "paper"; className?: string }) {
  return (
    <div
      role="status"
      className={cn(
        "inline-flex items-center gap-3 rounded-[8px] px-5 py-3.5 text-[15px]",
        tone === "ink" ? "bg-ink text-[#eef3f6]" : "border bg-white text-ink",
        className,
      )}
      style={tone === "paper" ? { borderColor: "var(--rule)", boxShadow: "var(--card-shadow)" } : undefined}
    >
      <svg aria-hidden width="16" height="16" viewBox="0 0 16 16" className="shrink-0 text-[#7faef0]">
        <path d="M2 8.5l4 4 8-9" fill="none" stroke="currentColor" strokeWidth="1.8" />
      </svg>
      {children}
    </div>
  );
}

// Drawer: a side panel on wide screens, a bottom sheet on phones. Native <dialog> for focus and Escape.
export function Drawer({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      aria-labelledby="drawer-title"
      className="drawer m-0 max-h-[88svh] w-full max-w-none rounded-t-[12px] border-0 bg-paper p-0 text-ink backdrop:bg-[rgba(10,29,35,0.55)] md:h-full md:max-h-none md:w-[440px] md:rounded-none md:border-s"
      style={{ borderColor: "var(--rule)" }}
    >
      <div className="flex max-h-[88svh] flex-col md:h-full md:max-h-none">
        <div className="flex items-center justify-between gap-6 border-b px-6 py-4" style={{ borderColor: "var(--rule)" }}>
          <h2 id="drawer-title" className="!text-[1.125rem] !font-semibold !tracking-normal">
            {title}
          </h2>
          <button type="button" onClick={onClose} aria-label="Close" className="-me-2 grid size-11 place-items-center text-ink hover:text-blueprint">
            <svg aria-hidden width="14" height="14" viewBox="0 0 14 14">
              <path d="M1 1l12 12M13 1 1 13" stroke="currentColor" strokeWidth="1.5" fill="none" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && (
          <div className="border-t px-6 py-4" style={{ borderColor: "var(--rule)" }}>
            {footer}
          </div>
        )}
      </div>
    </dialog>
  );
}
