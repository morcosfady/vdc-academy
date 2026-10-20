"use client";

import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { useAuth } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";
import { currentStatusLabel, initials, type CurrentStatus, type Profile } from "@/lib/db";
import { options } from "@/lib/applySchema";
import { Input, Select } from "@/components/ds/Forms";
import { SheetTag } from "@/components/ds/Devices";
import { Check, TextareaField } from "@/components/forms/Field";
import { Button } from "@/components/ui/Button";
import { account } from "@/content/copy-account";
import { AccountShell, Panel } from "./AccountShell";
import { CompletenessMeter } from "./CompletenessMeter";
import { PasswordInput } from "./PasswordInput";
import { Notice, LiveStatus } from "./Notice";
import { Block } from "./Skeleton";
import { extOf } from "./format";

const c = account.profile;
const CHOOSE = "Select one";
const statusLabels = Object.values(currentStatusLabel);
const statusByLabel = Object.fromEntries(Object.entries(currentStatusLabel).map(([k, v]) => [v, k as CurrentStatus])) as Record<string, CurrentStatus>;

type Values = {
  full_name: string;
  phone: string;
  whatsapp: string;
  country: string;
  city: string;
  age_range: string;
  language: string;
  current_status: string;
  degree: string;
  university: string;
  graduation_year: string;
  linkedin_url: string;
  portfolio_url: string;
  marketing_opt_in: boolean;
};

const url = z.string().trim().refine((v) => v === "" || /^https?:\/\/.+\..+/.test(v), c.errors.url);
const schema = z.object({
  full_name: z.string().trim().min(2, c.errors.name),
  phone: z.string().trim().refine((v) => v === "" || v.replace(/\D/g, "").length >= 7, c.errors.phone),
  whatsapp: z.string().trim().refine((v) => v === "" || v.replace(/\D/g, "").length >= 7, c.errors.phone),
  country: z.string().trim(),
  city: z.string().trim(),
  age_range: z.string(),
  language: z.string(),
  current_status: z.string(),
  degree: z.string(),
  university: z.string().trim(),
  graduation_year: z.string().trim().refine((v) => v === "" || (/^\d{4}$/.test(v) && Number(v) >= 1950 && Number(v) <= 2100), c.errors.year),
  linkedin_url: url,
  portfolio_url: url,
  marketing_opt_in: z.boolean(),
});

const fromProfile = (p: Profile): Values => ({
  full_name: p.full_name ?? "",
  phone: p.phone ?? "",
  whatsapp: p.whatsapp ?? "",
  country: p.country ?? "",
  city: p.city ?? "",
  age_range: p.age_range ?? CHOOSE,
  language: p.language ?? CHOOSE,
  current_status: p.current_status ? currentStatusLabel[p.current_status] : CHOOSE,
  degree: p.degree ?? CHOOSE,
  university: p.university ?? "",
  graduation_year: p.graduation_year ? String(p.graduation_year) : "",
  linkedin_url: p.linkedin_url ?? "",
  portfolio_url: p.portfolio_url ?? "",
  marketing_opt_in: p.marketing_opt_in,
});

const opt = (v: string) => (v === CHOOSE || v === "" ? null : v);

