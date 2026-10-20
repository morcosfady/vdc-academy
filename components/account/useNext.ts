"use client";

import { useEffect, useState } from "react";

// `?next=` is kept through sign up, log in and the email callback. Only same-site paths are accepted
// (a relative path that starts with one slash), so a link can never send a student off the site.
export const safeNext = (v: string | null | undefined): string | null => (v && /^\/(?!\/)/.test(v) ? v : null);

export const withNext = (href: string, next: string | null) => (next ? `${href}?next=${encodeURIComponent(next)}` : href);

export function useNextParam(): string | null {
  const [next, setNext] = useState<string | null>(null);
  useEffect(() => {
    try {
      setNext(safeNext(new URLSearchParams(window.location.search).get("next")));
    } catch {}
  }, []);
  return next;
}

// Read one query value once the page is on the client (static export, so no server params).
export function useQueryParam(name: string): string | null | undefined {
  const [v, setV] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    try {
      setV(new URLSearchParams(window.location.search).get(name));
    } catch {
      setV(null);
    }
  }, [name]);
  return v;
}
