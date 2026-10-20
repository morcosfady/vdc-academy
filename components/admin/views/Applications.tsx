"use client";

import { useEffect, useMemo, useState } from "react";
import { Chip } from "@/components/ds/Chips";
import { Input, Select } from "@/components/ds/Forms";
import { Button } from "@/components/ui/Button";
import { adminCopy } from "@/content/copy-admin";
import { programs } from "@/content/programs";
import { PIPELINE, discountStatusLabel, statusLabel, type Application, type ApplicationStatus, type DiscountStatus } from "@/lib/db";
import { AdminShell } from "../AdminShell";
import { CsvButton } from "../CsvButton";
import { DataTable, type Column } from "../DataTable";
import { TableSkeleton } from "../Skeleton";
import { EmptyState, ErrorState } from "../States";
import { DiscountBadge, StatusBadge } from "../StatusBadge";
import { discountLabel, fmtDate, programTitles, sb, skillsText, useLoad } from "../util";

const c = adminCopy.applications;
const common = adminCopy.common;
const PAGE = 25;
const STATUSES: ApplicationStatus[] = ["draft", ...PIPELINE, "waitlist", "rejected"];
const DISCOUNTS: DiscountStatus[] = ["pending", "verified", "rejected", "none"];
const rule = { borderColor: "var(--rule)" } as const;

type Filters = {
  q: string;
  statuses: ApplicationStatus[];
  program: string; // slug or ""
  discount: DiscountStatus | "";
  from: string;
  to: string;
  country: string;
  sort: string; // "<col>.<asc|desc>"
  page: number;
};

const DEFAULTS: Filters = { q: "", statuses: [], program: "", discount: "", from: "", to: "", country: "", sort: "submitted_at.desc", page: 1 };

// The URL may preselect a status, a discount state or a program (the overview links do). Search text never goes there.
function fromUrl(): Filters {
  const sp = new URLSearchParams(window.location.search);
  const statuses = (sp.get("status") ?? "").split(",").filter((s): s is ApplicationStatus => (STATUSES as string[]).includes(s));
  const discount = sp.get("discount") ?? "";
  return {
    ...DEFAULTS,
    statuses,
    discount: (DISCOUNTS as string[]).includes(discount) ? (discount as DiscountStatus) : "",
    program: programs.some((p) => p.slug === sp.get("program")) ? (sp.get("program") as string) : "",
  };
}

// One PostgREST query for the table and for the export (the export drops the page range).
function build(f: Filters, paged: boolean) {
  const [col, dir] = f.sort.split(".");
  let q = sb().from("applications").select("*", { count: "exact" });
  if (f.statuses.length) q = q.in("status", f.statuses);
  else q = q.neq("status", "draft");
  if (f.program) q = q.contains("programs", [f.program]);
  if (f.discount) q = q.eq("discount_status", f.discount);
  if (f.from) q = q.gte("submitted_at", `${f.from}T00:00:00`);
  if (f.to) q = q.lte("submitted_at", `${f.to}T23:59:59`);
  if (f.country.trim()) q = q.ilike("country", `%${f.country.trim()}%`);
  const needle = f.q.trim();
  if (needle) q = needle.includes("@") ? q.ilike("email", `%${needle}%`) : q.ilike("full_name", `%${needle}%`);
  q = q.order(col, { ascending: dir === "asc", nullsFirst: false });
  if (paged) q = q.range((f.page - 1) * PAGE, f.page * PAGE - 1);
  return q;
}

export const csvColumns = [
  { key: "full_name", label: "Name" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "whatsapp", label: "WhatsApp" },
  { key: "country", label: "Country" },
  { key: "city", label: "City" },
  { key: "status", label: "Status" },
  { key: "programs_titles", label: "Programs" },
  { key: "format", label: "Format" },
  { key: "schedule", label: "Schedule" },
  { key: "start_pref", label: "Start" },
  { key: "current_status", label: "Current status" },
  { key: "degree", label: "Degree" },
  { key: "university", label: "University" },
  { key: "graduation_year", label: "Graduation year" },
  { key: "experience_years", label: "Experience" },
  { key: "career_goal", label: "Career goal" },
  { key: "software_text", label: "Software" },
  { key: "discount_label", label: "Discount type" },
  { key: "discount_percent", label: "Discount percent" },
  { key: "discount_status_label", label: "Discount check" },
  { key: "source", label: "Source" },
  { key: "submitted_at", label: "Submitted" },
  { key: "updated_at", label: "Updated" },
  { key: "id", label: "Id" },
];

