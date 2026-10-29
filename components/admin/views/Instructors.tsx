"use client";

import { useMemo, useState } from "react";
import { Chip } from "@/components/ds/Chips";
import { Input } from "@/components/ds/Forms";
import { Button } from "@/components/ui/Button";
import { adminCopy } from "@/content/copy-admin";
import { verificationLabel, type InstructorProfile, type Profile, type VerificationStatus } from "@/lib/db";
import { AVAILABILITY, FORMATS, INDUSTRY_YEARS, INSTRUCTOR_SUBJECTS, TEACHING_YEARS, labelOf } from "@/lib/signupSchema";
import { AdminSection, AdminShell, useToast } from "../AdminShell";
import { BlockSkeleton } from "../Skeleton";
import { EmptyState, ErrorState } from "../States";
import { VerificationBadge } from "../StatusBadge";
import { fmtDate, fmtDateTime, sb, unwrap, useLoad } from "../util";

const c = adminCopy.instructors;
const common = adminCopy.common;
const rule = { borderColor: "var(--rule)" } as const;
const NOTE_MAX = 1000;
const STATUSES: VerificationStatus[] = ["pending", "approved", "rejected"];

type Contact = Pick<Profile, "id" | "full_name" | "email" | "phone" | "country" | "city">;
export type InstructorCardRow = InstructorProfile & { contact: Contact | null };

async function load(): Promise<InstructorCardRow[]> {
  const s = sb();
  const rows = unwrap<InstructorProfile[]>(await s.from("instructor_profiles").select("*").order("created_at", { ascending: false }));
  const ids = rows.map((r) => r.id);
  const people = ids.length ? unwrap<Contact[]>(await s.from("profiles").select("id,full_name,email,phone,country,city").in("id", ids)) : [];
  const by = new Map(people.map((p) => [p.id, p]));
  return rows.map((r) => ({ ...r, contact: by.get(r.id) ?? null }));
}

export function Instructors() {
  const data = useLoad(load, []);
  const { toast, node } = useToast(4200);
  const [status, setStatus] = useState<VerificationStatus | "">("");
  const [q, setQ] = useState("");
  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (data.data ?? []).filter((r) => (!status || r.verification_status === status) && (!needle || [r.contact?.full_name, r.contact?.email].some((v) => (v ?? "").toLowerCase().includes(needle))));
  }, [data.data, status, q]);

  // The database stamps verified_by and verified_at when the status changes; read them back from the reply.
  async function decide(r: InstructorCardRow, next: Exclude<VerificationStatus, "pending">, note: string | null) {
    const patch = next === "approved" ? { verification_status: next, rejection_note: null } : { verification_status: next, rejection_note: note };
    const saved = unwrap<InstructorProfile[]>(await sb().from("instructor_profiles").update(patch).eq("id", r.id).select());
    // The email is best effort: a failed call never blocks the screen.
    try {
      await sb().functions.invoke("on-instructor-verified", { body: { instructor_id: r.id, status: next } });
    } catch {}
    const row = { ...r, ...patch, ...(saved[0] ?? {}) } as InstructorCardRow;
    data.setData((prev) => (prev ?? []).map((x) => (x.id === r.id ? { ...row, contact: x.contact } : x)));
    const when = fmtDateTime(row.verified_at ?? new Date().toISOString());
    toast(next === "approved" ? c.approved(when) : c.rejected(when));
  }

  const all = data.data ?? [];

  return (
    <AdminShell sheet={c.sheet} name={c.name} title={c.title} lead={c.lead} permission="verify_instructors">
      {data.error ? (
        <ErrorState text={data.error} onRetry={data.reload} />
      ) : data.loading ? (
        <div className="grid gap-6">
          <BlockSkeleton lines={5} />
          <BlockSkeleton lines={5} />
        </div>
      ) : all.length === 0 ? (
        <EmptyState title={c.empty.title} text={c.empty.text} />
      ) : (
        <>
          <div className="mb-10 grid gap-5">
            <div className="grid gap-x-6 gap-y-4 md:grid-cols-[minmax(0,420px)_1fr] md:items-center">
              <Input label={c.search} type="search" value={q} onChange={(e) => setQ(e.target.value)} autoComplete="off" data-testid="search" />
            </div>
            <div className="flex flex-wrap items-center gap-2" role="group" aria-label={c.status}>
              <span className="mono me-2">{c.status}</span>
              <Chip active={status === ""} onClick={() => setStatus("")} className="!h-10 !px-3.5 !text-[14px]" data-status="all">
                {c.allStatuses}
              </Chip>
              {STATUSES.map((s) => (
                <Chip key={s} active={status === s} onClick={() => setStatus(s)} className="!h-10 !px-3.5 !text-[14px]" data-status={s}>
                  {verificationLabel[s]}
                </Chip>
              ))}
            </div>
            <div className="border-t pt-4" style={rule}>
              <p className="mono" aria-live="polite" data-testid="count">
                {common.rows(list.length)}
              </p>
            </div>
          </div>

          {list.length === 0 ? (
            <EmptyState title={c.noMatch.title} text={c.noMatch.text} />
          ) : (
            <div className="grid gap-14">
              {c.groups
                .filter((g) => !status || g.id === status)
                .map((g) => {
                  const rows = list.filter((r) => r.verification_status === g.id);
                  return (
                    <AdminSection key={g.id} index={g.index} title={g.title} hint={g.hint} action={<span className="mono">{common.rows(rows.length)}</span>}>
                      {rows.length === 0 ? (
                        <p className="t-small text-dim">{c.groupEmpty}</p>
                      ) : (
                        <ul className="grid gap-5">
                          {rows.map((r) => (
                            <li key={r.id}>
                              <InstructorCard r={r} onDecide={decide} />
                            </li>
                          ))}
                        </ul>
                      )}
                    </AdminSection>
                  );
                })}
            </div>
          )}
        </>
      )}
      {node}
    </AdminShell>
  );
}

