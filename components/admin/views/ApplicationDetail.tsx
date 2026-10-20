"use client";

import { useState } from "react";
import Link from "next/link";
import { Toggle } from "@/components/ds/Controls";
import { Select } from "@/components/ds/Forms";
import { Button } from "@/components/ui/Button";
import { adminCopy } from "@/content/copy-admin";
import { useAuth } from "@/lib/auth";
import { PIPELINE, currentStatusLabel, profileCompleteness, statusLabel, type Application, type ApplicationEvent, type ApplicationStatus, type Profile } from "@/lib/db";
import { AdminSection, AdminShell, useToast } from "../AdminShell";
import { BlockSkeleton } from "../Skeleton";
import { EmptyState, ErrorState } from "../States";
import { DiscountBadge, StatusBadge } from "../StatusBadge";
import { digits, discountLabel, fmtDate, fmtDateTime, programTitles, sb, skillsText, unwrap, useLoad, useQuery } from "../util";

const c = adminCopy.detail;
const common = adminCopy.common;
const rule = { borderColor: "var(--rule)" } as const;
const STATUS_OPTIONS: ApplicationStatus[] = [...PIPELINE, "waitlist", "rejected"];

type Loaded = { app: Application; profile: Profile | null; events: ApplicationEvent[]; proofUrl: string | null; cvUrl: string | null };

async function load(id: string): Promise<Loaded | null> {
  const s = sb();
  const app = unwrap<Application | null>(await s.from("applications").select("*").eq("id", id).maybeSingle());
  if (!app) return null;
  const [profile, events, proof, cv] = await Promise.all([
    app.user_id ? s.from("profiles").select("*").eq("id", app.user_id).maybeSingle().then((r) => unwrap<Profile | null>(r)) : Promise.resolve(null),
    s.from("application_events").select("*").eq("application_id", id).order("created_at", { ascending: false }).then((r) => unwrap<ApplicationEvent[]>(r)),
    app.proof_file_path ? s.storage.from("documents").createSignedUrl(app.proof_file_path, 300).then((r) => r.data?.signedUrl ?? null) : Promise.resolve(null),
    app.cv_file_path ? s.storage.from("documents").createSignedUrl(app.cv_file_path, 300).then((r) => r.data?.signedUrl ?? null) : Promise.resolve(null),
  ]);
  return { app, profile, events, proofUrl: proof, cvUrl: cv };
}

async function loadEvents(id: string) {
  return unwrap<ApplicationEvent[]>(await sb().from("application_events").select("*").eq("application_id", id).order("created_at", { ascending: false }));
}

export function ApplicationDetail() {
  const q = useQuery();
  const id = q?.get("id") ?? "";
  const data = useLoad(() => load(id), [id], q !== null && id !== "");
  const title = data.data?.app.full_name || c.name;

  return (
    <AdminShell
      sheet={c.sheet}
      name={c.name}
      title={title}
      lead={data.data ? <span className="mono">{data.data.app.email}</span> : undefined}
      actions={
        <Link prefetch={false} href="/admin/applications/" className="ul-draw inline-flex items-center gap-2 pb-1 text-[15px] font-medium text-text hover:text-accent-text">
          <svg aria-hidden width="16" height="12" viewBox="0 0 16 12" className="rotate-180">
            <path d="M0 6h14M9 1l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.5" />
          </svg>
          {c.back}
        </Link>
      }
    >
      {q && !id ? (
        <EmptyState title={c.missingId.title} text={c.missingId.text} action={<Button href="/admin/applications/" variant="secondary">{c.back}</Button>} />
      ) : data.error ? (
        <ErrorState text={data.error} onRetry={data.reload} />
      ) : data.loading || !q ? (
        <div className="grid gap-8 lg:grid-cols-12">
          <div className="grid gap-8 lg:col-span-8">
            <BlockSkeleton lines={6} />
            <BlockSkeleton lines={4} />
          </div>
          <div className="grid gap-8 lg:col-span-4">
            <BlockSkeleton lines={3} />
            <BlockSkeleton lines={2} />
          </div>
        </div>
      ) : !data.data ? (
        <EmptyState title={c.notFound.title} text={c.notFound.text} action={<Button href="/admin/applications/" variant="secondary">{c.back}</Button>} />
      ) : (
        <Body
          d={data.data}
          id={id}
          refreshEvents={async () => {
            const events = await loadEvents(id);
            data.setData((prev) => (prev ? { ...prev, events } : prev));
          }}
          refreshAll={data.reload}
          patchApp={(p) => data.setData((prev) => (prev ? { ...prev, app: { ...prev.app, ...p } } : prev))}
        />
      )}
    </AdminShell>
  );
}

