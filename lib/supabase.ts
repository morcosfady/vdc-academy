"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// One Supabase client for the browser (static site, anon key + Row Level Security). The test mock switch from
// lib/submit.ts applies here too: `?mock=1` or localStorage["vdc-mock"] = "1" points at https://mock.supabase.local.
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
export const MOCK_URL = "https://mock.supabase.local";
export const MOCK_KEY = "mock-key";

export function mockOn() {
  if (typeof window === "undefined") return false;
  try {
    if (new URLSearchParams(window.location.search).get("mock") === "1") {
      localStorage.setItem("vdc-mock", "1");
      return true;
    }
    return localStorage.getItem("vdc-mock") === "1";
  } catch {
    return false;
  }
}

export function supabaseConfig(): { url: string; key: string } | null {
  if (mockOn()) return { url: MOCK_URL, key: MOCK_KEY };
  return URL && KEY ? { url: URL, key: KEY } : null;
}

// Build-time: keys baked into this build. Runtime (client): keys or mock. Use `authEnabled()` in effects, never in render.
export const authConfigured = Boolean(URL && KEY);
export const authEnabled = () => supabaseConfig() !== null;

let client: SupabaseClient | null = null;
let clientUrl = "";

export function getSupabase(): SupabaseClient | null {
  const c = supabaseConfig();
  if (!c) return null;
  if (!client || clientUrl !== c.url) {
    client = createClient(c.url, c.key, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: "pkce" },
    });
    clientUrl = c.url;
  }
  return client;
}

// The site's own origin + base path, for auth redirect URLs. NEXT_PUBLIC_SITE_URL wins (one change for a custom domain).
export function siteUrl(path = "/") {
  const base = process.env.NEXT_PUBLIC_SITE_URL || (typeof window !== "undefined" ? `${window.location.origin}${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}` : "");
  return `${base.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
}

// Where auth emails and OAuth return to (must be whitelisted in the Supabase dashboard, see docs/SETUP-SUPABASE.md).
export const authCallbackUrl = (next?: string) => siteUrl(`/auth/callback/${next ? `?next=${encodeURIComponent(next)}` : ""}`);
