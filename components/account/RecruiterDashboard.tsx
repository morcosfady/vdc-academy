"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";
import { firstName, hiringStatusLabel, verificationLabel, workModeLabel, type HiringRequest, type Profile, type RecruiterProfile } from "@/lib/db";
import { COMPANY_SIZES, COMPANY_TYPES, EXPECTED_HIRES, HIRING_ROLES, labelOf } from "@/lib/signupSchema";
import { emptyHiring, hiringRow, hiringSchema, NOTES_MAX, todayIso, WORK_MODES, type HiringValues } from "@/lib/hiringSchema";
import { Input } from "@/components/ds/Forms";
import { Tag } from "@/components/ds/Chips";
import { TextareaField } from "@/components/forms/Field";
import { Button } from "@/components/ui/Button";
import { DateField, OptSelect } from "./signup/fields";
import { account } from "@/content/copy-account";
import { AccountShell, Panel } from "./AccountShell";
import { LiveStatus, Notice } from "./Notice";
import { Block } from "./Skeleton";
import { shortId } from "./format";
import { useHashScroll } from "./useHashScroll";

const r = account.recruiter;
const h = account.hiring;
const rule = { borderColor: "var(--rule)" };

// A date-only value (YYYY-MM-DD) read as a local day, so Nov 1 never shows as Oct 31 west of UTC.
const fmtDay = (d: string) => {
  const x = new Date(`${d}T00:00:00`);
  return Number.isNaN(x.getTime()) ? d : x.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
};

