"use client";

import { useEffect, useMemo, useState } from "react";
import { Chip, Tag } from "@/components/ds/Chips";
import { Input } from "@/components/ds/Forms";
import { Drawer } from "@/components/ds/Overlays";
import { Button } from "@/components/ui/Button";
import { ScoreBars, criteriaItems } from "@/components/evaluations/parts";
import { adminCopy } from "@/content/copy-admin";
import { evaluations } from "@/content/copy-evaluations";
import { evaluationStatusLabel, type EvaluationStatus, type Profile, type RecruiterProfile, type StudentEvaluation } from "@/lib/db";
import { CRITERIA, contextLabel, recommendationLabel } from "@/lib/evaluationSchema";
import { AdminShell, useToast } from "../AdminShell";
import { CsvButton } from "../CsvButton";
import { DataTable, type Column } from "../DataTable";
import { TableSkeleton } from "../Skeleton";
import { EmptyState, ErrorState } from "../States";
import { fmtDate, fmtDateTime, sb, unwrap, useLoad } from "../util";
import { EvaluationBadge } from "../StatusBadge";
import { InstructorEvaluations, SourceSwitch } from "./InstructorEvaluations";

const c = evaluations.admin;
const common = adminCopy.common;
const PAGE = 25;
const NOTE_MAX = 1000;
const rule = { borderColor: "var(--rule)" } as const;
const STATUSES: EvaluationStatus[] = ["submitted", "published", "hidden"];

type Row = StudentEvaluation & { student_name: string; student_email: string; recruiter_name: string; company: string };
type Filters = { q: string; status: EvaluationStatus | ""; sort: string; page: number };
const DEFAULTS: Filters = { q: "", status: "", sort: "created_at.desc", page: 1 };

// The overview card links here with ?status=submitted. Search text never goes in the URL.
function fromUrl(): Filters {
  const s = new URLSearchParams(window.location.search).get("status") ?? "";
  return { ...DEFAULTS, status: (STATUSES as string[]).includes(s) ? (s as EvaluationStatus) : "" };
}

type Person = Pick<Profile, "id" | "full_name" | "email">;
type Company = Pick<RecruiterProfile, "id" | "company_name">;

// Evaluations first, then the people they name. Admins can read all three tables (0005 and 0007 policies).
async function load(): Promise<Row[]> {
  const s = sb();
  const list = unwrap<StudentEvaluation[]>(await s.from("student_evaluations").select("*").order("created_at", { ascending: false }));
  const ids = [...new Set(list.flatMap((e) => [e.student_id, e.recruiter_id]))];
  const people = ids.length ? unwrap<Person[]>(await s.from("profiles").select("id,full_name,email").in("id", ids)) : [];
  const recruiterIds = [...new Set(list.map((e) => e.recruiter_id))];
  const companies = recruiterIds.length ? unwrap<Company[]>(await s.from("recruiter_profiles").select("id,company_name").in("id", recruiterIds)) : [];
  const person = new Map(people.map((p) => [p.id, p]));
  const company = new Map(companies.map((r) => [r.id, r.company_name ?? ""]));
  return list.map((e) => ({
    ...e,
    student_name: person.get(e.student_id)?.full_name ?? "",
    student_email: person.get(e.student_id)?.email ?? "",
    recruiter_name: person.get(e.recruiter_id)?.full_name ?? "",
    company: company.get(e.recruiter_id) ?? "",
  }));
}

function applyFilters(rows: Row[], f: Filters) {
  const needle = f.q.trim().toLowerCase();
  const list = rows.filter((r) => {
    if (f.status && r.status !== f.status) return false;
    if (needle && !r.student_name.toLowerCase().includes(needle) && !r.company.toLowerCase().includes(needle)) return false;
    return true;
  });
  const [col, dir] = f.sort.split(".");
  const key = (r: Row) => (col === "student_name" ? r.student_name.toLowerCase() : col === "overall" ? String(r.overall) : r.created_at);
  return list.sort((a, b) => (key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : 0) * (dir === "asc" ? 1 : -1));
}

const csvColumns = [
  { key: "student_name", label: "Student" },
  { key: "company", label: "Recruiter company" },
  { key: "recruiter_name", label: "Recruiter" },
  { key: "context_label", label: "Based on" },
  { key: "recommendation_label", label: "Recommendation" },
  { key: "overall", label: "Overall" },
  ...CRITERIA.map((k) => ({ key: `score_${k.key}`, label: k.label })),
  { key: "status_label", label: "Status" },
  { key: "show_company_label", label: "Company shown to student" },
  { key: "created_at", label: "Sent" },
  { key: "published_at", label: "Published" },
  { key: "id", label: "Id" },
];

// Words are left out on purpose: the private notes and the texts stay inside the admin screen.
const csvRow = (r: Row): Record<string, unknown> => ({
  ...r,
  context_label: contextLabel(r.context),
  recommendation_label: recommendationLabel(r.recommendation),
  status_label: evaluationStatusLabel[r.status],
  show_company_label: r.show_company_name ? common.yes : common.no,
  ...Object.fromEntries(CRITERIA.map((k) => [`score_${k.key}`, r.scores?.[k.key] ?? ""])),
});

// Two sources share this screen: recruiter evaluations (below, unchanged) and instructor evaluations (InstructorEvaluations.tsx).
// The switch is the first thing in the body; ?source=instructors opens the second one.
type Source = "recruiter" | "instructor";

export function Evaluations() {
  const [source, setSource] = useState<Source>("recruiter");
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("source") === "instructors") setSource("instructor");
  }, []);
  return source === "instructor" ? <InstructorEvaluations onSource={setSource} /> : <RecruiterEvaluations onSource={setSource} />;
}

