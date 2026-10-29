"use client";

import { useEffect, useMemo, useState } from "react";
import { Chip, Tag } from "@/components/ds/Chips";
import { Input } from "@/components/ds/Forms";
import { Drawer } from "@/components/ds/Overlays";
import { Button } from "@/components/ui/Button";
import { ScoreBars, criteriaItems } from "@/components/evaluations/parts";
import { adminCopy } from "@/content/copy-admin";
import { evaluations } from "@/content/copy-evaluations";
import { evaluationStatusLabel, type EvaluationStatus, type InstructorEvaluation, type Profile } from "@/lib/db";
import { CRITERIA } from "@/lib/evaluationSchema";
import { instructorContextLabel, readinessLabel } from "@/lib/instructorEvaluationSchema";
import { INSTRUCTOR_SUBJECTS, labelOf } from "@/lib/signupSchema";
import { AdminShell, useToast } from "../AdminShell";
import { CsvButton } from "../CsvButton";
import { DataTable, type Column } from "../DataTable";
import { TableSkeleton } from "../Skeleton";
import { EmptyState, ErrorState } from "../States";
import { EvaluationBadge } from "../StatusBadge";
import { fmtDate, fmtDateTime, sb, unwrap, useLoad } from "../util";

// The Instructors side of /admin/evaluations/: the same moderation as the recruiter side (Evaluations.tsx), on the table
// public.instructor_evaluations (migration 0009). The team reads everything, including the private note, then publishes
// or hides (hiding needs a note). Publishing asks the Edge Function to email the student; a failed call never blocks.

const c = evaluations.admin; // shared words: buttons, notes, toasts
const x = adminCopy.instructorEvaluations;
const common = adminCopy.common;
const PAGE = 25;
const NOTE_MAX = 1000;
const rule = { borderColor: "var(--rule)" } as const;
const STATUSES: EvaluationStatus[] = ["submitted", "published", "hidden"];

type Row = InstructorEvaluation & { student_name: string; student_email: string; instructor_name: string };
type Filters = { q: string; status: EvaluationStatus | ""; sort: string; page: number };
const DEFAULTS: Filters = { q: "", status: "", sort: "created_at.desc", page: 1 };
type Person = Pick<Profile, "id" | "full_name" | "email">;

function fromUrl(): Filters {
  const s = new URLSearchParams(window.location.search).get("status") ?? "";
  return { ...DEFAULTS, status: (STATUSES as string[]).includes(s) ? (s as EvaluationStatus) : "" };
}

async function load(): Promise<Row[]> {
  const s = sb();
  const list = unwrap<InstructorEvaluation[]>(await s.from("instructor_evaluations").select("*").order("created_at", { ascending: false }));
  const ids = [...new Set(list.flatMap((e) => [e.student_id, e.instructor_id]))];
  const people = ids.length ? unwrap<Person[]>(await s.from("profiles").select("id,full_name,email").in("id", ids)) : [];
  const person = new Map(people.map((p) => [p.id, p]));
  return list.map((e) => ({
    ...e,
    student_name: person.get(e.student_id)?.full_name ?? "",
    student_email: person.get(e.student_id)?.email ?? "",
    instructor_name: person.get(e.instructor_id)?.full_name ?? "",
  }));
}

const programText = (slug: string | null) => (slug ? labelOf(INSTRUCTOR_SUBJECTS, slug) : "");

function applyFilters(rows: Row[], f: Filters) {
  const needle = f.q.trim().toLowerCase();
  const list = rows.filter((r) => {
    if (f.status && r.status !== f.status) return false;
    if (needle && !r.student_name.toLowerCase().includes(needle) && !r.instructor_name.toLowerCase().includes(needle)) return false;
    return true;
  });
  const [col, dir] = f.sort.split(".");
  const key = (r: Row) => (col === "student_name" ? r.student_name.toLowerCase() : col === "overall" ? String(r.overall) : r.created_at);
  return list.sort((a, b) => (key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : 0) * (dir === "asc" ? 1 : -1));
}

const csvColumns = [
  { key: "student_name", label: "Student" },
  { key: "instructor_name", label: "Instructor" },
  { key: "program_label", label: "Program" },
  { key: "context_label", label: "Based on" },
  { key: "readiness_label", label: "Readiness" },
  { key: "overall", label: "Overall" },
  ...CRITERIA.map((k) => ({ key: `score_${k.key}`, label: k.label })),
  { key: "status_label", label: "Status" },
  { key: "created_at", label: "Sent" },
  { key: "published_at", label: "Published" },
  { key: "id", label: "Id" },
];

