"use client";

import { useMemo, useState } from "react";
import { Chip } from "@/components/ds/Chips";
import { Input } from "@/components/ds/Forms";
import { adminCopy } from "@/content/copy-admin";
import { hiringStatusLabel, workModeLabel, type HiringRequest, type HiringStatus, type Profile, type RecruiterProfile } from "@/lib/db";
import { HIRING_ROLES, labelOf } from "@/lib/signupSchema";
import { AdminShell, useToast } from "../AdminShell";
import { CsvButton } from "../CsvButton";
import { DataTable, type Column } from "../DataTable";
import { TableSkeleton } from "../Skeleton";
import { EmptyState, ErrorState } from "../States";
import { HiringBadge } from "../StatusBadge";
import { fmtDate, sb, unwrap, useLoad } from "../util";

const c = adminCopy.hiring;
const common = adminCopy.common;
const rule = { borderColor: "var(--rule)" } as const;
const STATUSES: HiringStatus[] = ["new", "in_review", "matched", "closed"];

export type HiringRow = HiringRequest & { company: string | null; recruiter: string | null; recruiter_email: string | null };

// Requests carry only recruiter_id: pull the company (recruiter_profiles) and the person (profiles) by id.
async function load(): Promise<HiringRow[]> {
  const s = sb();
  const rows = unwrap<HiringRequest[]>(await s.from("hiring_requests").select("*").order("created_at", { ascending: false }));
  const ids = Array.from(new Set(rows.map((r) => r.recruiter_id)));
  if (!ids.length) return rows.map((r) => ({ ...r, company: null, recruiter: null, recruiter_email: null }));
  const [companies, people] = await Promise.all([
    s.from("recruiter_profiles").select("id,company_name").in("id", ids).then((r) => unwrap<Pick<RecruiterProfile, "id" | "company_name">[]>(r)),
    s.from("profiles").select("id,full_name,email").in("id", ids).then((r) => unwrap<Pick<Profile, "id" | "full_name" | "email">[]>(r)),
  ]);
  const co = new Map(companies.map((x) => [x.id, x.company_name]));
  const pe = new Map(people.map((x) => [x.id, x]));
  return rows.map((r) => ({ ...r, company: co.get(r.recruiter_id) ?? null, recruiter: pe.get(r.recruiter_id)?.full_name ?? null, recruiter_email: pe.get(r.recruiter_id)?.email ?? null }));
}

const csvColumns = [
  { key: "created_at", label: "Received" },
  { key: "company", label: "Company" },
  { key: "recruiter", label: "Recruiter" },
  { key: "recruiter_email", label: "Recruiter email" },
  { key: "role_label", label: "Role" },
  { key: "hires", label: "Hires" },
  { key: "location", label: "Location" },
  { key: "work_mode_label", label: "Work mode" },
  { key: "start_date", label: "Start" },
  { key: "notes", label: "Notes" },
  { key: "status_label", label: "Status" },
  { key: "id", label: "Id" },
];

