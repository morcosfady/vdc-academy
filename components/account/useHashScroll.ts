"use client";

import { useEffect } from "react";

// The account screens render after the session loads, so the browser's own jump to #hiring or #company finds no
// element. Once `ready`, scroll to the hash target (the panels carry scroll-mt for the fixed header).
export function useHashScroll(ready: boolean) {
  useEffect(() => {
    if (!ready) return;
    const id = decodeURIComponent(window.location.hash.slice(1));
    if (!id) return;
    const el = document.getElementById(id);
    if (el) requestAnimationFrame(() => el.scrollIntoView({ block: "start" }));
  }, [ready]);
}
