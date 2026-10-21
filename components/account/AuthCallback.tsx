"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authEnabled, loadSupabase } from "@/lib/supabase";
import { Button } from "@/components/ui/Button";
import { account } from "@/content/copy-account";
import { AuthSplit } from "./AuthSplit";
import { FormSkeleton } from "./Skeleton";
import { Notice } from "./Notice";
import { cleanAuthUrl, finishAuthFromUrl } from "./authUrl";
import { safeNext } from "./useNext";

const c = account.callback;

// Where email links and OAuth return. supabase-js finishes the PKCE exchange, then we go to `?next=` or the dashboard.
// A recovery link goes to the new-password page instead.
export function AuthCallback() {
  const router = useRouter();
  const [failed, setFailed] = useState("");

  useEffect(() => {
    if (!authEnabled()) {
      setFailed(c.failed);
      return;
    }
    const next = safeNext(new URLSearchParams(window.location.search).get("next"));
    let active = true;
    // This effect runs before the provider's, so load the client here rather than reading getSupabase().
    loadSupabase().then(async (sb) => {
      if (!sb) return { ok: false as const, message: "" };
      const r = await finishAuthFromUrl(sb);
      if (r.ok) {
        // Welcome email (and the recruiter alert) once per account, server side. Failures are ignored and a slow
        // function never holds the redirect for more than 3 seconds.
        try {
          await Promise.race([sb.functions.invoke("on-account-verified"), new Promise((done) => setTimeout(done, 3000))]);
        } catch {}
      }
      return r;
    }).then((r) => {
      if (!active) return;
      if (!r.ok) return setFailed(r.message || c.failed);
      cleanAuthUrl();
      router.replace(r.recovery ? "/account/reset-password/" : next ?? "/account/");
    });
    return () => {
      active = false;
    };
  }, [router]);

  return (
    <AuthSplit sheet="S-001" name={account.login.name} title={c.title} lead={failed ? undefined : c.lead} panelLabel="Student sheet · S-001">
      {failed ? (
        <div className="grid gap-6">
          <Notice tone="error">{failed}</Notice>
          <Button href="/login/" variant="secondary" className="justify-self-start">
            {c.retry}
          </Button>
        </div>
      ) : (
        <FormSkeleton />
      )}
    </AuthSplit>
  );
}
