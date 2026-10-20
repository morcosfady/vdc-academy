"use client";

import type { SupabaseClient } from "@supabase/supabase-js";

export type Finish = { ok: true; recovery: boolean } | { ok: false; message: string };

// Finish an auth link on the current URL. supabase-js (detectSessionInUrl, PKCE) usually completes it while the
// client initializes; this also handles `?code=` by hand, `#error_description` from the provider, and recovery links.
export async function finishAuthFromUrl(sb: SupabaseClient): Promise<Finish> {
  const url = new URL(window.location.href);
  const hash = new URLSearchParams(url.hash.replace(/^#/, ""));
  const errDesc = hash.get("error_description") ?? url.searchParams.get("error_description");
  if (errDesc) return { ok: false, message: errDesc.replace(/\+/g, " ") };
  let recovery = hash.get("type") === "recovery" || url.searchParams.get("type") === "recovery";

  const { data: sub } = sb.auth.onAuthStateChange((event) => {
    if (event === "PASSWORD_RECOVERY") recovery = true;
  });
  try {
    const { data } = await sb.auth.getSession();
    if (data.session) return { ok: true, recovery };
    const code = url.searchParams.get("code");
    if (code) {
      const { error } = await sb.auth.exchangeCodeForSession(code);
      if (error) return { ok: false, message: error.message };
      return { ok: true, recovery };
    }
    return { ok: false, message: "" };
  } finally {
    sub.subscription.unsubscribe();
  }
}

// Strip the auth parameters from the address bar without a navigation.
export function cleanAuthUrl() {
  try {
    const url = new URL(window.location.href);
    ["code", "type", "error", "error_code", "error_description"].forEach((k) => url.searchParams.delete(k));
    url.hash = "";
    window.history.replaceState(null, "", url.toString());
  } catch {}
}
