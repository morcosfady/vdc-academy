"use client";

import { useSyncExternalStore } from "react";

const KEY = "vdc-reduce-motion";

export function setReduceMotion(on: boolean) {
  document.documentElement.classList.toggle("reduce-motion", on);
  try {
    localStorage.setItem(KEY, on ? "1" : "0");
  } catch {}
  window.dispatchEvent(new Event("vdc-motion"));
}

export function initReduceMotion() {
  try {
    if (localStorage.getItem(KEY) === "1") {
      document.documentElement.classList.add("reduce-motion");
      window.dispatchEvent(new Event("vdc-motion"));
    }
  } catch {}
}

// One shared subscription for the whole page (dozens of components read this).
const read = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.classList.contains("reduce-motion");

let mq: MediaQueryList | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

function subscribe(cb: () => void) {
  if (listeners.size === 0) {
    mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    mq.addEventListener("change", notify);
    window.addEventListener("vdc-motion", notify);
  }
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
    if (listeners.size === 0) {
      mq?.removeEventListener("change", notify);
      window.removeEventListener("vdc-motion", notify);
    }
  };
}

// True when the user prefers reduced motion (OS setting or the footer toggle)
export function useReduceMotion() {
  return useSyncExternalStore(subscribe, read, () => false);
}
