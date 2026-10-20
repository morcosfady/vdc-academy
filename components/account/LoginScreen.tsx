"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { useAuth } from "@/lib/auth";
import { authCallbackUrl, getSupabase, siteUrl } from "@/lib/supabase";
import { Input } from "@/components/ds/Forms";
import { Tabs } from "@/components/ds/Controls";
import { Button } from "@/components/ui/Button";
import { account } from "@/content/copy-account";
import { AuthSplit } from "./AuthSplit";
import { AuthNotice } from "./AuthNotice";
import { GoogleButton } from "./GoogleButton";
import { PasswordInput } from "./PasswordInput";
import { Notice, LiveStatus } from "./Notice";
import { FormSkeleton } from "./Skeleton";
import { useNextParam, withNext } from "./useNext";

const c = account.login;
const emailSchema = z.string().trim().email(c.errors.email);

export function LoginScreen() {
  const { enabled, ready, user } = useAuth();
  const router = useRouter();
  const next = useNextParam();
  const [tab, setTab] = useState<"password" | "magic">("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [phase, setPhase] = useState<"idle" | "sending" | "magicSent">("idle");
  const [failure, setFailure] = useState<"" | "invalid" | "unconfirmed" | "noUser" | "generic">("");
  const [resent, setResent] = useState(false);
  const [forgot, setForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotErr, setForgotErr] = useState("");
  const [forgotPhase, setForgotPhase] = useState<"idle" | "sending" | "sent">("idle");
  const forgotId = useId();

  useEffect(() => {
    if (ready && user) router.replace(next ?? "/account/");
  }, [ready, user, next, router]);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (new FormData(e.currentTarget).get("website")) return;
    const em = emailSchema.safeParse(email);
    const errs: Record<string, string> = {};
    if (!em.success) errs.email = c.errors.email;
    if (tab === "password" && !password) errs.password = c.errors.password;
    setErrors(errs);
    if (Object.keys(errs).length) return;
    const sb = getSupabase();
    if (!sb) return;
    setFailure("");
    setPhase("sending");
    if (tab === "magic") {
      const { error } = await sb.auth.signInWithOtp({ email: em.data as string, options: { emailRedirectTo: authCallbackUrl(next ?? undefined), shouldCreateUser: false } });
      if (error) {
        setPhase("idle");
        setFailure(/not allowed|not found|signups/i.test(error.message) ? "noUser" : "generic");
        return;
      }
      setPhase("magicSent");
      return;
    }
    const { error } = await sb.auth.signInWithPassword({ email: em.data as string, password });
    if (error) {
      setPhase("idle");
      setFailure(/not confirmed/i.test(error.message) ? "unconfirmed" : /invalid/i.test(error.message) ? "invalid" : "generic");
      return;
    }
    router.replace(next ?? "/account/");
  }

  async function resendConfirmation() {
    const sb = getSupabase();
    if (!sb) return;
    await sb.auth.resend({ type: "signup", email: email.trim(), options: { emailRedirectTo: authCallbackUrl(next ?? undefined) } });
    setResent(true);
  }

  async function sendReset(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const em = emailSchema.safeParse(forgotEmail);
    if (!em.success) return setForgotErr(c.errors.email);
    setForgotErr("");
    const sb = getSupabase();
    if (!sb) return;
    setForgotPhase("sending");
    await sb.auth.resetPasswordForEmail(em.data as string, { redirectTo: siteUrl("/account/reset-password/") });
    // Same message whether or not the address exists, so the form never confirms an account.
    setForgotPhase("sent");
  }

  const shell = (children: React.ReactNode) => <AuthSplit sheet={c.sheet} name={c.name} title={c.title} lead={c.lead} panelLabel="Student sheet · S-001">{children}</AuthSplit>;

  if (!ready || user) return shell(<FormSkeleton />);
  if (!enabled) return shell(<AuthNotice />);

  if (phase === "magicSent")
    return shell(
      <div className="grid gap-6">
        <Notice tone="ok">{c.magicSent(email.trim())}</Notice>
        <button type="button" onClick={() => setPhase("idle")} className="ul-draw justify-self-start pb-1 text-[15px] font-medium text-text hover:text-accent-text">
          {c.tabs.password}
        </button>
      </div>,
    );

  return shell(
    <div className="grid gap-7">
      <GoogleButton label={c.google} orLabel={c.or} next={next} />
      <Tabs
        label="Log in method"
        tabs={[
          { id: "password", label: c.tabs.password },
          { id: "magic", label: c.tabs.magic },
        ]}
        value={tab}
        onChange={(id) => {
          setTab(id as "password" | "magic");
          setFailure("");
          setErrors({});
        }}
      />
      <form onSubmit={submit} noValidate className="grid gap-7" aria-label={tab === "password" ? c.tabs.password : c.tabs.magic}>
        <Input label={c.email} name="email" type="email" autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} required />
        {tab === "password" && (
          <div className="grid gap-3">
            <PasswordInput label={c.password} name="password" value={password} onChange={setPassword} error={errors.password} autoComplete="current-password" required />
            <button
              type="button"
              onClick={() => {
                setForgot((f) => !f);
                setForgotEmail((v) => v || email);
              }}
              aria-expanded={forgot}
              aria-controls={forgotId}
              className="ul-draw justify-self-start pb-0.5 text-[15px] text-muted hover:text-accent-text"
            >
              {c.forgot}
            </button>
          </div>
        )}
        <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden className="absolute -start-[9999px] h-0 w-0 opacity-0" />
        {failure && (
          <Notice tone="error" action={failure === "generic" || failure === "invalid" ? { label: account.dashboard.retry, onClick: () => setFailure("") } : undefined}>
            {c.errors[failure]}
            {failure === "unconfirmed" && (
              <>
                {" "}
                <button type="button" onClick={resendConfirmation} disabled={resent} className="ul-draw pb-0.5 font-medium text-text hover:text-accent-text disabled:opacity-60">
                  {resent ? c.errors.resent : c.errors.resend}
                </button>
              </>
            )}
            {failure === "noUser" && (
              <>
                {" "}
                <Link prefetch={false} href={withNext("/signup/", next)} className="ul-draw pb-0.5 font-medium text-text hover:text-accent-text">
                  {c.signup}
                </Link>
              </>
            )}
          </Notice>
        )}
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <Button type="submit" disabled={phase === "sending"} className="sm:min-w-[200px]">
            {phase === "sending" ? (tab === "magic" ? c.magicSending : c.sending) : tab === "magic" ? c.magicSubmit : c.submit}
          </Button>
          <p className="text-[15px] text-muted">
            {c.noAccount}{" "}
            <Link prefetch={false} href={withNext("/signup/", next)} className="ul-draw pb-0.5 font-medium text-text hover:text-accent-text">
              {c.signup}
            </Link>
          </p>
        </div>
        <LiveStatus>{phase === "sending" ? c.sending : ""}</LiveStatus>
      </form>

      <div id={forgotId} hidden={!forgot} className="rounded-[8px] border p-6" style={{ borderColor: "var(--rule)" }}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="!text-[1.125rem] !font-semibold !tracking-normal">{c.forgotTitle}</h2>
            <p className="t-small mt-1 text-muted">{c.forgotLead}</p>
          </div>
          <button type="button" onClick={() => setForgot(false)} aria-label={c.forgotClose} className="-m-2 grid size-11 shrink-0 place-items-center text-ink hover:text-blueprint">
            <svg aria-hidden width="14" height="14" viewBox="0 0 14 14">
              <path d="M1 1l12 12M13 1 1 13" stroke="currentColor" strokeWidth="1.5" fill="none" />
            </svg>
          </button>
        </div>
        {forgotPhase === "sent" ? (
          <div className="mt-5">
            <Notice tone="ok">{c.forgotSent(forgotEmail.trim())}</Notice>
          </div>
        ) : (
          <form onSubmit={sendReset} noValidate className="mt-5 grid gap-6 sm:grid-cols-[1fr_auto] sm:items-start">
            <Input label={c.email} name="reset-email" type="email" autoComplete="email" inputMode="email" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} error={forgotErr} required />
            <Button type="submit" variant="secondary" disabled={forgotPhase === "sending"} className="!h-14">
              {c.forgotSubmit}
            </Button>
          </form>
        )}
      </div>
    </div>,
  );
}
