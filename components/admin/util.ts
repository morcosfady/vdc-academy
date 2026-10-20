"use client";

import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase";
import { programs } from "@/content/programs";
import { discounts, type DiscountId } from "@/config/discounts";

// Small helpers shared by the admin screens. Nothing here touches lib/** so it can change freely.

export function sb(): SupabaseClient {
  const c = getSupabase();
  if (!c) throw new Error("Supabase is not configured.");
  return c;
}

// Unwrap a PostgREST reply: throw on error so useLoad can show the retry state.
export function unwrap<T>(r: { data: T | null; error: { message: string } | null }): T {
  if (r.error) throw new Error(r.error.message);
  return r.data as T;
}

export const errorText = (e: unknown) => (e instanceof Error ? e.message : String(e));

// Load once per dependency change, with a loading flag, a calm error and a retry.
export function useLoad<T>(fn: () => Promise<T>, deps: unknown[], enabled = true) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    setLoading(true);
    setError(null);
    fn()
      .then((d) => {
        if (!active) return;
        setData(d);
        setLoading(false);
      })
      .catch((e) => {
        if (!active) return;
        setError(errorText(e));
        setLoading(false);
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick, enabled]);
  return { data, loading, error, reload: () => setTick((t) => t + 1), setData };
}

// Phones get stacked cards instead of a table. False on the server and at first paint; data arrives later anyway.
export function useNarrow(query = "(max-width: 767px)") {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setNarrow(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, [query]);
  return narrow;
}

const dateFmt = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" });
const timeFmt = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
export const fmtDate = (iso: string | null | undefined) => (iso ? dateFmt.format(new Date(iso)) : "");
export const fmtDateTime = (iso: string | null | undefined) => (iso ? timeFmt.format(new Date(iso)) : "");
export const isoDay = (d: Date) => d.toISOString().slice(0, 10);

export const programTitle = (slug: string) => programs.find((p) => p.slug === slug)?.title ?? slug;
export const programTitles = (slugs: string[] | null | undefined) => (slugs ?? []).map(programTitle);

export const discountLabel = (type: string | null | undefined) => (type && type in discounts ? discounts[type as DiscountId].label : type || "");

export const digits = (phone: string | null | undefined) => (phone ?? "").replace(/\D/g, "");

// Software skills are stored as a map (skill -> level) by the apply form; older rows may hold a list.
export function skillsText(v: unknown): string {
  if (!v) return "";
  if (Array.isArray(v)) return v.join(", ");
  if (typeof v === "object") {
    return Object.entries(v as Record<string, string>)
      .filter(([, lvl]) => lvl && lvl !== "None")
      .map(([k, lvl]) => `${k}: ${lvl}`)
      .join(", ");
  }
  return String(v);
}

// CSV with quoted cells. Arrays join with "; ", objects become JSON, null becomes an empty cell.
export function toCsv(columns: { key: string; label: string }[], rows: Record<string, unknown>[]) {
  const cell = (v: unknown) => {
    let s = "";
    if (v === null || v === undefined) s = "";
    else if (Array.isArray(v)) s = v.join("; ");
    else if (typeof v === "object") s = JSON.stringify(v);
    else s = String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const head = columns.map((c) => cell(c.label)).join(",");
  const body = rows.map((r) => columns.map((c) => cell(r[c.key])).join(","));
  return [head, ...body].join("\r\n");
}

export function downloadText(filename: string, text: string, type = "text/csv;charset=utf-8") {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Read the query string once on the client (static export has no dynamic routes).
export function useQuery() {
  const [q, setQ] = useState<URLSearchParams | null>(null);
  useEffect(() => setQ(new URLSearchParams(window.location.search)), []);
  return q;
}