const Arrow = () => (
  <svg aria-hidden width="16" height="12" viewBox="0 0 16 12">
    <path d="M0 6h14M9 1l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);

// /account/ for recruiters: verification, the company sheet, hiring requests and the talent pool teaser.
// It never reads applications (recruiters have no access to them, and the screen has no use for them).
export function RecruiterDashboard() {
  const { user, profile } = useAuth();
  const name = firstName(profile?.full_name ?? (user?.user_metadata?.full_name as string | undefined));
  return (
    <AccountShell
      sheet={r.sheet}
      name={r.name}
      title={r.welcome(name)}
      lead={r.lead}
      actions={
        <Button href="/account/profile/#company" variant="link">
          {r.company.edit}
        </Button>
      }
    >
      <Body />
    </AccountShell>
  );
}

function Body() {
  const { user, profile, recruiter } = useAuth();
  const [requests, setRequests] = useState<HiringRequest[] | null>(null);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    const sb = getSupabase();
    if (!sb || !user) return;
    setError(false);
    setRequests(null);
    const res = await sb.from("hiring_requests").select("*").eq("recruiter_id", user.id).order("created_at", { ascending: false });
    if (res.error) return setError(true);
    setRequests((res.data ?? []) as HiringRequest[]);
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  useHashScroll(requests !== null || error);

  const status = recruiter?.verification_status ?? "pending";

  return (
    <>
      <VerificationBanner recruiter={recruiter} />

      <div className="grid-12 mt-14 gap-y-10">
        <Panel id="company" label={r.company.label} className="col-span-12 scroll-mt-24 lg:col-span-8">
          <CompanyCard recruiter={recruiter} profile={profile} />
        </Panel>
        <aside className="col-span-12 self-start lg:col-span-4">
          <TalentTeaser />
        </aside>
      </div>

      <div className="grid-12 mt-20 gap-y-14">
        <Panel id="hiring" label={h.label} className="col-span-12 scroll-mt-24 lg:col-span-7">
          <HiringForm userId={user!.id} approved={status === "approved"} onSent={(row) => setRequests((list) => [row, ...(list ?? [])])} />
        </Panel>
        <Panel id="requests" label={h.list} className="col-span-12 scroll-mt-24 lg:col-span-5 lg:col-start-8">
          {error ? (
            <Notice tone="error" action={{ label: account.dashboard.retry, onClick: () => void load() }}>
              {h.loadError}
            </Notice>
          ) : requests === null ? (
            <div className="grid gap-3" aria-busy="true">
              <Block className="h-20" />
              <Block className="h-20" />
            </div>
          ) : requests.length === 0 ? (
            <p className="t-small text-muted">{h.empty}</p>
          ) : (
            <RequestList requests={requests} />
          )}
        </Panel>
      </div>
    </>
  );
}

function VerificationBanner({ recruiter }: { recruiter: RecruiterProfile | null }) {
  const status = recruiter?.verification_status ?? "pending";
  const note = recruiter?.rejection_note?.trim();
  return (
    <div data-testid="verification-banner" data-status={status}>
      <Notice tone={status === "approved" ? "ok" : "info"} className={status === "rejected" ? "!border-err" : undefined}>
        <span className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="mono">{r.banner.label}</span>
          <Tag tone={status === "approved" ? "blueprint" : status === "pending" ? "brass" : "default"}>{verificationLabel[status]}</Tag>
        </span>
        <span className="mt-2 block">{r.banner[status]}</span>
        {status === "rejected" && (
          <>
            {note && (
              <span className="mt-4 block border-s-2 ps-4" style={{ borderColor: "var(--err)" }}>
                <span className="mono block">{r.banner.note}</span>
                <span className="mt-1 block" data-testid="rejection-note">
                  {note}
                </span>
              </span>
            )}
            <span className="mt-4 block text-muted">
              {r.banner.contactText}{" "}
              <Link prefetch={false} href="/contact/" className="ul-draw pb-0.5 font-medium text-text hover:text-accent-text">
                {r.banner.contact}
              </Link>
            </span>
          </>
        )}
      </Notice>
    </div>
  );
}

function CompanyCard({ recruiter, profile }: { recruiter: RecruiterProfile | null; profile: Profile | null }) {
  if (!recruiter?.company_name)
    return (
      <div className="card p-6 md:p-7">
        <p className="t-small text-muted">{r.company.missing}</p>
        <Link prefetch={false} href="/account/profile/#company" className="ul-draw mt-5 inline-flex items-center gap-2 pb-1 text-[15px] font-medium text-text hover:text-accent-text">
          {r.company.edit}
          <Arrow />
        </Link>
      </div>
    );
  const site = recruiter.company_website;
  const roles = (recruiter.hiring_roles ?? []).map((x) => labelOf(HIRING_ROLES, x));
  const row = (label: string, value: React.ReactNode, wide = false) => (
    <div className={wide ? "sm:col-span-2" : undefined}>
      <dt className="mono">{label}</dt>
      <dd className="mt-1 text-[15px] text-text">{value || account.application.empty}</dd>
    </div>
  );
  return (
    <article className="card p-6 md:p-7" aria-labelledby="company-name" data-testid="company-card">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="mono !text-text">CO-{shortId(recruiter.id)}</span>
        <Tag tone={recruiter.verification_status === "approved" ? "blueprint" : "default"}>{verificationLabel[recruiter.verification_status]}</Tag>
      </div>
      <h3 id="company-name" className="mt-5 !text-[1.375rem]">
        {recruiter.company_name}
      </h3>
      {recruiter.job_title && (
        <p className="t-small mt-1 text-muted">
          {[profile?.full_name, recruiter.job_title].filter(Boolean).join(", ")}
        </p>
      )}
      <dl className="mt-5 grid gap-x-8 gap-y-4 border-t pt-4 sm:grid-cols-2" style={rule}>
        {row(r.company.type, labelOf(COMPANY_TYPES, recruiter.company_type))}
        {row(r.company.size, labelOf(COMPANY_SIZES, recruiter.company_size))}
        {row(
          r.company.website,
          site ? (
            <a href={site} target="_blank" rel="noopener noreferrer" className="ul-draw break-all pb-0.5 hover:text-accent-text">
              {site.replace(/^https?:\/\//i, "").replace(/\/$/, "")}
            </a>
          ) : null,
        )}
        {row(r.company.hires, labelOf(EXPECTED_HIRES, recruiter.expected_hires))}
        {row(r.company.roles, roles.join(", "), true)}
      </dl>
      <Link prefetch={false} href="/account/profile/#company" className="ul-draw mt-6 inline-flex items-center gap-2 pb-1 text-[15px] font-medium text-text hover:text-accent-text">
        {r.company.edit}
        <Arrow />
      </Link>
    </article>
  );
}

function TalentTeaser() {
  return (
    <section className="card p-6" aria-labelledby="talent-h" data-testid="talent-pool">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="mono">{r.talent.label}</p>
        <Tag tone="brass">{r.talent.soon}</Tag>
      </div>
      <h3 id="talent-h" className="mt-3 !text-[1.375rem]">
        {r.talent.title}
      </h3>
      <p className="t-small mt-2 text-muted">{r.talent.text}</p>
    </section>
  );
}

function HiringForm({ userId, approved, onSent }: { userId: string; approved: boolean; onSent: (row: HiringRequest) => void }) {
  const [v, setV] = useState<HiringValues>(emptyHiring);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [phase, setPhase] = useState<"idle" | "sending" | "sent" | "failed">("idle");

  const set = (k: keyof HiringValues, value: string) => {
    setV((s) => ({ ...s, [k]: value }));
    if (errors[k]) setErrors((s) => Object.fromEntries(Object.entries(s).filter(([key]) => key !== k)));
    if (phase === "sent" || phase === "failed") setPhase("idle");
  };

  async function submit(ev: React.FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    if (phase === "sending") return;
    const form = ev.currentTarget;
    const parsed = hiringSchema.safeParse(v);
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const i of parsed.error.issues) errs[String(i.path[0])] ??= i.message;
      setErrors(errs);
      form.querySelector<HTMLElement>(`[name="${Object.keys(errs)[0]}"]`)?.focus();
      return;
    }
    setErrors({});
    const sb = getSupabase();
    if (!sb) return;
    setPhase("sending");
    const { data, error } = await sb.from("hiring_requests").insert(hiringRow(parsed.data, userId)).select().single();
    if (error || !data) return setPhase("failed");
    onSent(data as HiringRequest);
    setV(emptyHiring);
    setPhase("sent");
  }

  return (
    <form onSubmit={submit} noValidate className="grid gap-8">
      <div>
        <p id="hiring-lead" className="t-small text-muted">
          {h.lead}
        </p>
        {!approved && (
          <p className="mono mt-3 !normal-case" data-testid="review-note">
            {h.reviewNote}
          </p>
        )}
      </div>
      <div className="grid gap-7 sm:grid-cols-2">
        <OptSelect label={`${h.fields.role} *`} name="role" options={HIRING_ROLES} value={v.role} onChange={(x) => set("role", x)} error={errors.role} placeholder={h.choose} />
        <Input label={`${h.fields.hires} *`} name="hires" inputMode="numeric" autoComplete="off" value={v.hires} onChange={(e) => set("hires", e.target.value.replace(/[^\d]/g, "").slice(0, 3))} error={errors.hires} required />
        <Input label={`${h.fields.location} *`} name="location" autoComplete="off" maxLength={160} value={v.location} onChange={(e) => set("location", e.target.value)} error={errors.location} required />
        <OptSelect label={`${h.fields.work_mode} *`} name="work_mode" options={WORK_MODES} value={v.work_mode} onChange={(x) => set("work_mode", x)} error={errors.work_mode} placeholder={h.choose} />
        <DateField label={`${h.fields.start_date} *`} name="start_date" value={v.start_date} onChange={(x) => set("start_date", x)} error={errors.start_date} min={todayIso()} max={`${Number(todayIso().slice(0, 4)) + 5}-12-31`} />
      </div>
      <div>
        <TextareaField label={h.fields.notes} name="notes" rows={4} maxLength={NOTES_MAX} value={v.notes} onChange={(e) => set("notes", e.target.value)} error={errors.notes} />
        <p className="mono mt-2 text-end !normal-case" aria-live="off">
          {h.notesCount(v.notes.length)}
        </p>
      </div>
      <div className="grid gap-5">
        {phase === "sent" && <Notice tone="ok">{h.sent}</Notice>}
        {phase === "failed" && (
          <Notice tone="error" action={{ label: account.dashboard.retry, onClick: () => setPhase("idle") }}>
            {h.failed}
          </Notice>
        )}
        <div className="flex items-center gap-6">
          <Button type="submit" disabled={phase === "sending"} className="sm:min-w-[200px]">
            {phase === "sending" ? h.sending : h.submit}
          </Button>
          <LiveStatus>{phase === "sending" ? h.sending : ""}</LiveStatus>
        </div>
      </div>
    </form>
  );
}

function RequestList({ requests }: { requests: HiringRequest[] }) {
  return (
    <ul className="border-t" style={rule} data-testid="hiring-list">
      {requests.map((q) => (
        <li key={q.id} className="grid gap-1.5 border-b py-4" style={rule} data-testid="hiring-row">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="mono !text-text">HR-{shortId(q.id)}</span>
            <Tag tone={q.status === "closed" ? "default" : "blueprint"}>{hiringStatusLabel[q.status] ?? q.status}</Tag>
          </div>
          <p className="mt-1 text-[1.0625rem] font-medium text-text">
            {labelOf(HIRING_ROLES, q.role)} · {h.row.hires(q.hires)}
          </p>
          <p className="t-small text-muted">
            {[q.location, workModeLabel[q.work_mode] ?? q.work_mode, `${h.row.starts} ${fmtDay(q.start_date)}`].join(" · ")}
          </p>
        </li>
      ))}
    </ul>
  );
}