export function csvRow(a: Application): Record<string, unknown> {
  return {
    ...a,
    programs_titles: programTitles(a.programs),
    software_text: skillsText(a.software_skills),
    discount_label: discountLabel(a.discount_type),
    discount_status_label: discountStatusLabel[a.discount_status] ?? a.discount_status,
  };
}

export function Applications() {
  const [f, setF] = useState<Filters | null>(null);
  const [more, setMore] = useState(false);
  const [draft, setDraft] = useState(""); // search box text, applied after a short pause
  useEffect(() => setF(fromUrl()), []);
  useEffect(() => {
    const t = setTimeout(() => setF((x) => (x && x.q !== draft ? { ...x, q: draft, page: 1 } : x)), 300);
    return () => clearTimeout(t);
  }, [draft]);

  const query = useLoad(
    async () => {
      const r = await build(f!, true);
      if (r.error) throw new Error(r.error.message);
      return { rows: (r.data ?? []) as Application[], count: r.count };
    },
    [f],
    f !== null,
  );

  const set = (patch: Partial<Filters>) => setF((x) => (x ? { ...x, ...patch, page: 1 } : x));
  const toggleStatus = (s: ApplicationStatus) => setF((x) => (x ? { ...x, page: 1, statuses: x.statuses.includes(s) ? x.statuses.filter((y) => y !== s) : [...x.statuses, s] } : x));
  const dirty = f && (f.q || f.statuses.length || f.program || f.discount || f.from || f.to || f.country || f.sort !== DEFAULTS.sort);

  const rows = query.data?.rows ?? [];
  const total = query.data?.count ?? rows.length;
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const [sortCol, sortDir] = (f?.sort ?? DEFAULTS.sort).split(".");

  const columns = useMemo<Column<Application>[]>(
    () => [
      { key: "name", label: c.columns.name, primary: true, sortKey: "full_name", render: (a) => a.full_name || <span className="text-dim">{common.unknown}</span> },
      { key: "email", label: c.columns.email, render: (a) => <span className="break-all">{a.email}</span> },
      { key: "program", label: c.columns.program, className: "max-w-[22ch]", render: (a) => programTitles(a.programs).join(", ") },
      { key: "status", label: c.columns.status, render: (a) => <StatusBadge status={a.status} /> },
      { key: "discount", label: c.columns.discount, render: (a) => (a.discount_type ? <DiscountBadge status={a.discount_status} /> : <span className="text-dim">{common.none}</span>) },
      { key: "country", label: c.columns.country, render: (a) => [a.city, a.country].filter(Boolean).join(", ") },
      { key: "submitted", label: c.columns.submitted, sortKey: "submitted_at", className: "whitespace-nowrap", render: (a) => fmtDate(a.submitted_at ?? a.created_at) },
    ],
    [],
  );

  const programOptions = [c.allPrograms, ...programs.map((p) => p.title)];
  const discountOptions = [c.allDiscounts, ...DISCOUNTS.map((d) => discountStatusLabel[d])];

  return (
    <AdminShell
      sheet={c.sheet}
      name={c.name}
      title={c.title}
      lead={c.lead}
      actions={
        <CsvButton
          name={c.csvName}
          columns={csvColumns}
          disabled={!f || query.loading}
          rows={async () => {
            const r = await build(f!, false);
            if (r.error) throw new Error(r.error.message);
            return ((r.data ?? []) as Application[]).map(csvRow);
          }}
        />
      }
    >
      {/* Filters: search + status chips always visible; the rest folds away on phones */}
      <div className="grid gap-5">
        <div className="grid gap-x-6 gap-y-4 md:grid-cols-[minmax(0,420px)_1fr] md:items-center">
          <Input label={c.search} type="search" value={draft} onChange={(e) => setDraft(e.target.value)} autoComplete="off" data-testid="search" />
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 md:justify-end">
            <label className="flex items-center gap-3 text-[15px] text-dim">
              <span className="mono">{c.sort}</span>
              <select value={f?.sort ?? DEFAULTS.sort} onChange={(e) => set({ sort: e.target.value })} aria-label={c.sort} className="h-11 rounded-[4px] border bg-transparent px-3 text-[15px] text-text outline-none focus:border-accent" style={rule} data-testid="sort">
                {c.sorts.map((s) => (
                  <option key={s.id} value={s.id} className="bg-white text-[#0a1d23]">
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
            <button type="button" onClick={() => setMore((m) => !m)} aria-expanded={more} className="ul-draw pb-0.5 text-[15px] font-medium text-text hover:text-accent-text">
              {more ? c.fewerFilters : c.moreFilters}
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2" role="group" aria-label={c.status}>
          <span className="mono me-2">{c.status}</span>
          {STATUSES.map((s) => (
            <Chip key={s} active={f?.statuses.includes(s)} onClick={() => toggleStatus(s)} className="!h-10 !px-3.5 !text-[14px]" data-status={s}>
              {statusLabel[s]}
            </Chip>
          ))}
        </div>

        {more && (
          <div className="grid gap-x-5 gap-y-6 border-t pt-6 sm:grid-cols-2 lg:grid-cols-5" style={rule}>
            <Select label={c.program} options={programOptions} value={f?.program ? programs.find((p) => p.slug === f.program)?.title ?? c.allPrograms : c.allPrograms} onChange={(e) => set({ program: programs.find((p) => p.title === e.target.value)?.slug ?? "" })} />
            <Select label={c.discount} options={discountOptions} value={f?.discount ? discountStatusLabel[f.discount] : c.allDiscounts} onChange={(e) => set({ discount: DISCOUNTS.find((d) => discountStatusLabel[d] === e.target.value) ?? "" })} data-testid="discount" />
            <Input label={c.from} type="date" value={f?.from ?? ""} onChange={(e) => set({ from: e.target.value })} />
            <Input label={c.to} type="date" value={f?.to ?? ""} onChange={(e) => set({ to: e.target.value })} />
            <Input label={c.country} value={f?.country ?? ""} onChange={(e) => set({ country: e.target.value })} autoComplete="off" />
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4" style={rule}>
          <p className="mono" aria-live="polite" data-testid="count">
            {query.loading ? common.loading : common.rows(total)}
          </p>
          {dirty && (
            <button
              type="button"
              onClick={() => {
                setDraft("");
                setF({ ...DEFAULTS });
              }}
              className="ul-draw pb-0.5 text-[15px] font-medium text-text hover:text-accent-text"
            >
              {c.reset}
            </button>
          )}
        </div>
      </div>

      <div className="mt-6">
        {query.error ? (
          <ErrorState text={query.error} onRetry={query.reload} />
        ) : query.loading || !f ? (
          <TableSkeleton />
        ) : rows.length === 0 ? (
          <EmptyState
            title={c.empty.title}
            text={c.empty.text}
            action={
              dirty ? (
                <Button
                  variant="secondary"
                  onClick={() => {
                    setDraft("");
                    setF({ ...DEFAULTS });
                  }}
                >
                  {c.reset}
                </Button>
              ) : undefined
            }
          />
        ) : (
          <DataTable
            rows={rows}
            columns={columns}
            rowKey={(a) => a.id}
            href={(a) => `/admin/application/?id=${a.id}`}
            sort={{ key: sortCol, asc: sortDir === "asc" }}
            onSort={(key) => set({ sort: `${key}.${sortCol === key && sortDir === "desc" ? "asc" : "desc"}` })}
            openLabel={common.open}
            testId="app-row"
          />
        )}
      </div>

      {pages > 1 && f && (
        <nav aria-label="Pages" className="mt-6 flex items-center justify-between gap-4 border-t pt-5" style={rule}>
          <Button variant="secondary" disabled={f.page <= 1} onClick={() => setF({ ...f, page: f.page - 1 })} className="!h-11 !px-5">
            {common.previous}
          </Button>
          <p className="mono">{common.page(f.page, pages)}</p>
          <Button variant="secondary" disabled={f.page >= pages} onClick={() => setF({ ...f, page: f.page + 1 })} className="!h-11 !px-5">
            {common.next}
          </Button>
        </nav>
      )}
    </AdminShell>
  );
}
