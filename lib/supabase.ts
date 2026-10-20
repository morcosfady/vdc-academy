"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { demoFetch, demoOn, demoUrl } from "./demo/browser";

// One Supabase client for the browser (static site, anon key + Row Level Security). The test mock switch from
// lib/submit.ts applies here too: `?mock=1` or localStorage["vdc-mock"] = "1" points at https://mock.supabase.local.
// The client demo (/demo/, localStorage["vdc-demo"] = "1") goes one step further: the client gets an in-page fetch
// (lib/demo/browser.ts) and never touches the network, even when real keys are baked into this build.
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

export function supabaseConfig(): { url: string; key: string; fetch?: typeof fetch } | null {
  if (demoOn()) return { url: demoUrl(), key: MOCK_KEY, fetch: demoFetch };
  if (mockOn()) return { url: MOCK_URL, key: MOCK_KEY };
  return URL && KEY ? { url: URL, key: KEY } : null;
}

// Build-time: keys baked into this build. Runtime (client): keys or mock. Use `authEnabled()` in effects, never in render.
export const authConfigured = Boolean(URL && KEY);
export const authEnabled = () => supabaseConfig() !== null;

let client: SupabaseClient | null = null;
let clientUrl = "";

// supabase-js (about 64 KB gzipped) is loaded only when this build has keys, or the mock or the demo is on, so the
// public pages of a site without a backend never download it. AuthProvider awaits loadSupabase() before it reports
// `ready`; everything that runs after `ready` can keep calling getSupabase() synchronously.
type CreateClient = typeof import("@supabase/supabase-js").createClient;
let createClient: CreateClient | null = null;
let loading: Promise<CreateClient> | null = null;

export async function loadSupabase(): Promise<SupabaseClient | null> {
  if (!supabaseConfig()) return null;
  if (!createClient) {
    loading ??= import("@supabase/supabase-js").then((m) => m.createClient);
    createClient = await loading;
  }
  return getSupabase();
}

export function getSupabase(): SupabaseClient | null {
  const c = supabaseConfig();
  if (!c || !createClient) return null;
  if (!client || clientUrl !== c.url) {
    client = createClient(c.url, c.key, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: "pkce" },
      ...(c.fetch ? { global: { fetch: c.fetch } } : {}),
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
