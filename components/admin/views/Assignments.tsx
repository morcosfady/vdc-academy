"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ds/Forms";
import { Button } from "@/components/ui/Button";
import { adminCopy } from "@/content/copy-admin";
import { type InstructorAssignment, type Profile, type VerificationStatus } from "@/lib/db";
import { INSTRUCTOR_SUBJECTS, labelOf } from "@/lib/signupSchema";
import { cn } from "@/lib/utils";
import { AdminSection, AdminShell, useToast } from "../AdminShell";
import { BlockSkeleton } from "../Skeleton";
import { EmptyState, ErrorState } from "../States";
import { VerificationBadge } from "../StatusBadge";
import { errorText, fmtDate, sb, unwrap, useLoad } from "../util";

const c = adminCopy.assignments;
const rule = { borderColor: "var(--rule)" } as const;
const DUPLICATE = "23505";

type Person = Pick<Profile, "id" | "full_name" | "email" | "account_type" | "onboarding_complete">;
type Data = { people: Person[]; status: Record<string, VerificationStatus>; assignments: InstructorAssignment[] };

// Instructors and students come from profiles (admins read them all), the verification state from instructor_profiles.
async function load(): Promise<Data> {
  const s = sb();
  const [people, instructors, assignments] = await Promise.all([
    s.from("profiles").select("id,full_name,email,account_type,onboarding_complete").in("account_type", ["instructor", "student"]).then((r) => unwrap<Person[]>(r)),
    s.from("instructor_profiles").select("id,verification_status").then((r) => unwrap<{ id: string; verification_status: VerificationStatus }[]>(r)),
    s.from("instructor_assignments").select("*").order("created_at", { ascending: false }).then((r) => unwrap<InstructorAssignment[]>(r)),
  ]);
  return { people, status: Object.fromEntries(instructors.map((i) => [i.id, i.verification_status])), assignments };
}

const nameOf = (p: Person | undefined) => p?.full_name?.trim() || p?.email || c.group.noName;
const matches = (needle: string, ...values: (string | null | undefined)[]) => !needle || values.some((v) => (v ?? "").toLowerCase().includes(needle));