export function ProfileScreen() {
  const [deleted, setDeleted] = useState(false);
  if (deleted) return <DeletedScreen />;
  return (
    <AccountShell sheet={c.sheet} name={c.name} title={c.title} lead={c.lead}>
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
  const { user, profile, refreshProfile, signOut } = useAuth();
  const [values, setValues] = useState<Values | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  // Fill the form once from the profile; later profile refreshes do not overwrite what the student is typing.
  useEffect(() => {
    if (profile && !values) setValues(fromProfile(profile));
  }, [profile, values]);

  const set = <K extends keyof Values>(k: K, v: Values[K]) => setValues((s) => (s ? { ...s, [k]: v } : s));

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!values || !user) return;
    const parsed = schema.safeParse(values);
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])));
      return;
    }
    setErrors({});
    const sb = getSupabase();
    if (!sb) return;
    setSaving(true);
    setMsg(null);
    const d = parsed.data;
    const payload = {
      full_name: d.full_name,
      phone: d.phone || null,
      whatsapp: d.whatsapp || null,
      country: d.country || null,
      city: d.city || null,
      age_range: opt(d.age_range),
      language: opt(d.language),
      current_status: statusByLabel[d.current_status] ?? null,
      degree: opt(d.degree),
      university: d.university || null,
      graduation_year: d.graduation_year ? Number(d.graduation_year) : null,
      linkedin_url: d.linkedin_url || null,
      portfolio_url: d.portfolio_url || null,
      marketing_opt_in: d.marketing_opt_in,
    };
    const { error } = await sb.from("profiles").update(payload).eq("id", user.id);
    setSaving(false);
    if (error) return setMsg({ tone: "error", text: c.failed });
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

  return (
    <div className="grid-12 gap-y-12">
      <div className="col-span-12 lg:col-span-8">
        <Avatar profile={profile} email={user.email ?? null} userId={user.id} />

        <form onSubmit={save} noValidate className="mt-14 grid gap-14">
          <Panel label={c.sections.identity}>
            <div className="grid gap-7 sm:grid-cols-2">
              <Input label={c.fields.full_name} name="full_name" autoComplete="name" value={values.full_name} onChange={(e) => set("full_name", e.target.value)} error={errors.full_name} required className="sm:col-span-2" />
              <Input label={c.fields.phone} name="phone" type="tel" autoComplete="tel" value={values.phone} onChange={(e) => set("phone", e.target.value)} error={errors.phone} />
              <Input label={c.fields.whatsapp} name="whatsapp" type="tel" value={values.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} error={errors.whatsapp} />
              <Select label={c.fields.age_range} name="age_range" options={[CHOOSE, ...options.ageRange]} value={values.age_range} onChange={(e) => set("age_range", e.target.value)} />
              <Select label={c.fields.language} name="language" options={[CHOOSE, ...options.language]} value={values.language} onChange={(e) => set("language", e.target.value)} />
            </div>
          </Panel>

          <Panel label={c.sections.location}>
            <div className="grid gap-7 sm:grid-cols-2">
              <Input label={c.fields.country} name="country" autoComplete="country-name" value={values.country} onChange={(e) => set("country", e.target.value)} />
              <Input label={c.fields.city} name="city" autoComplete="address-level2" value={values.city} onChange={(e) => set("city", e.target.value)} />
            </div>
          </Panel>

          <Panel label={c.sections.education}>
            <div className="grid gap-7 sm:grid-cols-2">
              <Select label={c.fields.current_status} name="current_status" options={[CHOOSE, ...statusLabels]} value={values.current_status} onChange={(e) => set("current_status", e.target.value)} />
              <Select label={c.fields.degree} name="degree" options={[CHOOSE, ...options.degree]} value={values.degree} onChange={(e) => set("degree", e.target.value)} />
              <Input label={c.fields.university} name="university" autoComplete="organization" value={values.university} onChange={(e) => set("university", e.target.value)} />
              <Input label={c.fields.graduation_year} name="graduation_year" inputMode="numeric" value={values.graduation_year} onChange={(e) => set("graduation_year", e.target.value.replace(/[^\d]/g, "").slice(0, 4))} error={errors.graduation_year} />
            </div>
          </Panel>

          <Panel label={c.sections.links}>
            <div className="grid gap-7 sm:grid-cols-2">
              <Input label={c.fields.linkedin_url} name="linkedin_url" type="url" inputMode="url" value={values.linkedin_url} onChange={(e) => set("linkedin_url", e.target.value)} error={errors.linkedin_url} />
              <Input label={c.fields.portfolio_url} name="portfolio_url" type="url" inputMode="url" value={values.portfolio_url} onChange={(e) => set("portfolio_url", e.target.value)} error={errors.portfolio_url} />
            </div>
          </Panel>

          <Panel label={c.sections.prefs}>
            <Check name="marketing_opt_in" checked={values.marketing_opt_in} onChange={(e) => set("marketing_opt_in", e.target.checked)} label={c.fields.marketing_opt_in} />
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
          <EmailSection email={user.email ?? ""} />
          <PasswordSection />
          <DeleteSection userId={user.id} onDone={onDeleted} signOut={signOut} />
        </div>
      </div>

      <aside className="order-first col-span-12 self-start lg:order-none lg:col-span-4 lg:sticky lg:top-24">
        <CompletenessMeter profile={profile} className="card p-6" />
      </aside>
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
