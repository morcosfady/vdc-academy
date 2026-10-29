"use client";

import { useEffect, useMemo, useState } from "react";
import { Chip } from "@/components/ds/Chips";
import { Input, Select } from "@/components/ds/Forms";
import { Button } from "@/components/ui/Button";
import { adminCopy } from "@/content/copy-admin";
import { verificationLabel, type InstructorProfile, type Profile, type RecruiterProfile, type VerificationStatus } from "@/lib/db";
import { isAdmin, isInstructor, isRecruiter, isStudent, roleLabel, roleOf } from "@/lib/roles";
import { ACCOUNT_TYPES, labelOf } from "@/lib/signupSchema";
import { AdminShell } from "../AdminShell";
import { CsvButton } from "../CsvButton";
import { DataTable, type Column } from "../DataTable";
import { TableSkeleton } from "../Skeleton";
import { EmptyState, ErrorState } from "../States";
import { PlainBadge, VerificationBadge } from "../StatusBadge";
import { fmtDate, sb, unwrap, useLoad } from "../util";

const c = adminCopy.users;
const common = adminCopy.common;
const PAGE = 25;
const rule = { borderColor: "var(--rule)" } as const;
const VERIFICATIONS: VerificationStatus[] = ["pending", "approved", "rejected"];

type TypeId = "" | "student" | "instructor" | "recruiter" | "team";
type Onboarding = "" | "done" | "open";
type Filters = { q: string; type: TypeId; onboarding: Onboarding; verification: VerificationStatus | ""; country: string; from: string; to: string; sort: string; page: number };
const DEFAULTS: Filters = { q: "", type: "", onboarding: "", verification: "", country: "", from: "", to: "", sort: "created_at.desc", page: 1 };

export type UserRow = Profile & {
  recruiter: Pick<RecruiterProfile, "verification_status" | "company_name"> | null;
  instructor: Pick<InstructorProfile, "verification_status" | "employer"> | null;
};

// The overview links preselect an account type or a verification state. Search text never goes in the URL.
function fromUrl(): Filters {
  const sp = new URLSearchParams(window.location.search);
  const type = sp.get("type") ?? "";
  const v = sp.get("verification") ?? "";
  return { ...DEFAULTS, type: c.types.some((t) => t.id === type) ? (type as TypeId) : "", verification: (VERIFICATIONS as string[]).includes(v) ? (v as VerificationStatus) : "" };
}

// Profiles, recruiter rows and instructor rows are three tables: join them here by id. Admins can read all (0005, 0008 policies).
async function load(): Promise<UserRow[]> {
  const s = sb();
  const [profiles, recruiters, instructors] = await Promise.all([
    s.from("profiles").select("*").order("created_at", { ascending: false }).then((r) => unwrap<Profile[]>(r)),
    s.from("recruiter_profiles").select("id,verification_status,company_name").then((r) => unwrap<Pick<RecruiterProfile, "id" | "verification_status" | "company_name">[]>(r)),
    s.from("instructor_profiles").select("id,verification_status,employer").then((r) => unwrap<Pick<InstructorProfile, "id" | "verification_status" | "employer">[]>(r)),
  ]);
  const by = new Map(recruiters.map((r) => [r.id, r]));
  const byInstructor = new Map(instructors.map((r) => [r.id, r]));
  return profiles.map((p) => ({ ...p, recruiter: by.get(p.id) ?? null, instructor: byInstructor.get(p.id) ?? null }));
}

const typeOf = (u: UserRow): TypeId => (isAdmin(u) ? "team" : isInstructor(u) ? "instructor" : isRecruiter(u) ? "recruiter" : isStudent(u) ? "student" : "");
// Recruiters and instructors both have a verification state; a person is only ever one of the two.
const verificationOf = (u: UserRow) => u.recruiter?.verification_status ?? u.instructor?.verification_status ?? null;
const day = (iso: string | null | undefined) => (iso ?? "").slice(0, 10);

