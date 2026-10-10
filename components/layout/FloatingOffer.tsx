"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { site } from "@/config/site";

const KEY = "vdc-offer-dismissed";

// Fresh-grad pill, bottom left, appears after 30% scroll. Dismissal is remembered.
export function FloatingOffer() {
  const [show, setShow] = useState(false);
  const [gone, setGone] = useState(true);

  useEffect(() => {
    try {
      setGone(localStorage.getItem(KEY) === "1");
    } catch {
      setGone(false);
    }
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setShow(max > 0 && window.scrollY / max > 0.3);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (gone || !show) return null;

  return (
    <div className="glass fixed bottom-5 start-5 z-40 hidden items-center gap-3 py-2 ps-5 pe-2 text-sm sm:flex">
      <Link href="/fresh-graduates" className="hover:text-accent-text">
        🎓 Fresh grads save {site.freshGradMaxDiscount}% <span aria-hidden>→</span>
      </Link>
      <button
        type="button"
        aria-label="Dismiss offer"
        className="grid size-8 place-items-center hover:text-accent-text"
        onClick={() => {
          setGone(true);
          try {
            localStorage.setItem(KEY, "1");
          } catch {}
        }}
      >
        <X size={14} aria-hidden />
      </button>
    </div>
  );
}