// Words are left out on purpose: the private notes and the texts stay inside the admin screen.
const csvRow = (r: Row): Record<string, unknown> => ({
  ...r,
  program_label: programText(r.program),
  context_label: instructorContextLabel(r.context),
  readiness_label: readinessLabel(r.readiness),
  status_label: evaluationStatusLabel[r.status],
  ...Object.fromEntries(CRITERIA.map((k) => [`score_${k.key}`, r.scores?.[k.key] ?? ""])),
});

// The switch at the top of the evaluations screen: Recruiters | Instructors.
export function SourceSwitch({ source, onChange }: { source: "recruiter" | "instructor"; onChange: (s: "recruiter" | "instructor") => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label={x.sourceLabel} data-testid="source-switch">
      <span className="mono me-2">{x.sourceLabel}</span>
      {x.sources.map((s) => (
        <Chip key={s.id} active={source === s.id} onClick={() => onChange(s.id as "recruiter" | "instructor")} className="!h-10 !px-3.5 !text-[14px]" data-source={s.id}>
          {s.label}
        </Chip>
      ))}
    </div>
  );
}

export function InstructorEvaluations({ onSource }: { onSource: (s: "recruiter" | "instructor") => void }) {
  const [f, setF] = useState<Filters | null>(null);
  const [draft, setDraft] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  useEffect(() => setF(fromUrl()), []);
  useEffect(() => {
    const t = setTimeout(() => setF((v) => (v && v.q !== draft ? { ...v, q: draft, page: 1 } : v)), 300);
    return () => clearTimeout(t);
  }, [draft]);

  const data = useLoad(load, []);
  const { toast, node } = useToast(4200);
  const all = useMemo(() => data.data ?? [], [data.data]);
  const filtered = useMemo(() => (f ? applyFilters(all, f) : []), [all, f]);
  const counts = useMemo(() => {
    const n: Record<string, number> = { "": all.length };
    for (const s of STATUSES) n[s] = all.filter((r) => r.status === s).length;
    return n;
  }, [all]);
  const total = filtered.length;
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const page = Math.min(f?.page ?? 1, pages);
  const rows = filtered.slice((page - 1) * PAGE, page * PAGE);
  const open = all.find((r) => r.id === openId) ?? null;

  const set = (patch: Partial<Filters>) => setF((v) => (v ? { ...v, ...patch, page: 1 } : v));
  const reset = () => {
    setDraft("");
    setF({ ...DEFAULTS });
  };
  const dirty = f && (f.q || f.status || f.sort !== DEFAULTS.sort);
  const [sortCol, sortDir] = (f?.sort ?? DEFAULTS.sort).split(".");

  // The database stamps who decided and when, and refuses a hide without a note. The email is best effort.
  async function decide(row: Row, status: EvaluationStatus, note: string | null) {
    const patch = status === "hidden" ? { status, moderation_note: note } : { status, moderation_note: null };
    const saved = unwrap<InstructorEvaluation[]>(await sb().from("instructor_evaluations").update(patch).eq("id", row.id).select());
    if (saved.length === 0) throw new Error(c.failed);
    if (status === "published") {
      try {
        await sb().functions.invoke("on-evaluation-published", { body: { evaluation_id: row.id, kind: "instructor" } });
      } catch {}
    }
    data.setData((prev) => (prev ?? []).map((v) => (v.id === row.id ? { ...v, ...saved[0] } : v)));
    toast(status === "published" ? c.published_toast : c.hidden_toast);
  }

  const columns = useMemo<Column<Row>[]>(
    () => [
      {
        key: "student",
        label: x.columns.student,
        primary: true,
        sortKey: "student_name",
        render: (r) => (
          <button type="button" onClick={() => setOpenId(r.id)} className="text-start font-medium text-text hover:text-accent-text" aria-label={`${c.open}: ${r.student_name || c.unknown}`} data-testid="open-evaluation">
            {r.student_name || <span className="text-dim">{c.unknown}</span>}
          </button>
        ),
      },
      { key: "instructor", label: x.columns.instructor, render: (r) => r.instructor_name || <span className="text-dim">{c.unknown}</span> },
      { key: "program", label: x.columns.program, render: (r) => programText(r.program) || <span className="text-dim">{x.noProgram}</span> },
      { key: "context", label: x.columns.context, render: (r) => instructorContextLabel(r.context) },
      { key: "readiness", label: x.columns.readiness, render: (r) => readinessLabel(r.readiness) },
      { key: "overall", label: x.columns.overall, sortKey: "overall", className: "tabular-nums", render: (r) => `${r.overall} / 5` },
      { key: "status", label: x.columns.status, render: (r) => <EvaluationBadge status={r.status} /> },
      { key: "sent", label: x.columns.sent, sortKey: "created_at", className: "whitespace-nowrap", render: (r) => fmtDate(r.created_at) },
    ],
    [],
  );

  return (
    <AdminShell
      sheet={c.sheet}
      name={c.name}
      title={c.title}
      lead={x.lead}
      permission="moderate_evaluations"
      actions={<CsvButton name={x.csvName} columns={csvColumns} disabled={!f || data.loading} rows={() => Promise.resolve(filtered.map(csvRow))} />}
    >
      <div className="grid gap-5">
        <SourceSwitch source="instructor" onChange={onSource} />
        <div className="grid gap-x-6 gap-y-4 md:grid-cols-[minmax(0,420px)_1fr] md:items-center">
          <Input label={x.search} type="search" value={draft} onChange={(e) => setDraft(e.target.value)} autoComplete="off" data-testid="search" />
        </div>
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label={c.statusLabel}>
          <span className="mono me-2">{c.statusLabel}</span>
          {c.statuses.map((s) => (
            <Chip key={s.id || "all"} active={(f?.status ?? "") === s.id} onClick={() => set({ status: s.id as EvaluationStatus | "" })} className="!h-10 !px-3.5 !text-[14px]" data-status={s.id || "all"}>
              {s.label}
              {!data.loading && !data.error && (
                <span className="ms-2 tabular-nums" data-testid={`count-${s.id || "all"}`}>
                  {counts[s.id] ?? 0}
                </span>
              )}
            </Chip>
          ))}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4" style={rule}>
          <p className="mono" aria-live="polite" data-testid="count">
            {data.loading ? common.loading : common.rows(total)}
          </p>
          {dirty && (
            <button type="button" onClick={reset} className="ul-draw pb-0.5 text-[15px] font-medium text-text hover:text-accent-text">
              {c.reset}
            </button>
          )}
        </div>
      </div>

      <div className="mt-6">
        {data.error ? (
          <ErrorState text={data.error} onRetry={data.reload} />
        ) : data.loading || !f ? (
          <TableSkeleton />
        ) : rows.length === 0 ? (
          <EmptyState title={all.length === 0 ? x.empty.title : c.empty.title} text={all.length === 0 ? x.empty.text : c.empty.text} action={dirty ? <Button variant="secondary" onClick={reset}>{c.reset}</Button> : undefined} />
        ) : (
          <DataTable
            rows={rows}
            columns={columns}
            rowKey={(r) => r.id}
            sort={{ key: sortCol, asc: sortDir === "asc" }}
            onSort={(key) => set({ sort: `${key}.${sortCol === key && sortDir === "desc" ? "asc" : "desc"}` })}
            testId="evaluation-row"
          />
        )}
      </div>

      {pages > 1 && f && (
        <nav aria-label="Pages" className="mt-6 flex items-center justify-between gap-4 border-t pt-5" style={rule}>
          <Button variant="secondary" disabled={page <= 1} onClick={() => setF({ ...f, page: page - 1 })} className="!h-11 !px-5">
            {common.previous}
          </Button>
          <p className="mono">{common.page(page, pages)}</p>
          <Button variant="secondary" disabled={page >= pages} onClick={() => setF({ ...f, page: page + 1 })} className="!h-11 !px-5">
            {common.next}
          </Button>
        </nav>
      )}

      <Detail row={open} onClose={() => setOpenId(null)} onDecide={decide} />
      {node}
    </AdminShell>
  );
}

