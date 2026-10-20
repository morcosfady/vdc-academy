// Anonymous rows for a static site (GitHub Pages has no server): leads, contact messages and newsletter sign-ups go
// straight to Supabase over REST with the anon key, and Row Level Security allows INSERT only on those tables.
// Applications are different since v7: they belong to an account and go through the supabase-js client in
// components/apply/ApplyFlow.tsx (drafts, uploads to the private `documents` bucket, the submit function call).
// The mock switch (`?mock=1` or localStorage["vdc-mock"] = "1") lives in lib/supabase.ts and applies here too.

import { MOCK_KEY, MOCK_URL, supabaseConfig } from "./supabase";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Build-time answer: are the keys baked into this build? (Used for copy and static decisions.)
export const submissionsEnabled = Boolean(URL && KEY);

export { MOCK_KEY, MOCK_URL };

// Runtime answer (keys or mock). Call at submit time, never during render, so server and client HTML match.
export function canSubmit() {
  return supabaseConfig() !== null;
}

export type SubmitResult = { ok: true } | { ok: false; reason: "disabled" | "failed"; message: string };

export async function insertRow(table: "leads" | "contact_messages" | "newsletter_subscribers", row: Record<string, unknown>): Promise<SubmitResult> {
  const c = supabaseConfig();
  if (!c) return { ok: false, reason: "disabled", message: "Submissions are not connected yet." };
  try {
    const res = await (c.fetch ?? fetch)(`${c.url}/rest/v1/${table}`, {
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

export const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