function InstructorCard({ r, onDecide }: { r: InstructorCardRow; onDecide: (r: InstructorCardRow, status: "approved" | "rejected", note: string | null) => Promise<void> }) {
  const [busy, setBusy] = useState<"approve" | "reject" | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState("");
  const [noteErr, setNoteErr] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const noteId = `note-${r.id}`;

  async function run(kind: "approve" | "reject") {
    setErr(null);
    if (kind === "reject") {
      const text = note.trim();
      if (!text) return setNoteErr(c.noteRequired);
      if (text.length > NOTE_MAX) return setNoteErr(c.noteTooLong);
    }
    setNoteErr(null);
    setBusy(kind);
    try {
      await onDecide(r, kind === "approve" ? "approved" : "rejected", kind === "reject" ? note.trim() : null);
      setRejecting(false);
      setNote("");
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  const link = (url: string | null) => (url ? <a href={url} target="_blank" rel="noreferrer" className="ul-draw break-all pb-0.5 hover:text-accent-text">{url.replace(/^https?:\/\//, "").replace(/\/$/, "")}</a> : null);
  const p = r.contact;
  const subjects = (r.subjects ?? []).map((x) => labelOf(INSTRUCTOR_SUBJECTS, x)).join(", ");
  const facts: [string, React.ReactNode][] = [
    [c.fields.job, [r.job_title, r.employer].filter(Boolean).join(" · ")],
    [c.fields.industry, labelOf(INDUSTRY_YEARS, r.industry_years)],
    [c.fields.teaching, labelOf(TEACHING_YEARS, r.teaching_years)],
    [c.fields.format, labelOf(FORMATS, r.teaching_format)],
    [c.fields.subjects, subjects || c.noSubjects],
    [c.fields.availability, labelOf(AVAILABILITY, r.availability)],
    [c.fields.linkedin, link(r.linkedin_url)],
    [
      c.fields.contact,
      p ? (
        <span className="grid gap-0.5">
          <span>{p.full_name || c.noName}</span>
          {p.email && (
            <a href={`mailto:${p.email}`} className="ul-draw w-fit break-all pb-0.5 hover:text-accent-text">
              {p.email}
            </a>
          )}
          {p.phone && <span className="mono !text-text">{p.phone}</span>}
          {(p.city || p.country) && <span className="text-dim">{[p.city, p.country].filter(Boolean).join(", ")}</span>}
        </span>
      ) : null,
    ],
    [c.fields.joined, fmtDate(r.created_at)],
  ];

  return (
    <article className="card p-6 md:p-7" data-testid="instructor-card" data-status={r.verification_status} data-id={r.id}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="!text-[1.25rem] !font-semibold !tracking-normal">{p?.full_name || c.noName}</h3>
          {r.verified_at && r.verification_status !== "pending" && (
            <p className="mono mt-2" data-testid="verified-at">
              {c.fields.verified} {fmtDateTime(r.verified_at)}
            </p>
          )}
        </div>
        <VerificationBadge status={r.verification_status} />
      </div>

      <dl className="mt-5 grid overflow-hidden rounded-[4px] border sm:grid-cols-2" style={rule}>
        {facts.map(([k, v], i) => (
          <div key={k} className={`border-b p-4 last:border-b-0 ${i % 2 === 0 ? "sm:border-e" : ""} ${i >= facts.length - 2 ? "sm:border-b-0" : ""}`} style={rule}>
            <dt className="mono">{k}</dt>
            <dd className="mt-1 break-words text-[15px] text-text">{v === null || v === undefined || v === "" ? <span className="text-dim">·</span> : v}</dd>
          </div>
        ))}
      </dl>

      {r.bio && (
        <div className="mt-5 rounded-[4px] border p-4" style={rule}>
          <p className="mono">{c.fields.bio}</p>
          <p className="mt-1 whitespace-pre-line break-words text-[15px] text-text" data-testid="instructor-bio">{r.bio}</p>
        </div>
      )}

      {r.verification_status === "rejected" && r.rejection_note && (
        <div className="mt-5 rounded-[4px] border p-4" style={rule}>
          <p className="mono">{c.fields.note}</p>
          <p className="mt-1 whitespace-pre-line break-words text-[15px] text-text">{r.rejection_note}</p>
        </div>
      )}

      {err && (
        <p role="alert" className="mt-5 rounded-[4px] border px-4 py-3 text-[15px]" style={{ borderColor: "var(--err)", color: "var(--err)" }}>
          {err}
        </p>
      )}

      {rejecting ? (
        <div className="mt-6 grid gap-3">
          <label htmlFor={noteId} className="text-[15px] font-medium text-text">
            {c.noteLabel}
          </label>
          <textarea
            id={noteId}
            value={note}
            onChange={(e) => {
              setNote(e.target.value);
              if (noteErr) setNoteErr(null);
            }}
            rows={3}
            maxLength={NOTE_MAX}
            aria-invalid={noteErr ? true : undefined}
            aria-describedby={`${noteId}-hint${noteErr ? ` ${noteId}-e` : ""}`}
            className="w-full rounded-[4px] border bg-transparent px-4 py-3 text-base text-text outline-none transition-colors focus:border-accent aria-[invalid=true]:border-err"
            style={noteErr ? undefined : rule}
            data-testid="rejection-note"
          />
          <p id={`${noteId}-hint`} className="t-small text-dim">
            {c.noteHint}
          </p>
          {noteErr && (
            <p id={`${noteId}-e`} role="alert" className="text-[13px] leading-5 text-err" data-testid="rejection-note-error">
              {noteErr}
            </p>
          )}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button onClick={() => run("reject")} disabled={busy !== null} className="!h-12 !px-5" data-testid="confirm-reject">
              {busy === "reject" ? c.working : c.sendReject}
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setRejecting(false);
                setNoteErr(null);
              }}
              disabled={busy !== null}
              className="!h-12 !px-5"
            >
              {c.cancel}
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          {r.verification_status !== "approved" && (
            <Button onClick={() => run("approve")} disabled={busy !== null} className="!h-12 !px-5" data-testid="approve-instructor">
              {busy === "approve" ? c.working : c.approve}
            </Button>
          )}
          {r.verification_status !== "rejected" && (
            <Button variant="secondary" onClick={() => setRejecting(true)} disabled={busy !== null} className="!h-12 !px-5" data-testid="reject-instructor">
              {c.reject}
            </Button>
          )}
        </div>
      )}
    </article>
  );
}