// The drawer: every field, the private note included (team only), and the decision.
function Detail({ row, onClose, onDecide }: { row: Row | null; onClose: () => void; onDecide: (r: Row, status: EvaluationStatus, note: string | null) => Promise<void> }) {
  const d = c.detail;
  const [hiding, setHiding] = useState(false);
  const [note, setNote] = useState("");
  const [noteErr, setNoteErr] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<"publish" | "hide" | null>(null);
  const id = row?.id ?? "";
  useEffect(() => {
    setHiding(false);
    setNote("");
    setNoteErr(null);
    setErr(null);
  }, [id]);

  async function run(kind: "publish" | "hide") {
    if (!row) return;
    setErr(null);
    if (kind === "hide") {
      const text = note.trim();
      if (!text) return setNoteErr(c.noteRequired);
      if (text.length > NOTE_MAX) return setNoteErr(c.noteTooLong);
    }
    setNoteErr(null);
    setBusy(kind);
    try {
      await onDecide(row, kind === "publish" ? "published" : "hidden", kind === "hide" ? note.trim() : null);
      setHiding(false);
      setNote("");
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  const footer = row ? (
    hiding ? (
      <div className="grid gap-3">
        <label htmlFor="hide-note" className="text-[15px] font-medium text-text">
          {c.noteLabel}
        </label>
        <textarea
          id="hide-note"
          value={note}
          onChange={(e) => {
            setNote(e.target.value);
            if (noteErr) setNoteErr(null);
          }}
          rows={3}
          aria-invalid={noteErr ? true : undefined}
          aria-describedby={`hide-note-hint${noteErr ? " hide-note-e" : ""}`}
          className="w-full rounded-[4px] border bg-transparent px-4 py-3 text-base text-text outline-none transition-colors focus:border-accent aria-[invalid=true]:border-err"
          style={noteErr ? undefined : rule}
          data-testid="hide-note"
        />
        <p id="hide-note-hint" className="t-small text-dim">
          {x.noteHint}
        </p>
        {noteErr && (
          <p id="hide-note-e" role="alert" className="text-[13px] leading-5 text-err" data-testid="hide-note-error">
            {noteErr}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={() => run("hide")} disabled={busy !== null} className="!h-12 !px-5" data-testid="confirm-hide">
            {busy === "hide" ? c.hiding : c.confirmHide}
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              setHiding(false);
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
      <div className="flex flex-wrap items-center gap-3">
        {row.status !== "published" && (
          <Button onClick={() => run("publish")} disabled={busy !== null} className="!h-12 !px-5" data-testid="publish-evaluation">
            {busy === "publish" ? c.publishing : c.publish}
          </Button>
        )}
        {row.status !== "hidden" && (
          <Button variant="secondary" onClick={() => setHiding(true)} disabled={busy !== null} className="!h-12 !px-5" data-testid="hide-evaluation">
            {c.hide}
          </Button>
        )}
      </div>
    )
  ) : undefined;

  return (
    <Drawer open={Boolean(row)} onClose={onClose} title={d.title} footer={footer}>
      {row && (
        // The drawer scrolls, so its content takes keyboard focus (arrow keys and Page Down scroll it).
        <div className="grid min-w-0 gap-6 outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[color:var(--accent)]" role="region" aria-label={d.title} tabIndex={0} data-testid="evaluation-detail" data-status={row.status}>
          <div className="flex flex-wrap items-center gap-3">
            <EvaluationBadge status={row.status} />
            <Tag tone="brass">{readinessLabel(row.readiness)}</Tag>
          </div>
          <dl className="grid overflow-hidden rounded-[4px] border" style={rule}>
            {(
              [
                [x.detail.student, [row.student_name, row.student_email].filter(Boolean).join(" · ")],
                [x.detail.instructor, row.instructor_name],
                [x.detail.program, programText(row.program)],
                [x.detail.context, instructorContextLabel(row.context)],
                [x.detail.sent, fmtDateTime(row.created_at)],
                [x.detail.published, row.published_at ? fmtDateTime(row.published_at) : ""],
              ] as [string, string][]
            ).map(([k, v]) => (
              <div key={k} className="border-b p-4 last:border-b-0" style={rule}>
                <dt className="mono">{k}</dt>
                <dd className="mt-1 break-words text-[15px] text-text">{v || <span className="text-dim">·</span>}</dd>
              </div>
            ))}
          </dl>
          <div>
            <p className="mono">{d.overall}</p>
            <p className="mt-1 text-[1.5rem] font-semibold leading-none tabular-nums text-text">
              {row.overall}
              <span className="text-[1rem] font-normal text-dim"> / 5</span>
            </p>
          </div>
          <div>
            <p className="mono mb-4">{d.scores}</p>
            <ScoreBars items={criteriaItems(row.scores)} />
          </div>
          <div>
            <p className="mono">{d.strengths}</p>
            <p className="mt-1.5 whitespace-pre-line break-words text-[15px] leading-6 text-text" data-testid="detail-strengths">{row.strengths || "·"}</p>
          </div>
          <div>
            <p className="mono">{d.improvements}</p>
            <p className="mt-1.5 whitespace-pre-line break-words text-[15px] leading-6 text-text" data-testid="detail-improvements">{row.improvements || "·"}</p>
          </div>
          <div className="rounded-[4px] border p-4" style={rule}>
            <p className="mono">{d.privateNote}</p>
            <p className="mono mt-1 !normal-case">{d.privateHint}</p>
            <p className="mt-2 whitespace-pre-line break-words text-[15px] leading-6 text-text" data-testid="detail-private-note">
              {row.private_note || "·"}
            </p>
          </div>
          {row.moderation_note && (
            <div className="rounded-[4px] border p-4" style={rule}>
              <p className="mono">{d.moderation}</p>
              <p className="mt-1.5 whitespace-pre-line break-words text-[15px] text-text">{row.moderation_note}</p>
            </div>
          )}
          <p className="t-small text-dim">{d.studentSees}</p>
          {err && (
            <p role="alert" className="rounded-[4px] border px-4 py-3 text-[15px]" style={{ borderColor: "var(--err)", color: "var(--err)" }}>
              {err}
            </p>
          )}
        </div>
      )}
    </Drawer>
  );
}
