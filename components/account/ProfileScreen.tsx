"use client";

import { useEffect, useRef, useState } from "react";
import { z } from "@/lib/zod";
import { useAuth } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";
import { initials, verificationLabel, type Profile, type RecruiterProfile } from "@/lib/db";
import { roleLabel } from "@/lib/roles";
import { options } from "@/lib/applySchema";
import {
  ACCOUNT_TYPES,
  CAREER_GOALS,
  COMPANY_SIZES,
  COMPANY_TYPES,
  DEGREE_FIELDS,
  DEGREE_LEVELS,
  EXPECTED_HIRES,
  EXPERIENCE,
  FORMATS,
  HEARD_FROM,
  HIRING_ROLES,
  MIN_AGE,
  REVIT_LEVELS,
  STUDENT_STATUS,
  labelOf,
  ownerSchema,
  phoneRule,
  recruiterSchema,
  studentSchema,
  type Opt,
} from "@/lib/signupSchema";
import { Input, Select } from "@/components/ds/Forms";
import { SheetTag } from "@/components/ds/Devices";
import { Tag } from "@/components/ds/Chips";
import { Check, TextareaField } from "@/components/forms/Field";
import { Button } from "@/components/ui/Button";
import { CheckGroup, DateField, OptSelect } from "./signup/fields";
import { TalentConsent } from "@/components/evaluations/TalentConsent";
import { account } from "@/content/copy-account";
import { AccountShell, Panel } from "./AccountShell";
import { CompletenessMeter } from "./CompletenessMeter";
import { PasswordInput } from "./PasswordInput";
import { Notice, LiveStatus } from "./Notice";
import { Block } from "./Skeleton";
import { extOf } from "./format";
import { useHashScroll } from "./useHashScroll";

const c = account.profile;
const CHOOSE = "Select one";

// Three shapes of the same screen. Every field required at sign-up stays required here: the database refuses to
// clear one on a completed profile (profiles_guard / profile_complete in 0005), so the form checks first.
type Variant = "student" | "recruiter" | "team";

type Values = {
  full_name: string;
  phone: string;
  whatsapp: string;
  country: string;
  city: string;
  language: string;
  date_of_birth: string;
  current_status: string;
  degree_field: string;
  degree_level: string;
  university: string;
  graduation_year: string;
  experience_years: string;
  revit_level: string;
  career_goal: string;
  preferred_format: string;
  heard_from: string;
  linkedin_url: string;
  portfolio_url: string;
  marketing_opt_in: boolean;
  // recruiters: the company row (recruiter_profiles)
  job_title: string;
  company_name: string;
  company_website: string;
  company_type: string;
  company_size: string;
  company_linkedin: string;
  hiring_roles: string[];
  expected_hires: string;
};

const s = (v: string | number | null | undefined) => (v === null || v === undefined ? "" : String(v));

const fromProfile = (p: Profile, r: RecruiterProfile | null): Values => ({
  full_name: s(p.full_name),
  phone: s(p.phone),
  whatsapp: s(p.whatsapp),
  country: s(p.country),
  city: s(p.city),
  language: p.language ?? CHOOSE,
  date_of_birth: s(p.date_of_birth),
  current_status: s(p.current_status),
  degree_field: s(p.degree_field),
  degree_level: s(p.degree_level),
  university: s(p.university),
  graduation_year: s(p.graduation_year),
  experience_years: s(p.experience_years),
  revit_level: s(p.revit_level),
  career_goal: s(p.career_goal),
  preferred_format: s(p.preferred_format),
  heard_from: s(p.heard_from),
  linkedin_url: s(p.linkedin_url),
  portfolio_url: s(p.portfolio_url),
  marketing_opt_in: p.marketing_opt_in,
  job_title: s(r?.job_title),
  company_name: s(r?.company_name),
  company_website: s(r?.company_website),
  company_type: s(r?.company_type),
  company_size: s(r?.company_size),
  company_linkedin: s(r?.linkedin_url),
  hiring_roles: r?.hiring_roles ?? [],
  expected_hires: s(r?.expected_hires),
});

const opt = (v: string) => (v === CHOOSE || v.trim() === "" ? null : v.trim());

