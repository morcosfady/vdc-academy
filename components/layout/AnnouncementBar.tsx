"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { site } from "@/config/site";

const KEY = "vdc-announcement-dismissed";

export function AnnouncementBar() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      setOpen(localStorage.getItem(KEY) !== "1");
    } catch {
      setOpen(true);
    }
  }, []);

  if (!open) return null;

  function close() {
    setOpen(false);
    try {
      localStorage.setItem(KEY, "1");
    } catch {}
  }

  return (
    <div className="relative bg-brand-primary px-10 py-2 text-center text-sm text-white">
      🎓 Fresh graduates save up to {site.freshGradMaxDiscount}%. Next cohort starts{" "}
      <span className="placeholder-chip !text-white !border-white/60">{site.nextCohortDate}</span>.
      <button
        type="button"
        onClick={close}
        aria-label="Dismiss announcement"
        className="absolute inset-y-0 end-3 grid place-items-center px-1"
      >
        <X size={16} aria-hidden />
      </button>
    </div>
  );
}
