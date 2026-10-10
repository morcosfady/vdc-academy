"use client";

import { useEffect, useState } from "react";

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
    if (localStorage.getItem(KEY) === "1") document.documentElement.classList.add("reduce-motion");
  } catch {}
}

// True when the user prefers reduced motion (OS setting or the footer toggle)
export function useReduceMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const read = () => setReduce(mq.matches || document.documentElement.classList.contains("reduce-motion"));
    read();
    mq.addEventListener("change", read);
    window.addEventListener("vdc-motion", read);
    return () => {
      mq.removeEventListener("change", read);
      window.removeEventListener("vdc-motion", read);
    };
  }, []);
  return reduce;
}