// Optional fields kept from v7: a link is empty or a full https link; a WhatsApp number, when given, has the code.
const url = z.string().trim().refine((v) => v === "" || /^https?:\/\/.+\..+/.test(v), c.errors.url);
const extras = z.object({ linkedin_url: url, portfolio_url: url });
const teamExtras = extras.extend({ whatsapp: z.string().trim().refine((v) => v === "" || phoneRule.safeParse(v).success, c.errors.phone) });

type Issues = { success: boolean; error?: { issues: { path: PropertyKey[]; message: string }[] } };
function collect(results: Issues[], rename: Record<string, string> = {}) {
  const out: Record<string, string> = {};
  for (const r of results) {
    if (r.success || !r.error) continue;
    for (const i of r.error.issues) {
      const k = String(i.path[0] ?? "form");
      out[rename[k] ?? k] ??= i.message;
    }
  }
  return out;
}

function validate(variant: Variant, v: Values) {
  if (variant === "student") return collect([studentSchema.safeParse({ ...v, whatsapp_same: false }), extras.safeParse(v)]);
  if (variant === "recruiter") return collect([recruiterSchema.safeParse({ ...v, linkedin_url: v.company_linkedin })], { linkedin_url: "company_linkedin" });
  return collect([ownerSchema.safeParse(v), teamExtras.safeParse(v)]);
}

function profilePatch(variant: Variant, v: Values) {
  const t = (x: string) => x.trim();
  const base = { full_name: t(v.full_name), phone: t(v.phone), country: opt(v.country), city: opt(v.city), marketing_opt_in: v.marketing_opt_in };
  if (variant === "recruiter") return { ...base, heard_from: v.heard_from };
  const links = { language: opt(v.language), linkedin_url: opt(v.linkedin_url), portfolio_url: opt(v.portfolio_url), whatsapp: opt(v.whatsapp) };
  if (variant === "team") return { ...base, ...links };
  return {
    ...base,
    ...links,
    date_of_birth: v.date_of_birth,
    current_status: v.current_status,
    degree_field: v.degree_field,
    degree_level: v.degree_level,
    university: t(v.university),
    graduation_year: Number(v.graduation_year),
    experience_years: v.experience_years,
    revit_level: v.revit_level,
    career_goal: v.career_goal,
    preferred_format: v.preferred_format,
    heard_from: v.heard_from,
  };
}

// Only the company fields: the verification columns are the team's and never leave the browser.
const companyPatch = (v: Values) => ({
  job_title: v.job_title.trim(),
  company_name: v.company_name.trim(),
  company_website: v.company_website.trim(),
  company_type: v.company_type,
  company_size: v.company_size,
  linkedin_url: v.company_linkedin.trim(),
  hiring_roles: v.hiring_roles,
  expected_hires: v.expected_hires,
});

const maxDob = () => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - MIN_AGE);
  return d.toISOString().slice(0, 10);
};

export function ProfileScreen() {
  const { isRecruiter } = useAuth();
  const [deleted, setDeleted] = useState(false);
  if (deleted) return <DeletedScreen />;
  return (
    <AccountShell sheet={c.sheet} name={c.name} title={c.title} lead={isRecruiter ? c.leadRecruiter : c.lead}>
      <Body onDeleted={() => setDeleted(true)} />
    </AccountShell>
  );
}

function DeletedScreen() {
  return (
    <section className="theme-light pt-[72px]">
      <div className="wrap">
        <div className="max-w-[560px] pb-24 pt-20 lg:pt-28">
          <SheetTag sheet={c.sheet} name={c.name} />
          <h1 className="t-h1 mt-8">{c.delete.title}</h1>
          <div className="mt-8">
            <Notice tone="ok">{c.delete.done}</Notice>
          </div>
          <div className="mt-8">
            <Button href="/">Back to home</Button>
          </div>
        </div>
      </div>
    </section>
  );
}