function Body({ d, id, refreshEvents, refreshAll, patchApp }: { d: Loaded; id: string; refreshEvents: () => Promise<void>; refreshAll: () => void; patchApp: (p: Partial<Application>) => void }) {
  const { app, profile, events } = d;
  const { user } = useAuth();
  const { toast, node } = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function run(key: string, fn: () => Promise<void>, done: string) {
    setBusy(key);
    setErr(null);
    try {
      await fn();
      toast(done);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  // Status: update the row, the trigger writes the status_change event, then the email function (failures ignored).
  const [nextStatus, setNextStatus] = useState<ApplicationStatus>(app.status === "draft" ? "submitted" : app.status);
  const changeStatus = () =>
    run(
      "status",
      async () => {
        if (nextStatus === app.status) throw new Error(c.status.same);
        unwrap(await sb().from("applications").update({ status: nextStatus }).eq("id", id));
        try {
          await sb().functions.invoke("on-status-changed", { body: { application_id: id, to_status: nextStatus } });
        } catch {}
        patchApp({ status: nextStatus });
        await refreshEvents();
      },
      c.status.done,
    );

  // Discount: verified or rejected, plus a note the student can read.
  const decideDiscount = (ok: boolean) =>
    run(
      ok ? "verify" : "reject",
      async () => {
        unwrap(await sb().from("applications").update({ discount_status: ok ? "verified" : "rejected", discount_verified: ok }).eq("id", id));
        unwrap(await sb().from("application_events").insert({ application_id: id, actor_id: user?.id ?? null, type: "note", note: ok ? c.discount.verifiedNote : c.discount.rejectedNote, visible_to_student: true }));
        patchApp({ discount_status: ok ? "verified" : "rejected", discount_verified: ok });
        await refreshEvents();
      },
      c.discount.done,
    );

  // Notes: internal by default, or visible to the student.
  const [note, setNote] = useState("");
  const [visible, setVisible] = useState(false);
  const addNote = () =>
    run(
      "note",
      async () => {
        if (!note.trim()) throw new Error(c.notes.empty);
        unwrap(await sb().from("application_events").insert({ application_id: id, actor_id: user?.id ?? null, type: "note", note: note.trim(), visible_to_student: visible }));
        setNote("");
        setVisible(false);
        await refreshEvents();
      },
      c.notes.done,
    );

  const phone = digits(app.phone ?? profile?.phone);
  const wa = digits(app.whatsapp ?? profile?.whatsapp) || phone;
  const yesNo = (v: boolean | null | undefined) => (v ? common.yes : common.no);
  const link = (url: string | null) => (url ? <a href={url} target="_blank" rel="noreferrer" className="ul-draw break-all pb-0.5 hover:text-accent-text">{url.replace(/^https?:\/\//, "")}</a> : null);

  const groups: { index: string; title: string; rows: [string, React.ReactNode][] }[] = [
    {
      index: "01",
      title: c.groups.about,
      rows: [
        [c.fields.full_name, app.full_name],
        [c.fields.email, app.email],
        [c.fields.phone, app.phone],
        [c.fields.whatsapp, app.whatsapp],
        [c.fields.country, app.country],
        [c.fields.city, app.city],
        [c.fields.dob_or_age, app.dob_or_age],
        [c.fields.language, app.language],
      ],
    },
    {
      index: "02",
      title: c.groups.education,
      rows: [
        [c.fields.current_status, app.current_status && app.current_status in currentStatusLabel ? currentStatusLabel[app.current_status as keyof typeof currentStatusLabel] : app.current_status],
        [c.fields.degree, app.degree],
        [c.fields.university, app.university],
        [c.fields.graduation_year, app.graduation_year],
        [c.fields.gpa, app.gpa],
      ],
    },
    {
      index: "03",
      title: c.groups.experience,
      rows: [
        [c.fields.experience_years, app.experience_years],
        [c.fields.job_title, app.job_title],
        [c.fields.company, app.company],
        [c.fields.software_skills, skillsText(app.software_skills)],
        [c.fields.career_goal, app.career_goal],
        [c.fields.linkedin_url, link(app.linkedin_url)],
        [c.fields.portfolio_url, link(app.portfolio_url)],
      ],
    },
    {
      index: "04",
      title: c.groups.program,
      rows: [
        [c.fields.programs, programTitles(app.programs).join(", ")],
        [c.fields.format, app.format],
        [c.fields.schedule, app.schedule],
        [c.fields.start_pref, app.start_pref],
        [c.fields.has_laptop, app.has_laptop],
        [c.fields.source, app.source],
      ],
    },
    {
      index: "05",
      title: c.groups.consent,
      rows: [
        [c.fields.consent_privacy, yesNo(app.consent_privacy)],
        [c.fields.consent_contact, yesNo(app.consent_contact)],
        [c.fields.newsletter, yesNo(app.newsletter)],
        [c.fields.discount_type, discountLabel(app.discount_type) || common.none],
        [c.fields.discount_percent, app.discount_percent != null ? `${app.discount_percent}%` : null],
        [c.fields.discount_status, app.discount_type ? <DiscountBadge status={app.discount_status} /> : null],
        [c.fields.utm, app.utm ? Object.entries(app.utm).map(([k, v]) => `${k}=${v}`).join(" ") : null],
      ],
    },
    {
      index: "06",
      title: c.groups.meta,
      rows: [
        [c.fields.created_at, fmtDateTime(app.created_at)],
        [c.fields.submitted_at, fmtDateTime(app.submitted_at)],
        [c.fields.updated_at, fmtDateTime(app.updated_at)],
        [c.fields.id, <span key="id" className="mono break-all !text-text">{app.id}</span>],
      ],
    },
  ];

  const statusOptions = STATUS_OPTIONS.map((s) => statusLabel[s]);
  const completeness = profileCompleteness(profile);

  return (
    <>
      <div className="grid gap-12 lg:grid-cols-12 lg:gap-8">
        {/* Facts, grouped like the apply steps */}
        <div className="grid gap-10 lg:col-span-8">
          {groups.map((g) => (
            <AdminSection key={g.index} index={g.index} title={g.title}>
              <dl className="grid overflow-hidden rounded-[4px] border sm:grid-cols-2" style={rule}>
                {g.rows.map(([k, v], i) => (
                  <div key={k} className={`border-b p-4 last:border-b-0 ${i % 2 === 0 ? "sm:border-e" : ""} ${i >= g.rows.length - 2 && g.rows.length % 2 === 0 ? "sm:border-b-0" : ""}`} style={rule}>
                    <dt className="mono">{k}</dt>
                    <dd className="mt-1 break-words text-[15px] text-text">{v === null || v === undefined || v === "" ? <span className="text-dim">·</span> : v}</dd>
                  </div>
                ))}
              </dl>
            </AdminSection>
          ))}

          <AdminSection index="07" title={c.notes.title}>
            <div className="grid gap-4">
              <div className="relative">
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  aria-label={c.notes.label}
                  placeholder={c.notes.label}
                  className="w-full rounded-[4px] border bg-transparent px-4 py-3 text-base text-text outline-none transition-colors placeholder:text-dim focus:border-accent"
                  style={rule}
                  data-testid="note"
                />
              </div>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <Toggle checked={visible} onChange={setVisible} label={c.notes.visible} />
                <Button onClick={addNote} disabled={busy !== null} className="!h-11 !px-5" data-testid="add-note">
                  {busy === "note" ? c.notes.adding : c.notes.add}
                </Button>
              </div>
            </div>
          </AdminSection>

          <AdminSection index="08" title={c.log.title}>
            {events.length === 0 ? (
              <p className="t-small text-dim">{c.log.empty}</p>
            ) : (
              <ol className="list-none" data-testid="activity">
                {events.map((e) => (
                  <li key={e.id} className="grid gap-x-5 gap-y-1 border-b py-4 last:border-b-0 sm:grid-cols-[150px_1fr]" style={rule} data-testid="event">
                    <p className="mono">{fmtDateTime(e.created_at)}</p>
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-2">
                        <span className="mono !text-text">{c.log.types[e.type]}</span>
                        <span className="mono inline-flex h-5 items-center rounded-[4px] border px-1.5" style={e.visible_to_student ? { borderColor: "transparent", background: "var(--mist)", color: "#1c4a96" } : rule}>
                          {e.visible_to_student ? common.studentSees : common.internal}
                        </span>
                      </p>
                      <p className="mt-1 break-words text-[15px] text-text">
                        {e.type === "status_change" ? c.log.statusChange(e.from_status ? statusLabel[e.from_status] : common.unknown, e.to_status ? statusLabel[e.to_status] : common.unknown) : e.note}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </AdminSection>
        </div>

        {/* Controls */}
        <aside className="order-first grid content-start gap-6 lg:order-none lg:col-span-4 lg:sticky lg:top-24 lg:self-start">
          {err && (
            <p role="alert" className="rounded-[4px] border px-4 py-3 text-[15px]" style={{ borderColor: "var(--clash)", color: "var(--clash)" }}>
              {err}
            </p>
          )}

          <div className="card p-6">
            <div className="flex items-center justify-between gap-4">
              <p className="mono">{c.status.title}</p>
              <StatusBadge status={app.status} />
            </div>
            <div className="mt-5 grid gap-4">
              <Select label={c.status.select} options={statusOptions} value={statusLabel[nextStatus]} onChange={(e) => setNextStatus(STATUS_OPTIONS.find((s) => statusLabel[s] === e.target.value) ?? nextStatus)} data-testid="status-select" />
              <Button onClick={changeStatus} disabled={busy !== null || nextStatus === app.status} className="!h-12" data-testid="status-apply">
                {busy === "status" ? c.status.updating : c.status.apply}
              </Button>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center justify-between gap-4">
              <p className="mono">{c.discount.title}</p>
              {app.discount_type && <DiscountBadge status={app.discount_status} />}
            </div>
            {app.discount_type ? (
              <>
                <p className="mt-3 text-[15px] text-text">
                  {discountLabel(app.discount_type)}
                  {app.discount_percent != null && <span className="mono ms-2 !text-warm">−{app.discount_percent}%</span>}
                </p>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <Button onClick={() => decideDiscount(true)} disabled={busy !== null || app.discount_status === "verified"} className="!h-12 !px-4" data-testid="verify-discount">
                    {busy === "verify" ? c.discount.working : c.discount.verify}
                  </Button>
                  <Button variant="secondary" onClick={() => decideDiscount(false)} disabled={busy !== null || app.discount_status === "rejected"} className="!h-12 !px-4" data-testid="reject-discount">
                    {busy === "reject" ? c.discount.working : c.discount.reject}
                  </Button>
                </div>
              </>
            ) : (
              <p className="t-small mt-3 text-dim">{c.discount.none}</p>
            )}
          </div>

          <div className="card p-6">
            <p className="mono">{c.documents.title}</p>
            {d.proofUrl || d.cvUrl ? (
              <>
                <ul className="mt-4 grid gap-3" data-testid="documents">
                  {d.proofUrl && (
                    <li>
                      <DocLink href={d.proofUrl} label={c.documents.proof} />
                    </li>
                  )}
                  {d.cvUrl && (
                    <li>
                      <DocLink href={d.cvUrl} label={c.documents.cv} />
                    </li>
                  )}
                </ul>
                <p className="mono mt-4">
                  {c.documents.expires}{" "}
                  <button type="button" onClick={refreshAll} className="underline underline-offset-2 hover:text-text">
                    {common.retry}
                  </button>
                </p>
              </>
            ) : (
              <p className="t-small mt-3 text-dim">{c.documents.none}</p>
            )}
          </div>

          <div className="card p-6">
            <p className="mono">{c.actions.title}</p>
            <div className="mt-4 flex flex-wrap gap-x-7 gap-y-3">
              {app.email && (
                <a href={`mailto:${app.email}`} className="ul-draw pb-0.5 text-[15px] font-medium text-text hover:text-accent-text">
                  {c.actions.email}
                </a>
              )}
              {wa && (
                <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer" className="ul-draw pb-0.5 text-[15px] font-medium text-text hover:text-accent-text">
                  {c.actions.whatsapp}
                </a>
              )}
              {phone && (
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(app.phone ?? profile?.phone ?? "");
                      toast(common.copied);
                    } catch {}
                  }}
                  className="ul-draw pb-0.5 text-[15px] font-medium text-text hover:text-accent-text"
                >
                  {c.actions.copyPhone}
                </button>
              )}
            </div>
          </div>

          <div className="card p-6">
            <p className="mono">{c.profile.title}</p>
            {profile ? (
              <dl className="mt-4 grid gap-3 text-[15px]">
                <Row k={c.fields.full_name} v={profile.full_name} />
                <Row k={c.fields.email} v={profile.email} />
                <Row k={c.profile.role} v={profile.role} />
                <Row k={c.profile.memberSince} v={fmtDate(profile.created_at)} />
                <Row k={c.profile.completeness} v={`${completeness.percent}%`} />
              </dl>
            ) : (
              <p className="t-small mt-3 text-dim">{c.profile.none}</p>
            )}
          </div>
        </aside>
      </div>
      {node}
    </>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b pb-3 last:border-b-0 last:pb-0" style={rule}>
      <dt className="mono shrink-0">{k}</dt>
      <dd className="min-w-0 break-words text-end text-text">{v || <span className="text-dim">·</span>}</dd>
    </div>
  );
}

function DocLink({ href, label }: { href: string; label: string }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="group flex items-center justify-between gap-3 rounded-[4px] border px-4 py-3 text-[15px] font-medium text-text transition-colors hover:border-accent hover:text-accent-text" style={rule}>
      {label}
      <svg aria-hidden width="16" height="12" viewBox="0 0 16 12" className="transition-transform group-hover:translate-x-0.5">
        <path d="M0 6h14M9 1l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    </a>
  );
}
