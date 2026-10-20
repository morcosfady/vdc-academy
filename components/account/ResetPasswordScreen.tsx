"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";
import { Button } from "@/components/ui/Button";
import { account } from "@/content/copy-account";
import { AuthSplit } from "./AuthSplit";
import { AuthNotice } from "./AuthNotice";
import { PasswordInput } from "./PasswordInput";
import { Notice, LiveStatus } from "./Notice";
import { FormSkeleton } from "./Skeleton";
import { cleanAuthUrl, finishAuthFromUrl } from "./authUrl";

const c = account.reset;

// New password after a recovery link (or for a signed-in student). The link lands here with a code that supabase-js
// exchanges; when no session results the link is spent and we say so.
export function ResetPasswordScreen() {
  const { enabled, ready, user } = useAuth();
  const router = useRouter();
  const [phase, setPhase] = useState<"checking" | "form" | "expired" | "saving" | "done">("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [failure, setFailure] = useState("");

  useEffect(() => {
    if (!ready || !enabled) return;
    const sb = getSupabase();
    if (!sb) return;
    let active = true;
    finishAuthFromUrl(sb).then((r) => {
      if (!active) return;
      if (r.ok) cleanAuthUrl();
      setPhase(r.ok ? "form" : "expired");
    });
    return () => {
      active = false;
    };
  }, [ready, enabled]);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (password.length < 8) errs.password = c.errors.short;
    if (confirm !== password) errs.confirm = c.errors.mismatch;
    setErrors(errs);
    if (Object.keys(errs).length) return;
    const sb = getSupabase();
    if (!sb) return;
    setFailure("");
    setPhase("saving");
    const { error } = await sb.auth.updateUser({ password });
    if (error) {
      setPhase("form");
      setFailure(c.errors.generic);
      return;
    }
    setPhase("done");
    window.setTimeout(() => router.replace("/account/"), 900);
  }

  const shell = (children: React.ReactNode) => <AuthSplit sheet={c.sheet} name={c.name} title={c.title} lead={c.lead} panelLabel="Student sheet · S-002">{children}</AuthSplit>;

  if (!ready) return shell(<FormSkeleton />);
  if (!enabled) return shell(<AuthNotice />);
  if (phase === "checking") return shell(<FormSkeleton />);
  if (phase === "expired" && !user)
    return shell(
      <div className="grid gap-6">
        <Notice tone="error">{c.expired}</Notice>
        <Button href="/login/" variant="secondary" className="justify-self-start">
          {c.toLogin}
        </Button>
      </div>,
    );
  if (phase === "done") return shell(<Notice tone="ok">{c.done}</Notice>);

  return shell(
    <form onSubmit={submit} noValidate className="grid gap-7">
      <PasswordInput label={c.password} name="password" value={password} onChange={setPassword} error={errors.password} strength autoComplete="new-password" required />
      <PasswordInput label={c.confirm} name="confirm" value={confirm} onChange={setConfirm} error={errors.confirm} autoComplete="new-password" required />
      {failure && (
        <Notice tone="error" action={{ label: account.dashboard.retry, onClick: () => setFailure("") }}>
          {failure}
        </Notice>
      )}
      <Button type="submit" disabled={phase === "saving"} className="justify-self-start sm:min-w-[200px]">
        {phase === "saving" ? c.sending : c.submit}
      </Button>
      <LiveStatus>{phase === "saving" ? c.sending : ""}</LiveStatus>
    </form>,
  );
}