function applyFilters(rows: UserRow[], f: Filters) {
  const needle = f.q.trim().toLowerCase();
  const country = f.country.trim().toLowerCase();
  const list = rows.filter((u) => {
    if (f.type && typeOf(u) !== f.type) return false;
    if (f.onboarding === "done" && !u.onboarding_complete) return false;
    if (f.onboarding === "open" && u.onboarding_complete) return false;
    if (f.verification && verificationOf(u) !== f.verification) return false;
    if (country && !(u.country ?? "").toLowerCase().includes(country)) return false;
    if (f.from && day(u.created_at) < f.from) return false;
    if (f.to && day(u.created_at) > f.to) return false;
    if (needle && !(u.full_name ?? "").toLowerCase().includes(needle) && !(u.email ?? "").toLowerCase().includes(needle)) return false;
    return true;
  });
  const [col, dir] = f.sort.split(".");
  const key = (u: UserRow) => (col === "full_name" ? (u.full_name ?? "").toLowerCase() : u.created_at);
  return list.sort((a, b) => (key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : 0) * (dir === "asc" ? 1 : -1));
}

const typeText = (u: UserRow) => labelOf(ACCOUNT_TYPES, u.account_type) || (isAdmin(u) ? c.team : c.noType);

export const userCsvColumns = [
  { key: "full_name", label: "Name" },
  { key: "email", label: "Email" },
  { key: "account_type_label", label: "Account type" },
  { key: "role_label", label: "Role" },
  { key: "onboarding_label", label: "Onboarding complete" },
  { key: "verification_label", label: "Recruiter verification" },
  { key: "instructor_verification_label", label: "Instructor verification" },
  { key: "company", label: "Company" },
  { key: "employer", label: "Instructor employer" },
  { key: "phone", label: "Phone" },
  { key: "country", label: "Country" },
  { key: "city", label: "City" },
  { key: "created_at", label: "Joined" },
  { key: "id", label: "Id" },
];

export function userCsvRow(u: UserRow): Record<string, unknown> {
  return {
    ...u,
    account_type_label: typeText(u),
    role_label: roleLabel[roleOf(u)],
    onboarding_label: u.onboarding_complete ? common.yes : common.no,
    verification_label: u.recruiter ? verificationLabel[u.recruiter.verification_status] : "",
    instructor_verification_label: u.instructor ? verificationLabel[u.instructor.verification_status] : "",
    company: u.recruiter?.company_name ?? "",
    employer: u.instructor?.employer ?? "",
  };
}