function Body({ onDeleted }: { onDeleted: () => void }) {
  const { user, profile, recruiter, role, isAdmin, isRecruiter, refreshProfile, signOut } = useAuth();
  const variant: Variant = isAdmin ? "team" : isRecruiter ? "recruiter" : "student";
  const [values, setValues] = useState<Values | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  // Fill the form once from the profile; later profile refreshes do not overwrite what the person is typing.
  useEffect(() => {
    if (profile && !values) setValues(fromProfile(profile, recruiter));
  }, [profile, recruiter, values]);

  useHashScroll(values !== null);

  const set = <K extends keyof Values>(k: K, v: Values[K]) => {
    setValues((x) => (x ? { ...x, [k]: v } : x));
    if (errors[k]) setErrors((e) => Object.fromEntries(Object.entries(e).filter(([key]) => key !== k)));
  };

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!values || !user) return;
    const form = e.currentTarget;
    const errs = validate(variant, values);
    setErrors(errs);
    const first = Object.keys(errs)[0];
    if (first) {
      form.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
      return;
    }
    const sb = getSupabase();
    if (!sb) return;
    setSaving(true);
    setMsg(null);
    let failed = false;
    if (variant === "recruiter") {
      const r = await sb.from("recruiter_profiles").update(companyPatch(values)).eq("id", user.id);
      failed = Boolean(r.error);
    }
    if (!failed) {
      const p = await sb.from("profiles").update(profilePatch(variant, values)).eq("id", user.id);
      failed = Boolean(p.error);
    }
    setSaving(false);
    if (failed) return setMsg({ tone: "error", text: c.failed });
    await refreshProfile();
    setMsg({ tone: "ok", text: c.saved });
  }

  if (!values || !user)
    return (
      <div className="grid-12 gap-y-6" aria-busy="true">
        <Block className="col-span-12 h-80 rounded-[12px] lg:col-span-8" />
        <Block className="col-span-12 h-56 rounded-[12px] lg:col-span-4" />
      </div>
    );

  const req = (label: string) => `${label} *`;
  const text = (k: keyof Values, label: string, extra: Partial<React.ComponentProps<typeof Input>> = {}, required = true) => (
    <Input label={required ? req(label) : label} name={k} value={String(values[k] ?? "")} onChange={(ev) => set(k, ev.target.value as never)} error={errors[k]} required={required} {...extra} />
  );
  const pick = (k: keyof Values, label: string, list: Opt[]) => <OptSelect label={req(label)} name={k} options={list} value={String(values[k] ?? "")} onChange={(x) => set(k, x as never)} error={errors[k]} placeholder={c.choose} />;
  const typeLabel = labelOf(ACCOUNT_TYPES, profile?.account_type) || roleLabel[role];

  return (
    <div className="grid-12 gap-y-12">
      <div className="col-span-12 lg:col-span-8">
        <Avatar profile={profile} email={user.email ?? null} userId={user.id} />

        <form onSubmit={save} noValidate className="mt-14 grid gap-14">
          <Panel label={c.sections.identity}>
            <dl className="mb-8 border-b pb-6" style={{ borderColor: "var(--rule)" }} data-testid="account-type">
              <dt className="mono">{c.accountType}</dt>
              <dd className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
                <span className="text-[15px] font-medium text-text">{typeLabel}</span>
                <span className="t-small text-muted">{c.accountTypeNote}</span>
              </dd>
            </dl>
            <p className="t-small mb-7 text-muted">{c.required}</p>
            <div className="grid gap-7 sm:grid-cols-2">
              {text("full_name", c.fields.full_name, { autoComplete: "name", className: "sm:col-span-2" })}
              {text("phone", c.fields.phone, { type: "tel", autoComplete: "tel", inputMode: "tel" })}
              {variant !== "recruiter" && text("whatsapp", c.fields.whatsapp, { type: "tel", inputMode: "tel" }, variant === "student")}
              {variant === "student" && <DateField label={req(c.fields.date_of_birth)} name="date_of_birth" value={values.date_of_birth} onChange={(x) => set("date_of_birth", x)} error={errors.date_of_birth} max={maxDob()} />}
              {variant !== "recruiter" && <Select label={c.fields.language} name="language" options={[CHOOSE, ...options.language]} value={values.language} onChange={(e) => set("language", e.target.value)} />}
            </div>
          </Panel>

          <Panel label={c.sections.location}>
            <div className="grid gap-7 sm:grid-cols-2">
              {text("country", c.fields.country, { autoComplete: "country-name" }, variant !== "team")}
              {text("city", c.fields.city, { autoComplete: "address-level2" }, variant !== "team")}
            </div>
          </Panel>

          {variant === "student" && (
            <>
              <Panel label={c.sections.education}>
                <div className="grid gap-7 sm:grid-cols-2">
                  {pick("current_status", c.fields.current_status, STUDENT_STATUS)}
                  {pick("degree_field", c.fields.degree_field, DEGREE_FIELDS)}
                  {pick("degree_level", c.fields.degree_level, DEGREE_LEVELS)}
                  {text("university", c.fields.university, { autoComplete: "organization" })}
                  {text("graduation_year", c.fields.graduation_year, { inputMode: "numeric", onChange: (ev) => set("graduation_year", ev.target.value.replace(/[^\d]/g, "").slice(0, 4)) })}
                </div>
              </Panel>
              <Panel label={c.sections.goals}>
                <div className="grid gap-7 sm:grid-cols-2">
                  {pick("experience_years", c.fields.experience_years, EXPERIENCE)}
                  {pick("revit_level", c.fields.revit_level, REVIT_LEVELS)}
                  {pick("career_goal", c.fields.career_goal, CAREER_GOALS)}
                  {pick("preferred_format", c.fields.preferred_format, FORMATS)}
                </div>
              </Panel>
            </>
          )}

          {variant === "recruiter" && (
            <Panel id="company" label={c.sections.company} className="scroll-mt-24">
              <p className="t-small mb-7 text-muted">{c.companyLead}</p>
              <div className="grid gap-7 sm:grid-cols-2">
                {text("job_title", c.fields.job_title, { autoComplete: "organization-title" })}
                {text("company_name", c.fields.company_name, { autoComplete: "organization" })}
                {text("company_website", c.fields.company_website, { type: "url", inputMode: "url" })}
                {text("company_linkedin", c.fields.company_linkedin, { type: "url", inputMode: "url" })}
                {pick("company_type", c.fields.company_type, COMPANY_TYPES)}
                {pick("company_size", c.fields.company_size, COMPANY_SIZES)}
                <div className="sm:col-span-2">
                  <CheckGroup legend={c.fields.hiring_roles} name="hiring_roles" options={HIRING_ROLES} value={values.hiring_roles} onChange={(x) => set("hiring_roles", x)} error={errors.hiring_roles} />
                </div>
                {pick("expected_hires", c.fields.expected_hires, EXPECTED_HIRES)}
              </div>
            </Panel>
          )}

          {variant !== "recruiter" && (
            <Panel label={c.sections.links}>
              <div className="grid gap-7 sm:grid-cols-2">
                {text("linkedin_url", c.fields.linkedin_url, { type: "url", inputMode: "url" }, false)}
                {text("portfolio_url", c.fields.portfolio_url, { type: "url", inputMode: "url" }, false)}
              </div>
            </Panel>
          )}

          <Panel label={c.sections.prefs}>
            <div className="grid gap-7">
              {variant !== "team" && pick("heard_from", c.fields.heard_from, HEARD_FROM)}
              <Check name="marketing_opt_in" checked={values.marketing_opt_in} onChange={(e) => set("marketing_opt_in", e.target.checked)} label={c.fields.marketing_opt_in} />
            </div>
          </Panel>

          <div className="grid gap-5">
            {msg && (
              <Notice tone={msg.tone} action={msg.tone === "error" ? { label: account.dashboard.retry, onClick: () => setMsg(null) } : undefined}>
                {msg.text}
              </Notice>
            )}
            <div className="flex items-center gap-6">
              <Button type="submit" disabled={saving} className="sm:min-w-[200px]">
                {saving ? c.saving : c.save}
              </Button>
              <LiveStatus>{saving ? c.saving : ""}</LiveStatus>
            </div>
          </div>
        </form>

        <div className="mt-20 grid gap-14">
          {variant === "student" && <TalentConsent />}
          <EmailSection email={user.email ?? ""} />
          <PasswordSection />
          <DeleteSection userId={user.id} onDone={onDeleted} signOut={signOut} />
        </div>
      </div>

      <aside className="order-first col-span-12 self-start lg:order-none lg:col-span-4 lg:sticky lg:top-24">
        {variant === "student" && <CompletenessMeter profile={profile} className="card p-6" />}
        {variant === "recruiter" && <VerificationCard recruiter={recruiter} />}
      </aside>
    </div>
  );
}

