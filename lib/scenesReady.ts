"use client";

import { useSyncExternalStore } from "react";

// The 3D bundle (three.js + drei, about 900 KB) is loaded on purpose late so the page paints and responds first.
// On desktop it starts when the browser is idle. On phones it waits for the first touch, scroll or key press,
// or about 8 seconds. Until then every scene shows its SVG poster.
let ready = false;
const listeners = new Set<() => void>();

export function markScenesReady() {
  if (ready) return;
  ready = true;
  listeners.forEach((l) => l());
}

export function useScenesReady() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => ready,
    () => false,
  );
}
