"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { demo, demoOn } from "@/lib/demo/browser";

// Shown on every page while the client demo is on: a 40px ink strip above the header. `html.demo` moves the fixed
// header and the page down by the same height (app/globals.css). Mounted from the root layout; renders nothing
// until the client has read localStorage, so server and client HTML match.
export function DemoBanner() {
  const [on, setOn] = useState(false);

  useEffect(() => {
    const v = demoOn();
    setOn(v);
    document.documentElement.classList.toggle("demo", v);
  }, []);

  if (!on) return null;
  return (
    <div className="theme-dark fixed inset-x-0 top-0 z-[70] flex h-10 items-center !bg-ink-3 text-paper" role="status" data-testid="demo-banner">
      <div className="wrap flex w-full items-center justify-between gap-4">
        <p className="mono truncate !text-paper/90">
          <span className="me-2 inline-block size-2 rounded-full bg-brass align-middle" aria-hidden />
          <span className="sm:hidden">Demo · sample data</span>
          <span className="hidden sm:inline">Demo mode · sample data, nothing is saved</span>
        </p>
        <div className="flex shrink-0 items-center gap-5">
          <Link prefetch={false} href="/demo/" className="mono ul-draw hidden pb-0.5 !text-paper/80 hover:!text-paper sm:inline">
            Tour
          </Link>
          <button type="button" onClick={() => demo.reset()} className="mono ul-draw hidden pb-0.5 !text-paper/80 hover:!text-paper sm:inline">
            Reset demo data
          </button>
          <button type="button" onClick={() => demo.exit()} className="mono rounded-[4px] border border-paper/40 px-3 py-1 !text-paper hover:border-paper" data-testid="demo-exit">
            Exit demo
          </button>
        </div>
      </div>
    </div>
  );
}