// Read-only: only the academy team changes a verification.
function VerificationCard({ recruiter }: { recruiter: RecruiterProfile | null }) {
  const status = recruiter?.verification_status ?? "pending";
  return (
    <div className="card p-6" data-testid="verification-status" data-status={status}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="mono">{c.verification}</p>
        <Tag tone={status === "approved" ? "blueprint" : status === "pending" ? "brass" : "default"}>{verificationLabel[status]}</Tag>
      </div>
      <p className="t-small mt-4 text-muted">{account.recruiter.banner[status]}</p>
      {status === "rejected" && recruiter?.rejection_note && <p className="t-small mt-3 border-s-2 ps-4 text-text" style={{ borderColor: "var(--err)" }}>{recruiter.rejection_note}</p>}
      <p className="mono mt-5 !normal-case">{c.verificationNote}</p>
    </div>
  );
}

const AVATAR_MAX = 2 * 1024 * 1024;
const AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"];

function Avatar({ profile, email, userId }: { profile: Profile | null; email: string | null; userId: string }) {
  const { refreshProfile } = useAuth();
  const input = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const path = profile?.avatar_path ?? null;

  useEffect(() => {
    const sb = getSupabase();
    if (!sb || !path) return setUrl(null);
    let active = true;
    sb.storage
      .from("avatars")
      .createSignedUrl(path, 3600)
      .then(({ data }) => active && setUrl(data?.signedUrl ?? null));
    return () => {
      active = false;
    };
  }, [path]);

  async function upload(file: File | undefined) {
    const sb = getSupabase();
    if (!file || !sb) return;
    if (!AVATAR_TYPES.includes(file.type)) return setErr(c.avatar.badType);
    if (file.size > AVATAR_MAX) return setErr(c.avatar.tooBig);
    setErr("");
    setBusy(true);
    const p = `${userId}/${crypto.randomUUID()}.${extOf(file)}`;
    const up = await sb.storage.from("avatars").upload(p, file, { contentType: file.type, upsert: false });
    if (!up.error) {
      const { error } = await sb.from("profiles").update({ avatar_path: p }).eq("id", userId);
      if (!error) {
        if (path) await sb.storage.from("avatars").remove([path]);
        await refreshProfile();
      } else setErr(c.avatar.failed);
    } else setErr(c.avatar.failed);
    setBusy(false);
  }

  return (
    <div className="flex flex-wrap items-center gap-6">
      <div className="grid size-20 place-items-center overflow-hidden rounded-full border bg-paper text-[1.25rem] font-semibold text-ink" style={{ borderColor: "var(--rule)" }} aria-hidden={!url}>
        {/* A short-lived signed URL from a private bucket: next/image cannot optimize it on a static export. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {url ? <img src={url} alt={c.avatar.label} width={80} height={80} className="size-full object-cover" /> : initials(profile?.full_name, email)}
      </div>
      <div>
        <p className="mono">{c.avatar.label}</p>
        <div className="mt-2 flex flex-wrap items-center gap-4">
          <button
            type="button"
            disabled={busy}
            onClick={() => input.current?.click()}
            className="inline-flex h-11 items-center rounded-[4px] border px-4 text-[15px] font-medium text-text transition-colors hover:border-accent hover:text-accent-text disabled:opacity-45"
            style={{ borderColor: "var(--rule)" }}
          >
            {busy ? account.documents.uploading : path ? c.avatar.change : c.avatar.add}
          </button>
          <span className="mono">{c.avatar.hint}</span>
        </div>
        <input
          ref={input}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          tabIndex={-1}
          aria-label={c.avatar.change}
          onChange={(e) => {
            void upload(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        {err && (
          <p role="alert" className="mt-2 text-[13px] text-err">
            {err}
          </p>
        )}
      </div>
    </div>
  );
}

function EmailSection({ email }: { email: string }) {
  const [value, setValue] = useState("");
  const [err, setErr] = useState("");
  const [phase, setPhase] = useState<"idle" | "sending" | "sent" | "failed">("idle");
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const v = value.trim().toLowerCase();
    if (!z.string().email().safeParse(v).success) return setErr(c.errors.email);
    if (v === email.toLowerCase()) return setErr(c.errors.same);
    setErr("");
    const sb = getSupabase();
    if (!sb) return;
    setPhase("sending");
    const { error } = await sb.auth.updateUser({ email: v });
    setPhase(error ? "failed" : "sent");
  }
  return (
    <Panel id="email" label={c.email.title}>
      <dl className="mb-6">
        <dt className="mono">{c.email.current}</dt>
        <dd className="mt-1 text-[15px] text-text">{email}</dd>
      </dl>
      <form onSubmit={submit} noValidate className="grid gap-6 sm:grid-cols-[1fr_auto] sm:items-start">
        <Input label={c.email.new_} name="new_email" type="email" autoComplete="email" inputMode="email" value={value} onChange={(e) => setValue(e.target.value)} error={err} />
        <Button type="submit" variant="secondary" disabled={phase === "sending"} className="!h-14">
          {c.email.submit}
        </Button>
      </form>
      <p className="t-small mt-4 text-muted">{c.email.note}</p>
      <div className="mt-4 empty:hidden">
        {phase === "sent" && <Notice tone="ok">{c.email.sent}</Notice>}
        {phase === "failed" && (
          <Notice tone="error" action={{ label: account.dashboard.retry, onClick: () => setPhase("idle") }}>
            {c.email.failed}
          </Notice>
        )}
      </div>
    </Panel>
  );
}

function PasswordSection() {
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [phase, setPhase] = useState<"idle" | "sending" | "saved" | "failed">("idle");
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (pw.length < 8) errs.pw = account.reset.errors.short;
    if (confirm !== pw) errs.confirm = account.reset.errors.mismatch;
    setErrors(errs);
    if (Object.keys(errs).length) return;
    const sb = getSupabase();
    if (!sb) return;
    setPhase("sending");
    const { error } = await sb.auth.updateUser({ password: pw });
    if (!error) {
      setPw("");
      setConfirm("");
    }
    setPhase(error ? "failed" : "saved");
  }
  return (
    <Panel id="password" label={c.password.title}>
      <form onSubmit={submit} noValidate className="grid gap-7 sm:grid-cols-2">
        <PasswordInput label={c.password.new_} name="new_password" value={pw} onChange={setPw} error={errors.pw} strength autoComplete="new-password" />
        <PasswordInput label={c.password.confirm} name="confirm_password" value={confirm} onChange={setConfirm} error={errors.confirm} autoComplete="new-password" />
        <div className="sm:col-span-2">
          <Button type="submit" variant="secondary" disabled={phase === "sending"}>
            {c.password.submit}
          </Button>
        </div>
      </form>
      <div className="mt-4 empty:hidden">
        {phase === "saved" && <Notice tone="ok">{c.password.saved}</Notice>}
        {phase === "failed" && (
          <Notice tone="error" action={{ label: account.dashboard.retry, onClick: () => setPhase("idle") }}>
            {c.password.failed}
          </Notice>
        )}
      </div>
    </Panel>
  );
}

function DeleteSection({ userId, onDone, signOut }: { userId: string; onDone: () => void; signOut: () => Promise<void> }) {
  const [reason, setReason] = useState("");
  const [sure, setSure] = useState(false);
  const [phase, setPhase] = useState<"idle" | "sending" | "failed">("idle");
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!sure) return;
    const sb = getSupabase();
    if (!sb) return;
    setPhase("sending");
    const { error } = await sb.from("account_deletion_requests").insert({ user_id: userId, reason: reason.trim() || null });
    if (error) return setPhase("failed");
    onDone();
    await signOut();
  }
  return (
    <Panel id="delete" label={c.sections.danger}>
      <p className="t-small text-muted">{c.delete.lead}</p>
      <form onSubmit={submit} noValidate className="mt-6 grid gap-6">
        <TextareaField label={c.delete.reason} name="reason" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
        <Check name="sure" checked={sure} onChange={(e) => setSure(e.target.checked)} label={c.delete.confirm} />
        <Button type="submit" variant="secondary" disabled={!sure || phase === "sending"} className="justify-self-start !border-err !text-err hover:!border-err hover:!text-err">
          {c.delete.submit}
        </Button>
      </form>
      {phase === "failed" && (
        <div className="mt-4">
          <Notice tone="error" action={{ label: account.dashboard.retry, onClick: () => setPhase("idle") }}>
            {c.delete.failed}
          </Notice>
        </div>
      )}
    </Panel>
  );
}
