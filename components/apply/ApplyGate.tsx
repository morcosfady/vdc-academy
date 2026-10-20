"use client";

import { useState } from "react";
import Link from "next/link";
import { z } from "zod";
import { Check, Field, SelectField } from "@/components/forms/Field";
import { Button } from "@/components/ui/Button";
import { Photo } from "@/components/ui/Photo";
import { Tabs } from "@/components/ds/Controls";
import { GridBubble, SheetTag } from "@/components/ds/Devices";
import { photos } from "@/assets/images";
import { pages } from "@/content/copy-pages";
import { applyCopy } from "@/content/copy-apply";
import { authCallbackUrl, getSupabase } from "@/lib/supabase";
import { options, statusToEnum } from "@/lib/applySchema";

const c = pages.apply;
const g = applyCopy.gate;
const rule = { borderColor: "var(--rule)" } as const;
const NEXT = "/apply/";

const signupSchema = z.object({
  name: z.string().trim().min(2, g.errors.name),
  email: z.string().trim().email(g.errors.email),
  password: z.string().min(8, g.errors.password),
  status: z.string().min(1, g.errors.status),
  consent: z.literal(true, { message: g.errors.consent }),
  marketing: z.boolean(),
});
const loginSchema = z.object({ email: z.string().trim().email(g.errors.email), password: z.string().min(1, g.errors.wrong) });

type Errors = Record<string, string | undefined>;