export function Assignments() {
  const data = useLoad(load, []);
  const { toast, node } = useToast(4200);
  const [q, setQ] = useState("");
  const formRef = useRef<HTMLDivElement>(null);
  const [pickStudent, setPickStudent] = useState<{ id: string; tick: number } | null>(null);

  const d = data.data;
  const person = useMemo(() => new Map((d?.people ?? []).map((p) => [p.id, p])), [d]);
  const instructors = useMemo(() => (d?.people ?? []).filter((p) => p.account_type === "instructor").sort((a, b) => nameOf(a).localeCompare(nameOf(b))), [d]);
  const students = useMemo(() => (d?.people ?? []).filter((p) => p.account_type === "student" && p.onboarding_complete).sort((a, b) => nameOf(a).localeCompare(nameOf(b))), [d]);
  const approved = useMemo(() => instructors.filter((i) => d?.status[i.id] === "approved"), [instructors, d]);
  const assignedIds = useMemo(() => new Set((d?.assignments ?? []).map((a) => a.student_id)), [d]);
  const needle = q.trim().toLowerCase();

  async function assign(instructorId: string, studentId: string, program: string | null) {
    const res = await sb().from("instructor_assignments").insert({ instructor_id: instructorId, student_id: studentId, program }).select();
    if (res.error) {
      if (res.error.code === DUPLICATE || /duplicate key/i.test(res.error.message)) throw new Error(c.form.duplicate);
      throw new Error(res.error.message || c.form.failed);
    }
    const row = (res.data ?? [])[0] as InstructorAssignment | undefined;
    if (!row) throw new Error(c.form.failed);
    data.setData((prev) => (prev ? { ...prev, assignments: [row, ...prev.assignments] } : prev));
    toast(c.saved(nameOf(person.get(studentId)), nameOf(person.get(instructorId))));
  }

  async function remove(a: InstructorAssignment) {
    const gone = unwrap<InstructorAssignment[]>(await sb().from("instructor_assignments").delete().eq("id", a.id).select());
    if (gone.length === 0) throw new Error(c.form.failed);
    data.setData((prev) => (prev ? { ...prev, assignments: prev.assignments.filter((x) => x.id !== a.id) } : prev));
    toast(c.removed(nameOf(person.get(a.student_id))));
  }

  const groups = instructors
    .map((i) => {
      const rows = (d?.assignments ?? []).filter((a) => a.instructor_id === i.id);
      const shown = needle ? rows.filter((a) => matches(needle, nameOf(person.get(a.student_id)), person.get(a.student_id)?.email)) : rows;
      const hit = matches(needle, i.full_name, i.email);
      return { instructor: i, status: d?.status[i.id] ?? "pending", rows: hit ? rows : shown, hidden: !hit && shown.length === 0 };
    })
    .filter((g) => !g.hidden);
  const loose = students.filter((s) => !assignedIds.has(s.id) && matches(needle, s.full_name, s.email));

  return (
    <AdminShell sheet={c.sheet} name={c.name} title={c.title} lead={c.lead} permission="assign_students">
      {data.error ? (
        <ErrorState text={data.error} onRetry={data.reload} />
      ) : data.loading || !d ? (
        <div className="grid gap-6">
          <BlockSkeleton lines={5} />
          <BlockSkeleton lines={5} />
        </div>
      ) : (
        <div className="grid gap-14">
          <div ref={formRef}>
            <AdminSection index={c.sections.assign.index} title={c.sections.assign.title} hint={c.sections.assign.hint}>
              <AssignForm approved={approved} students={students} onAssign={assign} preset={pickStudent} />
            </AdminSection>
          </div>

          <div className="grid gap-5">
            <div className="grid gap-x-6 gap-y-4 md:grid-cols-[minmax(0,420px)_1fr] md:items-center">
              <Input label={c.search} type="search" value={q} onChange={(e) => setQ(e.target.value)} autoComplete="off" data-testid="search" />
            </div>
          </div>

          <AdminSection index={c.sections.instructors.index} title={c.sections.instructors.title} hint={c.sections.instructors.hint}>
            {instructors.length === 0 ? (
              <EmptyState title={c.empty.title} text={c.empty.text} />
            ) : groups.length === 0 ? (
              <EmptyState title={c.noMatch.title} text={c.noMatch.text} />
            ) : (
              <ul className="grid gap-5">
                {groups.map((g) => (
                  <li key={g.instructor.id}>
                    <InstructorGroup instructor={g.instructor} status={g.status} rows={g.rows} person={person} onRemove={remove} />
                  </li>
                ))}
              </ul>
            )}
          </AdminSection>

          <AdminSection index={c.sections.unassigned.index} title={c.sections.unassigned.title} hint={c.sections.unassigned.hint} action={<span className="mono" data-testid="unassigned-count">{loose.length}</span>}>
            {loose.length === 0 ? (
              <p className="t-small text-dim">{c.unassignedEmpty}</p>
            ) : (
              <ul className="grid overflow-hidden rounded-[4px] border" style={rule} data-testid="unassigned-list">
                {loose.map((s) => (
                  <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3 last:border-b-0" style={rule} data-testid="unassigned-student" data-id={s.id}>
                    <div className="min-w-0">
                      <p className="break-words text-[15px] font-medium text-text">{nameOf(s)}</p>
                      {s.email && s.full_name && <p className="t-small break-all text-dim">{s.email}</p>}
                    </div>
                    <Button
                      variant="secondary"
                      className="!h-10 !px-4"
                      onClick={() => {
                        setPickStudent({ id: s.id, tick: Date.now() });
                        formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                      }}
                      aria-label={`${c.assign}: ${nameOf(s)}`}
                      data-testid="unassigned-assign"
                    >
                      {c.assign}
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </AdminSection>
        </div>
      )}
      {node}
    </AdminShell>
  );
}

// A native select in the look of the design system Select, but with ids as values (names can repeat).
function Pick({ label, value, onChange, options, placeholder, error, testId, disabled }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; placeholder: string; error?: string; testId: string; disabled?: boolean }) {
  const id = useId();
  return (
    <div className="relative">
      <label htmlFor={id} className="pointer-events-none absolute start-4 top-2 text-xs text-dim">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-e` : undefined}
        className="h-14 w-full appearance-none rounded-[4px] border border-rule bg-transparent px-4 pt-5 text-base text-text outline-none transition-colors duration-200 hover:border-[color:var(--text-dim)] focus:border-accent disabled:opacity-50 aria-[invalid=true]:border-err"
        data-testid={testId}
      >
        <option value="" className="bg-white text-[#0a1d23]">
          {placeholder}
        </option>
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-white text-[#0a1d23]">
            {o.label}
          </option>
        ))}
      </select>
      <svg aria-hidden width="12" height="8" viewBox="0 0 12 8" className="pointer-events-none absolute end-4 top-[26px] text-dim">
        <path d="M1 1l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.5" />
      </svg>
      {error && (
        <p id={`${id}-e`} role="alert" className="mt-1 text-[13px] leading-5 text-err">
          {error}
        </p>
      )}
    </div>
  );
}

function AssignForm({ approved, students, onAssign, preset }: { approved: Person[]; students: Person[]; onAssign: (instructor: string, student: string, program: string | null) => Promise<void>; preset: { id: string; tick: number } | null }) {
  const [instructor, setInstructor] = useState("");
  const [student, setStudent] = useState("");
  const [program, setProgram] = useState("");
  const [find, setFind] = useState("");
  const [errors, setErrors] = useState<{ instructor?: string; student?: string; form?: string }>({});
  const [busy, setBusy] = useState(false);

  // The "Assign" button of a student without an instructor fills the student here.
  useEffect(() => {
    if (!preset) return;
    setStudent(preset.id);
    setFind("");
    setErrors({});
  }, [preset]);

  const needle = find.trim().toLowerCase();
  const options = useMemo(
    () =>
      students
        .filter((s) => s.id === student || matches(needle, s.full_name, s.email))
        .map((s) => ({ value: s.id, label: [s.full_name?.trim(), s.email].filter(Boolean).join(" · ") || s.id })),
    [students, needle, student],
  );
  const instructorOptions = approved.map((i) => ({ value: i.id, label: nameOf(i) }));
  const programOptions = INSTRUCTOR_SUBJECTS.map((o) => ({ value: o.value, label: o.label }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const next: typeof errors = {};
    if (!instructor) next.instructor = c.form.needInstructor;
    if (!student) next.student = c.form.needStudent;
    setErrors(next);
    if (next.instructor || next.student) return;
    setBusy(true);
    try {
      await onAssign(instructor, student, program || null);
      setStudent("");
      setProgram("");
      setFind("");
    } catch (err) {
      setErrors({ form: errorText(err) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="card grid gap-5 p-6 md:p-7" data-testid="assign-form" aria-label={c.sections.assign.title}>
      {approved.length === 0 && (
        <p className="t-small text-dim" data-testid="no-approved">
          {c.form.noApproved}
        </p>
      )}
      <div className="grid gap-x-6 gap-y-6 md:grid-cols-2">
        <Pick label={c.form.instructor} value={instructor} onChange={(v) => { setInstructor(v); setErrors({}); }} options={instructorOptions} placeholder={c.form.instructorEmpty} error={errors.instructor} testId="assign-instructor" disabled={approved.length === 0} />
        <Pick label={c.form.program} value={program} onChange={setProgram} options={programOptions} placeholder={c.form.programNone} testId="assign-program" />
        <Input label={c.form.studentSearch} type="search" value={find} onChange={(e) => setFind(e.target.value)} autoComplete="off" data-testid="assign-student-search" />
        <Pick label={c.form.student} value={student} onChange={(v) => { setStudent(v); setErrors({}); }} options={options} placeholder={students.length === 0 ? c.form.noStudents : options.length === 0 ? c.form.noMatch : c.form.studentEmpty} error={errors.student} testId="assign-student" disabled={students.length === 0} />
      </div>
      {errors.form && (
        <p role="alert" className="rounded-[4px] border px-4 py-3 text-[15px]" style={{ borderColor: "var(--err)", color: "var(--err)" }} data-testid="assign-error">
          {errors.form}
        </p>
      )}
      <div>
        <Button type="submit" disabled={busy || approved.length === 0} className="!h-12 !px-5" data-testid="assign-save">
          {busy ? c.form.saving : c.form.save}
        </Button>
      </div>
    </form>
  );
}

function InstructorGroup({ instructor, status, rows, person, onRemove }: { instructor: Person; status: VerificationStatus; rows: InstructorAssignment[]; person: Map<string, Person>; onRemove: (a: InstructorAssignment) => Promise<void> }) {
  const ok = status === "approved";
  return (
    <article className="card p-6 md:p-7" data-testid="instructor-group" data-id={instructor.id} data-status={status}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="!text-[1.25rem] !font-semibold !tracking-normal">{nameOf(instructor)}</h3>
          {instructor.full_name && instructor.email && <p className="t-small mt-1 break-all text-dim">{instructor.email}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="mono" data-testid="group-count">
            {c.group.students(rows.length)}
          </span>
          <VerificationBadge status={status} />
        </div>
      </div>

      {!ok && (
        <p className="t-small mt-4 text-dim" data-testid="group-note">
          {status === "pending" ? (
            <>
              {c.group.approveFirst}.{" "}
              <Link href="/admin/instructors/" prefetch={false} className="ul-draw pb-0.5 text-text hover:text-accent-text">
                {c.group.approveLink}
              </Link>
            </>
          ) : (
            c.group.rejected
          )}
        </p>
      )}

      {rows.length === 0 ? (
        ok && <p className="t-small mt-4 text-dim">{c.group.none}</p>
      ) : (
        <ul className="mt-5 grid overflow-hidden rounded-[4px] border" style={rule}>
          {rows.map((a) => (
            <AssignmentRow key={a.id} a={a} student={person.get(a.student_id)} onRemove={onRemove} />
          ))}
        </ul>
      )}
    </article>
  );
}

function AssignmentRow({ a, student, onRemove }: { a: InstructorAssignment; student: Person | undefined; onRemove: (a: InstructorAssignment) => Promise<void> }) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const name = nameOf(student);
  const program = a.program ? labelOf(INSTRUCTOR_SUBJECTS, a.program) : c.form.programNone;

  async function go() {
    setBusy(true);
    setErr(null);
    try {
      await onRemove(a);
    } catch (e) {
      setErr(errorText(e));
      setBusy(false);
    }
  }

  return (
    <li className="grid gap-3 border-b px-4 py-3 last:border-b-0" style={rule} data-testid="assignment-row" data-id={a.id} data-student={a.student_id}>
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
        <div className="min-w-0">
          <p className="break-words text-[15px] font-medium text-text">{name}</p>
          <p className="t-small text-dim">
            <span data-testid="assignment-program">{program}</span>
            <span aria-hidden> · </span>
            <span className="sr-only">, </span>
            {c.group.since} <span data-testid="assignment-date">{fmtDate(a.created_at)}</span>
          </p>
        </div>
        {!confirming && (
          <Button variant="secondary" className="!h-10 !px-4" onClick={() => setConfirming(true)} aria-label={`${c.remove}: ${name}`} data-testid="remove-assignment">
            {c.remove}
          </Button>
        )}
      </div>
      {confirming && (
        <div className={cn("grid gap-3 rounded-[4px] border p-4")} style={rule} role="group" aria-label={c.confirm(name)} data-testid="remove-confirm">
          <p className="text-[15px] text-text">{c.confirm(name)}</p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button onClick={go} disabled={busy} className="!h-11 !px-5" data-testid="confirm-remove">
              {busy ? c.removing : c.confirmYes}
            </Button>
            <Button variant="secondary" onClick={() => { setConfirming(false); setErr(null); }} disabled={busy} className="!h-11 !px-5" data-testid="cancel-remove">
              {c.cancel}
            </Button>
          </div>
        </div>
      )}
      {err && (
        <p role="alert" className="text-[13px] leading-5 text-err">
          {err}
        </p>
      )}
    </li>
  );
}
