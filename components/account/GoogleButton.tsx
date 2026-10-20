"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { authCallbackUrl, getSupabase } from "@/lib/supabase";
import { OrRule } from "./AuthSplit";

// Only when the owner has turned Google on (NEXT_PUBLIC_AUTH_GOOGLE=1 at build time and the provider set up in Supabase).
export const googleOn = process.env.NEXT_PUBLIC_AUTH_GOOGLE === "1";

export function GoogleButton({ label, orLabel, next }: { label: string; orLabel: string; next: string | null }) {
  const [busy, setBusy] = useState(false);
  if (!googleOn) return null;
  async function go() {
    const sb = getSupabase();
    if (!sb) return;
    setBusy(true);
    await sb.auth.signInWithOAuth({ provider: "google", options: { redirectTo: authCallbackUrl(next ?? undefined) } });
    setBusy(false);
  }
  return (
    <div className="grid gap-6">
      <Button type="button" variant="secondary" onClick={go} disabled={busy} className="w-full">
        <svg aria-hidden width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="9" cy="9" r="7.5" />
          <path d="M9 9h6.5M12.5 5.5A5 5 0 1 0 13.8 11" />
        </svg>
        {label}
      </Button>
      <OrRule label={orLabel} />
    </div>
  );
}