function RecruiterEvaluations({ onSource }: { onSource: (s: Source) => void }) {
  const [f, setF] = useState<Filters | null>(null);
  const [draft, setDraft] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  useEffect(() => setF(fromUrl()), []);
  useEffect(() => {
    const t = setTimeout(() => setF((x) => (x && x.q !== draft ? { ...x, q: draft, page: 1 } : x)), 300);
    return () => clearTimeout(t);
  }, [draft]);

  const data = useLoad(load, []);
  const { toast, node } = useToast(4200);
  const filtered = useMemo(() => (f ? applyFilters(data.data ?? [], f) : []), [data.data, f]);
  const total = filtered.length;
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const page = Math.min(f?.page ?? 1, pages);
  const rows = filtered.slice((page - 1) * PAGE, page * PAGE);
  const open = (data.data ?? []).find((r) => r.id === openId) ?? null;

  const set = (patch: Partial<Filters>) => setF((x) => (x ? { ...x, ...patch, page: 1 } : x));
  const reset = () => {
    setDraft("");
    setF({ ...DEFAULTS });
  };
  const dirty = f && (f.q || f.status || f.sort !== DEFAULTS.sort);
  const [sortCol, sortDir] = (f?.sort ?? DEFAULTS.sort).split(".");

  // The database stamps who decided and when, and refuses a hide without a note. The email is best effort.
  async function decide(row: Row, status: EvaluationStatus, note: string | null) {
    const patch = status === "hidden" ? { status, moderation_note: note } : { status, moderation_note: null };
    const saved = unwrap<StudentEvaluation[]>(await sb().from("student_evaluations").update(patch).eq("id", row.id).select());
    if (saved.length === 0) throw new Error(c.failed);
    if (status === "published") {
      try {
        await sb().functions.invoke("on-evaluation-published", { body: { evaluation_id: row.id } });
      } catch {}
    }
    data.setData((prev) => (prev ?? []).map((x) => (x.id === row.id ? { ...x, ...saved[0] } : x)));
    toast(status === "published" ? c.published_toast : c.hidden_toast);
  }

  const columns = useMemo<Column<Row>[]>(
    () => [
      {
        key: "student",
        label: c.columns.student,
        primary: true,
        sortKey: "student_name",
        render: (r) => (
          <button type="button" onClick={() => setOpenId(r.id)} className="text-start font-medium text-text hover:text-accent-text" aria-label={`${c.open}: ${r.student_name || c.unknown}`} data-testid="open-evaluation">
            {r.student_name || <span className="text-dim">{c.unknown}</span>}
          </button>
        ),
      },
      { key: "company", label: c.columns.company, render: (r) => r.company || <span className="text-dim">{c.unknown}</span> },
      { key: "recommendation", label: c.columns.recommendation, render: (r) => recommendationLabel(r.recommendation) },
      { key: "overall", label: c.columns.overall, sortKey: "overall", className: "tabular-nums", render: (r) => `${r.overall} / 5` },
      { key: "context", label: c.columns.context, render: (r) => contextLabel(r.context) },
      { key: "status", label: c.columns.status, render: (r) => <EvaluationBadge status={r.status} /> },
      { key: "sent", label: c.columns.sent, sortKey: "created_at", className: "whitespace-nowrap", render: (r) => fmtDate(r.created_at) },
    ],
    [],
  );

  return (
    <AdminShell
      sheet={c.sheet}
      name={c.name}
      title={c.title}
      lead={c.lead}
      permission="moderate_evaluations"
      actions={<CsvButton name={c.csvName} columns={csvColumns} disabled={!f || data.loading} rows={() => Promise.resolve(filtered.map(csvRow))} />}
    >
      <div className="grid gap-5">
        <SourceSwitch source="recruiter" onChange={onSource} />
        <div className="grid gap-x-6 gap-y-4 md:grid-cols-[minmax(0,420px)_1fr] md:items-center">
          <Input label={c.search} type="search" value={draft} onChange={(e) => setDraft(e.target.value)} autoComplete="off" data-testid="search" />
        </div>
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label={c.statusLabel}>
          <span className="mono me-2">{c.statusLabel}</span>
          {c.statuses.map((s) => (
            <Chip key={s.id || "all"} active={(f?.status ?? "") === s.id} onClick={() => set({ status: s.id as EvaluationStatus | "" })} className="!h-10 !px-3.5 !text-[14px]" data-status={s.id || "all"}>
              {s.label}
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
          <EmptyState title={c.empty.title} text={c.empty.text} action={dirty ? <Button variant="secondary" onClick={reset}>{c.reset}</Button> : undefined} />
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

// The drawer: every field, the private note included (admins only), and the decision.
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
          {c.noteHint}
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
            <Tag tone="brass">{recommendationLabel(row.recommendation)}</Tag>
          </div>
          <dl className="grid overflow-hidden rounded-[4px] border" style={rule}>
            {(
              [
                [d.student, [row.student_name, row.student_email].filter(Boolean).join(" · ")],
                [d.recruiter, row.recruiter_name],
                [d.company, row.company],
                [d.context, contextLabel(row.context)],
                [d.sent, fmtDateTime(row.created_at)],
                [d.published, row.published_at ? fmtDateTime(row.published_at) : ""],
                [d.showCompany, row.show_company_name ? d.yes : d.no],
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
            <p className="mt-1.5 whitespace-pre-line break-words text-[15px] leading-6 text-text">{row.strengths || "·"}</p>
          </div>
          <div>
            <p className="mono">{d.improvements}</p>
            <p className="mt-1.5 whitespace-pre-line break-words text-[15px] leading-6 text-text">{row.improvements || "·"}</p>
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
