// Form submission for a static site (GitHub Pages has no server). Rows go straight to Supabase over REST with
// the anon key. Row Level Security allows INSERT only (see supabase/migrations). Emails and Turnstile checks
// run in a Supabase Edge Function triggered by a database webhook. To move to a server host later, replace
// the two functions below with server actions; nothing else needs to change.

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Build-time answer: are the keys baked into this build? (Used for copy and static decisions.)
export const submissionsEnabled = Boolean(URL && KEY);

// Test-only mock: `?mock=1` in the URL or localStorage["vdc-mock"] = "1" points every request at
// https://mock.supabase.local so Playwright can intercept it. Never set in production.
export const MOCK_URL = "https://mock.supabase.local";
export const MOCK_KEY = "mock-key";

function mockOn() {
  if (typeof window === "undefined") return false;
  try {
    if (new URLSearchParams(window.location.search).get("mock") === "1") return true;
    return localStorage.getItem("vdc-mock") === "1";
  } catch {
    return false;
  }
}

function config(): { url: string; key: string } | null {
  if (mockOn()) return { url: MOCK_URL, key: MOCK_KEY };
  return URL && KEY ? { url: URL, key: KEY } : null;
}

// Runtime answer (keys or mock). Call at submit time, never during render, so server and client HTML match.
export function canSubmit() {
  return config() !== null;
}

export type SubmitResult = { ok: true } | { ok: false; reason: "disabled" | "failed"; message: string };

export async function insertRow(table: "applications" | "leads" | "contact_messages" | "newsletter_subscribers", row: Record<string, unknown>): Promise<SubmitResult> {
  const c = config();
  if (!c) return { ok: false, reason: "disabled", message: "Submissions are not connected yet." };
  try {
    const res = await fetch(`${c.url}/rest/v1/${table}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: c.key, Authorization: `Bearer ${c.key}`, Prefer: "return=minimal" },
      body: JSON.stringify(row),
    });
    if (!res.ok) return { ok: false, reason: "failed", message: "We could not save that. Please try again." };
    return { ok: true };
  } catch {
    return { ok: false, reason: "failed", message: "Network problem. Please try again." };
  }
}

// Uploads go to a private bucket under a random name. Returns the stored path, or null on failure.
export async function uploadFile(file: File, folder: "proof" | "cv"): Promise<string | null> {
  const c = config();
  if (!c) return null;
  const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5) || "bin";
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;
  try {
    const res = await fetch(`${c.url}/storage/v1/object/applications/${path}`, {
      method: "POST",
      headers: { apikey: c.key, Authorization: `Bearer ${c.key}`, "Content-Type": file.type || "application/octet-stream", "x-upsert": "false" },
      body: file,
    });
    return res.ok ? path : null;
  } catch {
    return null;
  }
}

export const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