// /apply for a visitor without an account: sign up or log in without leaving the page. Once the session exists the
// auth provider updates and ApplyFlow swaps this for the form; any guest draft in localStorage stays untouched.
export function ApplyGate({ note }: { note?: string }) {
  const [tab, setTab] = useState<"signup" | "login">("signup");
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [sent, setSent] = useState<{ kind: "confirm" | "magic"; email: string } | null>(null);

  async function signUp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const parsed = signupSchema.safeParse({ name: f.get("name"), email: f.get("email"), password: f.get("password"), status: f.get("status"), consent: f.get("consent") === "on", marketing: f.get("marketing") === "on" });
    if (!parsed.success) return setErrors(Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])));
    setErrors({});
    const sb = getSupabase();
    if (!sb) return setErrors({ form: g.errors.generic });
    setBusy(true);
    const { data, error } = await sb.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        data: { full_name: parsed.data.name, current_status: statusToEnum(parsed.data.status), marketing_opt_in: parsed.data.marketing },
        emailRedirectTo: authCallbackUrl(NEXT),
      },
    });
    setBusy(false);
    if (error) return setErrors({ form: /registered|exists/i.test(error.message) ? g.errors.exists : g.errors.generic });
    // With email confirmation on there is no session yet: the user confirms, lands on /auth/callback and comes back here.
    if (!data.session) setSent({ kind: "confirm", email: parsed.data.email });
  }

  async function logIn(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const parsed = loginSchema.safeParse({ email: f.get("email"), password: f.get("password") });
    if (!parsed.success) return setErrors(Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])));
    setErrors({});
    const sb = getSupabase();
    if (!sb) return setErrors({ form: g.errors.generic });
    setBusy(true);
    const { error } = await sb.auth.signInWithPassword(parsed.data);
    setBusy(false);
    if (error) setErrors({ form: /confirm/i.test(error.message) ? g.errors.unconfirmed : g.errors.wrong });
  }

  async function magicLink(form: HTMLFormElement | null) {
    const email = String(new FormData(form ?? undefined).get("email") ?? "").trim();
    const parsed = z.string().email(g.errors.email).safeParse(email);
    if (!parsed.success) return setErrors({ email: g.errors.email });
    setErrors({});
    const sb = getSupabase();
    if (!sb) return setErrors({ form: g.errors.generic });
    setBusy(true);
    const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: authCallbackUrl(NEXT), shouldCreateUser: false } });
    setBusy(false);
    if (error) return setErrors({ form: g.errors.generic });
    setSent({ kind: "magic", email });
  }

  return (
    <section className="theme-light pt-[72px]">
      <div className="wrap">
        <div className="grid-12 gap-y-12 pb-24 pt-14 lg:pb-32 lg:pt-20">
          <div className="col-span-12 lg:col-span-6">
            <SheetTag sheet={c.sheet} name={c.name} />
            <h1 className="t-h1 mt-8 max-w-[18ch]">{g.title}</h1>
            <p className="t-lead mt-6 max-w-[48ch]">{g.lead}</p>
            {note && (
              <p className="mt-6 border-s-2 border-brass ps-5 text-[15px] text-warm" role="status">
                {note}
              </p>
            )}

            {sent ? (
              <div className="card mt-10 p-6" role="status">
                <p className="mono">{sent.kind === "confirm" ? g.tabs.signup : g.tabs.login}</p>
                <p className="mt-3 text-[1.25rem] font-medium text-text">{sent.kind === "confirm" ? g.checkEmail : g.magicSent}</p>
                {sent.kind === "confirm" && <p className="t-small mt-2 text-dim">{g.checkEmailNote(sent.email)}</p>}
                <button type="button" onClick={() => setSent(null)} className="mono ul-draw mt-5 min-h-11 hover:!text-text">
                  {c.back}
                </button>
              </div>
            ) : (
              <>
                <Tabs
                  className="mt-10"
                  label={g.tabsLabel}
                  value={tab}
                  onChange={(id) => {
                    setTab(id as "signup" | "login");
                    setErrors({});
                  }}
                  tabs={[
                    { id: "signup", label: g.tabs.signup },
                    { id: "login", label: g.tabs.login },
                  ]}
                />

                {tab === "signup" ? (
                  <form key="signup" role="tabpanel" aria-label={g.tabs.signup} onSubmit={signUp} noValidate className="mt-10 space-y-7">
                    <Field label={g.fields.name} name="name" required autoComplete="name" error={errors.name} />
                    <Field label={g.fields.email} name="email" type="email" required autoComplete="email" error={errors.email} />
                    <div>
                      <Field label={g.fields.password} name="password" type="password" required autoComplete="new-password" minLength={8} error={errors.password} />
                      {!errors.password && <p className="mono mt-2">{g.passwordHint}</p>}
                    </div>
                    <SelectField label={g.fields.status} name="status" required options={options.status} error={errors.status} />
                    <div className="space-y-1">
                      <Check
                        name="consent"
                        label={
                          <>
                            I agree to the{" "}
                            <a href="/privacy/" target="_blank" className="underline underline-offset-4">
                              Privacy Policy
                            </a>{" "}
                            and{" "}
                            <a href="/terms/" target="_blank" className="underline underline-offset-4">
                              Terms
                            </a>
                            . *
                          </>
                        }
                      />
                      {errors.consent && (
                        <p role="alert" className="text-[13px] text-err">
                          {errors.consent}
                        </p>
                      )}
                      <Check name="marketing" label={g.marketing} />
                    </div>
                    {errors.form && (
                      <p role="alert" className="text-[13px] text-err">
                        {errors.form}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center justify-between gap-4 border-t pt-8" style={rule}>
                      <p className="t-small text-dim">
                        {g.fullPages.before}{" "}
                        <Link prefetch={false} href={`/signup/?next=${encodeURIComponent(NEXT)}`} className="underline underline-offset-4 hover:text-text">
                          {g.fullPages.signup}
                        </Link>{" "}
                        {g.fullPages.after}
                      </p>
                      <Button type="submit" disabled={busy}>
                        {busy ? g.creating : g.create}
                      </Button>
                    </div>
                  </form>
                ) : (
                  <form key="login" role="tabpanel" aria-label={g.tabs.login} onSubmit={logIn} noValidate className="mt-10 space-y-7">
                    <Field label={g.fields.email} name="email" type="email" required autoComplete="email" error={errors.email} />
                    <Field label={g.fields.password} name="password" type="password" required autoComplete="current-password" error={errors.password} />
                    {errors.form && (
                      <p role="alert" className="text-[13px] text-err">
                        {errors.form}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center justify-between gap-4 border-t pt-8" style={rule}>
                      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                        <button type="button" disabled={busy} onClick={(e) => magicLink(e.currentTarget.form)} className="mono ul-draw min-h-11 hover:!text-text disabled:opacity-40">
                          {g.magic}
                        </button>
                        <Link prefetch={false} href={`/login/?next=${encodeURIComponent(NEXT)}`} className="t-small text-dim underline underline-offset-4 hover:text-text">
                          {g.fullPages.before} {g.fullPages.login} {g.fullPages.after}
                        </Link>
                      </div>
                      <Button type="submit" disabled={busy}>
                        {busy ? g.loggingIn : g.login}
                      </Button>
                    </div>
                  </form>
                )}
              </>
            )}
          </div>

          <aside className="col-span-12 lg:col-span-5 lg:col-start-8">
            <div className="lg:sticky lg:top-24">
              <figure className="relative overflow-hidden rounded-[12px] bg-paper-2 p-6 pb-5">
                <div className="absolute left-5 top-5 flex gap-2 text-slate" aria-hidden>
                  {["A", "B", "C"].map((l) => (
                    <GridBubble key={l} label={l} size={24} />
                  ))}
                </div>
                <Photo photo={photos.modelPaper} alt={g.modelAlt} className="mx-auto mt-6 max-h-[360px] w-auto object-contain" sizes="(min-width: 1024px) 40vw, 100vw" />
                <figcaption className="mono mt-4 border-t pt-3" style={rule}>
                  {g.modelCaption}
                </figcaption>
              </figure>
              <ul className="mt-6 divide-y border-y" style={rule}>
                {g.perks.map((p, i) => (
                  <li key={p} className="flex items-center gap-5 py-3 text-[15px] text-text" style={rule}>
                    <span className="mono w-8 shrink-0">{String(i + 1).padStart(2, "0")}</span>
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
