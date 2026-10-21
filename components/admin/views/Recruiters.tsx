"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { adminCopy } from "@/content/copy-admin";
import type { Profile, RecruiterProfile, VerificationStatus } from "@/lib/db";
import { COMPANY_SIZES, COMPANY_TYPES, EXPECTED_HIRES, HIRING_ROLES, labelOf } from "@/lib/signupSchema";
import { AdminSection, AdminShell, useToast } from "../AdminShell";
import { BlockSkeleton } from "../Skeleton";
import { EmptyState, ErrorState } from "../States";
import { VerificationBadge } from "../StatusBadge";
import { fmtDate, fmtDateTime, sb, unwrap, useLoad } from "../util";

const c = adminCopy.recruiters;
const common = adminCopy.common;
const rule = { borderColor: "var(--rule)" } as const;
const NOTE_MAX = 1000;

type Contact = Pick<Profile, "id" | "full_name" | "email" | "phone" | "country" | "city">;
export type RecruiterCardRow = RecruiterProfile & { contact: Contact | null };

async function load(): Promise<RecruiterCardRow[]> {
  const s = sb();
  const rows = unwrap<RecruiterProfile[]>(await s.from("recruiter_profiles").select("*").order("created_at", { ascending: false }));
  const ids = rows.map((r) => r.id);
  const people = ids.length ? unwrap<Contact[]>(await s.from("profiles").select("id,full_name,email,phone,country,city").in("id", ids)) : [];
  const by = new Map(people.map((p) => [p.id, p]));
  return rows.map((r) => ({ ...r, contact: by.get(r.id) ?? null }));
}

export function Recruiters() {
  const data = useLoad(load, []);
  const { toast, node } = useToast(4200);
  const list = data.data ?? [];

  // The database stamps verified_by and verified_at when the status changes; read them back from the reply.
  async function decide(r: RecruiterCardRow, status: Exclude<VerificationStatus, "pending">, note: string | null) {
    const patch = status === "approved" ? { verification_status: status, rejection_note: null } : { verification_status: status, rejection_note: note };
    const saved = unwrap<RecruiterProfile[]>(await sb().from("recruiter_profiles").update(patch).eq("id", r.id).select());
    try {
      await sb().functions.invoke("on-recruiter-verified", { body: { recruiter_id: r.id, status } });
    } catch {}
    const next = { ...r, ...patch, ...(saved[0] ?? {}) } as RecruiterCardRow;
    data.setData((prev) => (prev ?? []).map((x) => (x.id === r.id ? { ...next, contact: x.contact } : x)));
    const when = fmtDateTime(next.verified_at ?? new Date().toISOString());
    toast(status === "approved" ? c.approved(when) : c.rejected(when));
  }

  return (
    <AdminShell sheet={c.sheet} name={c.name} title={c.title} lead={c.lead} permission="verify_recruiters">
      {data.error ? (
        <ErrorState text={data.error} onRetry={data.reload} />
      ) : data.loading ? (
        <div className="grid gap-6">
          <BlockSkeleton lines={5} />
          <BlockSkeleton lines={5} />
        </div>
      ) : list.length === 0 ? (
        <EmptyState title={c.empty.title} text={c.empty.text} />
      ) : (
        <div className="grid gap-14">
          {c.groups.map((g) => {
            const rows = list.filter((r) => r.verification_status === g.id);
            return (
              <AdminSection key={g.id} index={g.index} title={g.title} hint={g.hint} action={<span className="mono">{common.rows(rows.length)}</span>}>
                {rows.length === 0 ? (
                  <p className="t-small text-dim">{c.groupEmpty}</p>
                ) : (
                  <ul className="grid gap-5">
                    {rows.map((r) => (
                      <li key={r.id}>
                        <RecruiterCard r={r} onDecide={decide} />
                      </li>
                    ))}
                  </ul>
                )}
              </AdminSection>
            );
          })}
        </div>
      )}
      {node}
    </AdminShell>
  );
}

function RecruiterCard({ r, onDecide }: { r: RecruiterCardRow; onDecide: (r: RecruiterCardRow, status: "approved" | "rejected", note: string | null) => Promise<void> }) {
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
  const facts: [string, React.ReactNode][] = [
    [c.fields.type, labelOf(COMPANY_TYPES, r.company_type)],
    [c.fields.size, labelOf(COMPANY_SIZES, r.company_size)],
    [c.fields.website, link(r.company_website)],
    [c.fields.linkedin, link(r.linkedin_url)],
    [c.fields.roles, (r.hiring_roles ?? []).map((x) => labelOf(HIRING_ROLES, x)).join(", ")],
    [c.fields.hires, labelOf(EXPECTED_HIRES, r.expected_hires)],
    [
      c.fields.contact,
      p ? (
        <span className="grid gap-0.5">
          <span>{[p.full_name, r.job_title].filter(Boolean).join(" · ")}</span>
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
    <article className="card p-6 md:p-7" data-testid="recruiter-card" data-status={r.verification_status} data-id={r.id}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="!text-[1.25rem] !font-semibold !tracking-normal">{r.company_name || c.noCompany}</h3>
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
            <Button onClick={() => run("approve")} disabled={busy !== null} className="!h-12 !px-5" data-testid="approve-recruiter">
              {busy === "approve" ? c.working : c.approve}
            </Button>
          )}
          {r.verification_status !== "rejected" && (
            <Button variant="secondary" onClick={() => setRejecting(true)} disabled={busy !== null} className="!h-12 !px-5" data-testid="reject-recruiter">
              {c.reject}
            </Button>
          )}
        </div>
      )}
    </article>
  );
}
