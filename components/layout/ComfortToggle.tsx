"use client";

import { useEffect, useState } from "react";

const KEY = "vdc-comfort";

// Comfort mode: calm static version. No grain, glows, parallax or smooth scroll, slightly larger text.
export function ComfortToggle() {
  const [on, setOn] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(KEY) === "1") {
        document.documentElement.classList.add("comfort");
        setOn(true);
        window.dispatchEvent(new Event("vdc-motion"));
      }
    } catch {}
  }, []);

  function change(v: boolean) {
    setOn(v);
    document.documentElement.classList.toggle("comfort", v);
    try {
      localStorage.setItem(KEY, v ? "1" : "0");
    } catch {}
    window.dispatchEvent(new Event("vdc-motion"));
  }

  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm text-muted">
      <input type="checkbox" checked={on} onChange={(e) => change(e.target.checked)} className="size-4 accent-[var(--accent)]" />
      Comfort mode
    </label>
  );
}