export function Users() {
  const [f, setF] = useState<Filters | null>(null);
  const [more, setMore] = useState(false);
  const [draft, setDraft] = useState("");
  useEffect(() => {
    const init = fromUrl();
    setF(init);
    if (init.verification) setMore(true);
  }, []);
  useEffect(() => {
    const t = setTimeout(() => setF((x) => (x && x.q !== draft ? { ...x, q: draft, page: 1 } : x)), 300);
    return () => clearTimeout(t);
  }, [draft]);

  const data = useLoad(load, []);
  const filtered = useMemo(() => (f ? applyFilters(data.data ?? [], f) : []), [data.data, f]);
  const total = filtered.length;
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const page = Math.min(f?.page ?? 1, pages);
  const rows = filtered.slice((page - 1) * PAGE, page * PAGE);

  const set = (patch: Partial<Filters>) => setF((x) => (x ? { ...x, ...patch, page: 1 } : x));
  const reset = () => {
    setDraft("");
    setF({ ...DEFAULTS });
  };
  const dirty = f && (f.q || f.type || f.onboarding || f.verification || f.country || f.from || f.to || f.sort !== DEFAULTS.sort);
  const [sortCol, sortDir] = (f?.sort ?? DEFAULTS.sort).split(".");

  const columns = useMemo<Column<UserRow>[]>(
    () => [
      { key: "name", label: c.columns.name, primary: true, sortKey: "full_name", render: (u) => u.full_name || <span className="text-dim">{common.unknown}</span> },
      { key: "email", label: c.columns.email, render: (u) => <span className="break-all">{u.email}</span> },
      {
        key: "type",
        label: c.columns.type,
        render: (u) => (
          <span className="flex flex-wrap items-center gap-2" data-type={typeOf(u)}>
            <span>{typeText(u)}</span>
            {isAdmin(u) && <PlainBadge>{roleLabel[roleOf(u)]}</PlainBadge>}
          </span>
        ),
      },
      { key: "onboarding", label: c.columns.onboarding, render: (u) => (u.onboarding_complete ? c.complete : <span className="text-dim">{c.incomplete}</span>) },
      { key: "verification", label: c.columns.verification, render: (u) => (verificationOf(u) ? <VerificationBadge status={verificationOf(u)!} /> : <span className="text-dim">{common.none}</span>) },
      { key: "country", label: c.columns.country, render: (u) => [u.city, u.country].filter(Boolean).join(", ") },
      { key: "created", label: c.columns.created, sortKey: "created_at", className: "whitespace-nowrap", render: (u) => fmtDate(u.created_at) },
    ],
    [],
  );

  const onboardingIds: Onboarding[] = ["", "done", "open"];
  const verificationOptions = [c.anyVerification, ...VERIFICATIONS.map((v) => verificationLabel[v])];

  return (
    <AdminShell
      sheet={c.sheet}
      name={c.name}
      title={c.title}
      lead={c.lead}
      permission="manage_users"
      actions={<CsvButton name={c.csvName} columns={userCsvColumns} disabled={!f || data.loading} rows={() => Promise.resolve(filtered.map(userCsvRow))} />}
    >
      <div className="grid gap-5">
        <div className="grid gap-x-6 gap-y-4 md:grid-cols-[minmax(0,420px)_1fr] md:items-center">
          <Input label={c.search} type="search" value={draft} onChange={(e) => setDraft(e.target.value)} autoComplete="off" data-testid="search" />
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 md:justify-end">
            <button type="button" onClick={() => setMore((m) => !m)} aria-expanded={more} className="ul-draw pb-0.5 text-[15px] font-medium text-text hover:text-accent-text">
              {more ? c.fewerFilters : c.moreFilters}
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2" role="group" aria-label={c.type}>
          <span className="mono me-2">{c.type}</span>
          {c.types.map((t) => (
            <Chip key={t.id || "all"} active={(f?.type ?? "") === t.id} onClick={() => set({ type: t.id as TypeId })} className="!h-10 !px-3.5 !text-[14px]" data-type={t.id || "all"}>
              {t.label}
            </Chip>
          ))}
        </div>

        {more && (
          <div className="grid gap-x-5 gap-y-6 border-t pt-6 sm:grid-cols-2 lg:grid-cols-5" style={rule}>
            <Select label={c.onboarding} options={c.onboardingOptions} value={c.onboardingOptions[onboardingIds.indexOf(f?.onboarding ?? "")]} onChange={(e) => set({ onboarding: onboardingIds[c.onboardingOptions.indexOf(e.target.value as (typeof c.onboardingOptions)[number])] ?? "" })} data-testid="onboarding" />
            <Select label={c.verificationAny} options={verificationOptions} value={f?.verification ? verificationLabel[f.verification] : c.anyVerification} onChange={(e) => set({ verification: VERIFICATIONS.find((v) => verificationLabel[v] === e.target.value) ?? "" })} data-testid="verification" />
            <Input label={c.country} value={f?.country ?? ""} onChange={(e) => set({ country: e.target.value })} autoComplete="off" />
            <Input label={c.from} type="date" value={f?.from ?? ""} onChange={(e) => set({ from: e.target.value })} />
            <Input label={c.to} type="date" value={f?.to ?? ""} onChange={(e) => set({ to: e.target.value })} />
          </div>
        )}

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
            rowKey={(u) => u.id}
            sort={{ key: sortCol, asc: sortDir === "asc" }}
            onSort={(key) => set({ sort: `${key}.${sortCol === key && sortDir === "desc" ? "asc" : "desc"}` })}
            testId="user-row"
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
    </AdminShell>
  );
}
