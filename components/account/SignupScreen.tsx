"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { useAuth } from "@/lib/auth";
import { authCallbackUrl, getSupabase } from "@/lib/supabase";
import type { CurrentStatus } from "@/lib/db";
import { Input, Select } from "@/components/ds/Forms";
import { Tag } from "@/components/ds/Chips";
import { Check } from "@/components/forms/Field";
import { Turnstile } from "@/components/forms/Turnstile";
import { Button } from "@/components/ui/Button";
import { account } from "@/content/copy-account";
import { AuthSplit } from "./AuthSplit";
import { AuthNotice } from "./AuthNotice";
import { GoogleButton } from "./GoogleButton";
import { PasswordInput } from "./PasswordInput";
import { Notice, LiveStatus } from "./Notice";
import { FormSkeleton } from "./Skeleton";
import { useNextParam, withNext } from "./useNext";

const c = account.signup;
const CHOOSE = "Select one";
const statusValue: Record<string, CurrentStatus> = { "Fresh graduate": "fresh_grad", Student: "student", Professional: "professional", "Career changer": "career_changer", Other: "other" };

const schema = z.object({
  name: z.string().trim().min(2, c.errors.name),
  email: z.string().trim().email(c.errors.email),
  password: z.string().min(8, c.errors.password),
  status: z.string().refine((v) => v in statusValue, c.errors.status),
  consent: z.literal(true, { message: c.errors.consent }),
});

export function SignupScreen() {
  const { enabled, ready, user } = useAuth();
  const router = useRouter();
  const next = useNextParam();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState(CHOOSE);
  const [consent, setConsent] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [token, setToken] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [phase, setPhase] = useState<"idle" | "sending" | "done">("idle");
  const [failure, setFailure] = useState("");
  const [resent, setResent] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (new FormData(e.currentTarget).get("website")) return; // honeypot
    const parsed = schema.safeParse({ name, email, password, status, consent });
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])));
      return;
    }
    setErrors({});
    setFailure("");
    const sb = getSupabase();
    if (!sb) return;
    setPhase("sending");
    const { data, error } = await sb.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        data: { full_name: parsed.data.name, current_status: statusValue[parsed.data.status], marketing_opt_in: marketing },
        emailRedirectTo: authCallbackUrl(next ?? undefined),
        ...(token ? { captchaToken: token } : {}),
      },
    });
    if (error) {
      setPhase("idle");
      setFailure(/already|exists|registered/i.test(error.message) ? c.errors.exists : c.errors.generic);
      return;
    }
    // Some projects confirm automatically; then there is a session and we can go straight in.
    if (data.session) {
      router.replace(next ?? "/account/");
      return;
    }
    setPhase("done");
  }

  async function resend() {
    const sb = getSupabase();
    if (!sb) return;
    await sb.auth.resend({ type: "signup", email: email.trim(), options: { emailRedirectTo: authCallbackUrl(next ?? undefined) } });
    setResent(true);
  }

  const shell = (children: React.ReactNode) => <AuthSplit sheet={c.sheet} name={c.name} title={phase === "done" ? c.check.title : c.title} lead={phase === "done" ? c.check.lead(email.trim()) : c.lead} panelLabel="Student sheet · S-000" >{children}</AuthSplit>;

  if (!ready) return shell(<FormSkeleton />);
  if (!enabled) return shell(<AuthNotice />);
  if (user) {
    router.replace(next ?? "/account/");
    return shell(<FormSkeleton />);
  }

  if (phase === "done")
    return shell(
      <div className="grid gap-6">
        <Notice tone="ok">{c.check.lead(email.trim())}</Notice>
        <div className="flex flex-wrap items-center gap-6">
          <Button type="button" variant="secondary" onClick={resend} disabled={resent}>
            {c.check.resend}
          </Button>
          <Link prefetch={false} href={withNext("/login/", next)} className="ul-draw pb-1 text-[15px] font-medium text-text hover:text-accent-text">
            {c.check.back}
          </Link>
        </div>
        <LiveStatus>{resent ? c.check.resent : ""}</LiveStatus>
      </div>,
    );

  const fresh = status === "Fresh graduate";

  return shell(
    <form onSubmit={submit} noValidate className="grid gap-7">
      <GoogleButton label={c.google} orLabel={c.or} next={next} />
      <Input label={c.name_} name="name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} error={errors.name} required />
      <Input label={c.email} name="email" type="email" autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} required />
      <PasswordInput label={c.password} name="password" value={password} onChange={setPassword} error={errors.password} strength autoComplete="new-password" required />
      <div className="grid gap-3">
        <Select label={c.status} name="status" options={[CHOOSE, ...c.statusOptions]} value={status} onChange={(e) => setStatus(e.target.value)} error={errors.status} required />
        {fresh && (
          <div aria-live="polite">
            <Tag tone="brass" className="!h-7 !px-2.5">
              {c.freshPill}
            </Tag>
          </div>
        )}
      </div>
      <div className="grid gap-1">
        <Check name="consent" checked={consent} onChange={(e) => setConsent(e.target.checked)} aria-invalid={errors.consent ? true : undefined} aria-describedby={errors.consent ? "consent-err" : undefined} label={<ConsentLabel />} />
        {errors.consent && (
          <p id="consent-err" role="alert" className="ps-7 text-[13px] leading-5 text-err">
            {errors.consent}
          </p>
        )}
        <Check name="marketing" checked={marketing} onChange={(e) => setMarketing(e.target.checked)} label={c.marketing} />
      </div>
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden className="absolute -start-[9999px] h-0 w-0 opacity-0" />
      <div className="empty:hidden">
        <Turnstile onToken={setToken} />
      </div>
      {failure && (
        <Notice tone="error" action={/exists/i.test(failure) ? undefined : { label: account.dashboard.retry, onClick: () => setFailure("") }}>
          {failure}{" "}
          {failure === c.errors.exists && (
            <Link prefetch={false} href={withNext("/login/", next)} className="ul-draw pb-0.5 font-medium text-text hover:text-accent-text">
              {c.login}
            </Link>
          )}
        </Notice>
      )}
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <Button type="submit" disabled={phase === "sending"} className="sm:min-w-[200px]">
          {phase === "sending" ? c.sending : c.submit}
        </Button>
        <p className="text-[15px] text-muted">
          {c.haveAccount}{" "}
          <Link prefetch={false} href={withNext("/login/", next)} className="ul-draw pb-0.5 font-medium text-text hover:text-accent-text">
            {c.login}
          </Link>
        </p>
      </div>
      <LiveStatus>{phase === "sending" ? c.sending : ""}</LiveStatus>
    </form>,
  );
}

function ConsentLabel() {
  return (
    <>
      I agree to the{" "}
      <Link prefetch={false} href="/privacy/" className="ul-draw pb-0.5 font-medium text-text hover:text-accent-text">
        Privacy Policy
      </Link>{" "}
      and{" "}
      <Link prefetch={false} href="/terms/" className="ul-draw pb-0.5 font-medium text-text hover:text-accent-text">
        Terms
      </Link>
      , and to be contacted about my application.
    </>
  );
}