export function Hiring() {
  const data = useLoad(load, []);
  const { toast, node } = useToast();
  const [status, setStatus] = useState<HiringStatus | "">("");
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (data.data ?? []).filter((r) => (!status || r.status === status) && (!needle || [r.company, r.recruiter, r.recruiter_email].some((v) => (v ?? "").toLowerCase().includes(needle))));
  }, [data.data, status, q]);

  async function change(r: HiringRow, next: HiringStatus) {
    if (next === r.status) return;
    setBusy(r.id);
    setErr(null);
    try {
      unwrap(await sb().from("hiring_requests").update({ status: next }).eq("id", r.id));
      data.setData((prev) => (prev ?? []).map((x) => (x.id === r.id ? { ...x, status: next } : x)));
      toast(c.updated(hiringStatusLabel[next]));
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  const columns: Column<HiringRow>[] = [
    {
      key: "company",
      label: c.columns.company,
      primary: true,
      render: (r) => (
        <span className="grid gap-0.5">
          <span>{r.company || c.unknownCompany}</span>
          {r.recruiter && <span className="text-[14px] font-normal text-dim">{r.recruiter}</span>}
        </span>
      ),
    },
    { key: "role", label: c.columns.role, render: (r) => labelOf(HIRING_ROLES, r.role) },
    { key: "hires", label: c.columns.hires, className: "tabular-nums", render: (r) => r.hires },
    { key: "location", label: c.columns.location, render: (r) => [r.location, workModeLabel[r.work_mode] ?? r.work_mode].filter(Boolean).join(" · ") },
    { key: "start", label: c.columns.start, className: "whitespace-nowrap", render: (r) => fmtDate(r.start_date ? `${r.start_date.slice(0, 10)}T00:00:00` : null) },
    { key: "notes", label: c.columns.notes, className: "max-w-[36ch]", render: (r) => (r.notes ? <span className="line-clamp-3 whitespace-pre-line">{r.notes}</span> : <span className="text-dim">{c.noNotes}</span>) },
    {
      key: "status",
      label: c.columns.status,
      render: (r) => (
        <span className="flex flex-wrap items-center gap-3">
          <HiringBadge status={r.status} />
          <select
            value={r.status}
            onChange={(e) => change(r, e.target.value as HiringStatus)}
            disabled={busy !== null}
            aria-label={`${c.changeStatus}: ${r.company || c.unknownCompany}`}
            className="h-10 rounded-[4px] border bg-transparent px-2.5 text-[14px] text-text outline-none focus:border-accent disabled:opacity-50"
            style={rule}
            data-testid="hiring-status"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s} className="bg-white text-[#0a1d23]">
                {hiringStatusLabel[s]}
              </option>
            ))}
          </select>
        </span>
      ),
    },
    { key: "received", label: c.columns.received, className: "whitespace-nowrap", render: (r) => fmtDate(r.created_at) },
  ];

  const csvRows = () =>
    Promise.resolve(rows.map((r) => ({ ...r, role_label: labelOf(HIRING_ROLES, r.role), work_mode_label: workModeLabel[r.work_mode] ?? r.work_mode, status_label: hiringStatusLabel[r.status] ?? r.status })));

  return (
    <AdminShell sheet={c.sheet} name={c.name} title={c.title} lead={c.lead} permission="manage_hiring_requests" actions={<CsvButton name={c.csvName} columns={csvColumns} rows={csvRows} disabled={data.loading} />}>
      <div className="grid gap-5">
        <div className="grid gap-x-6 gap-y-4 md:grid-cols-[minmax(0,420px)_1fr] md:items-center">
          <Input label={c.search} type="search" value={q} onChange={(e) => setQ(e.target.value)} autoComplete="off" />
        </div>
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label={c.status}>
          <span className="mono me-2">{c.status}</span>
          <Chip active={status === ""} onClick={() => setStatus("")} className="!h-10 !px-3.5 !text-[14px]" data-status="all">
            {c.allStatuses}
          </Chip>
          {STATUSES.map((s) => (
            <Chip key={s} active={status === s} onClick={() => setStatus(s)} className="!h-10 !px-3.5 !text-[14px]" data-status={s}>
              {hiringStatusLabel[s]}
            </Chip>
          ))}
        </div>
        <div className="border-t pt-4" style={rule}>
          <p className="mono" aria-live="polite" data-testid="count">
            {data.loading ? common.loading : common.rows(rows.length)}
          </p>
        </div>
      </div>

      {err && (
        <p role="alert" className="mt-4 rounded-[4px] border px-4 py-3 text-[15px]" style={{ borderColor: "var(--err)", color: "var(--err)" }}>
          {err}
        </p>
      )}

      <div className="mt-6">
        {data.error ? (
          <ErrorState text={data.error} onRetry={data.reload} />
        ) : data.loading ? (
          <TableSkeleton rows={4} />
        ) : rows.length === 0 ? (
          <EmptyState title={c.empty.title} text={c.empty.text} />
        ) : (
          <DataTable rows={rows} columns={columns} rowKey={(r) => r.id} testId="hiring-row" />
        )}
      </div>
      {node}
    </AdminShell>
  );
}
