"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";
import type { InstructorEvaluation, MyStudent } from "@/lib/db";
import { instructorContextLabel } from "@/lib/instructorEvaluationSchema";
import { account } from "@/content/copy-account";
import { evaluations } from "@/content/copy-evaluations";
import { Tag } from "@/components/ds/Chips";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/account/AccountShell";
import { Notice } from "@/components/account/Notice";
import { Block } from "@/components/account/Skeleton";
import { fmtDate } from "@/components/account/format";
import { useHashScroll } from "@/components/account/useHashScroll";
import { programTitle } from "./parts";

const s = account.instructor.students;
const m = evaluations.instructorEvals.mine;
const rule = { borderColor: "var(--rule)" } as const;

// What the list needs of an evaluation. The private note is not loaded here.
type Mine = Pick<InstructorEvaluation, "id" | "student_id" | "context" | "status" | "moderation_note" | "created_at">;
const COLUMNS = "id,student_id,context,status,moderation_note,created_at";

// Dashboard panel I-100 · YOUR STUDENTS. An approved instructor sees the students the team assigned (public.my_students:
// name, program, since when) and the evaluations they wrote. A pending or rejected instructor sees a note and nothing
// is requested. Instructors never read a student's profile.
export function InstructorStudents({ className }: { className?: string }) {
  const { instructor } = useAuth();
  const approved = instructor?.verification_status === "approved";
  return (
    <Panel id="students" label={s.label} className={className ? `scroll-mt-24 ${className}` : "scroll-mt-24"}>
      {approved ? <Loaded /> : <Locked status={instructor?.verification_status === "rejected" ? "rejected" : "pending"} />}
    </Panel>
  );
}

function Locked({ status }: { status: "pending" | "rejected" }) {
  useHashScroll(true);
  return (
    <div className="card p-6 md:p-7" data-testid="students-locked" data-status={status}>
      <p className="t-small max-w-[60ch] text-muted">{s[status]}</p>
    </div>
  );
}

function Loaded() {
  const { user } = useAuth();
  const [students, setStudents] = useState<MyStudent[] | null>(null);
  const [mine, setMine] = useState<Mine[] | null>(null);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    const sb = getSupabase();
    if (!sb || !user) return;
    setError(false);
    const [a, b] = await Promise.all([
      sb.from("my_students").select("*").order("assigned_at", { ascending: false }),
      sb.from("instructor_evaluations").select(COLUMNS).eq("instructor_id", user.id).order("created_at", { ascending: false }),
    ]);
    if (a.error || b.error) return setError(true);
    setStudents((a.data ?? []) as MyStudent[]);
    setMine((b.data ?? []) as Mine[]);
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  useHashScroll(students !== null || error);

  if (error)
    return (
      <Notice tone="error" action={{ label: "Try again", onClick: () => void load() }}>
        {s.loadError}
      </Notice>
    );
  if (students === null || mine === null)
    return (
      <div className="grid gap-4" aria-busy="true">
        <Block className="h-40 rounded-[12px]" />
      </div>
    );
  if (students.length === 0)
    return (
      <div className="card p-6 md:p-7" data-testid="students-empty">
        <p className="t-small max-w-[60ch] text-muted">{s.empty}</p>
      </div>
    );

  return (
    <div>
      <p className="mono !normal-case" data-testid="students-count">
        {s.count(students.length)}
      </p>
      <ul className="mt-4 grid gap-5 sm:grid-cols-2 xl:grid-cols-3" aria-label={s.list}>
        {students.map((st) => (
          <li key={st.assignment_id} className="flex min-w-0">
            <StudentCard student={st} mine={mine.filter((e) => e.student_id === st.student_id)} />
          </li>
        ))}
      </ul>
      <div className="mt-14" data-testid="my-evaluations-block">
        <h3 className="mono rule-b pb-3 !text-xs !font-normal !tracking-[0.08em]">{m.label}</h3>
        <div className="mt-6">
          <MyEvaluations students={students} mine={mine} />
        </div>
      </div>
    </div>
  );
}

function StudentCard({ student, mine }: { student: MyStudent; mine: Mine[] }) {
  const open = mine.find((e) => e.status === "submitted");
  const href = `/account/evaluate-student/?student=${student.student_id}${open ? `&context=${open.context}` : ""}`;
  const name = student.full_name || m.unknownStudent;
  return (
    <article className="card flex w-full flex-col p-6" aria-labelledby={`st-${student.assignment_id}`} data-testid="student-card" data-student={student.student_id}>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <span className="mono !text-text">ST-{student.student_id.replace(/-/g, "").slice(-6).toUpperCase()}</span>
        {mine.length > 0 && (
          <Tag tone="blueprint" className="whitespace-nowrap">
            {s.evaluated(mine.length)}
          </Tag>
        )}
      </div>
      <h3 id={`st-${student.assignment_id}`} className="mt-4 !text-[1.375rem] !font-semibold !tracking-normal">
        {name}
      </h3>
      <dl className="mt-5 grid gap-4 border-t pt-4" style={rule}>
        <div>
          <dt className="mono">{s.program}</dt>
          <dd className="mt-1 text-[15px] text-text">{student.program ? programTitle(student.program) : <span className="text-dim">{s.noProgram}</span>}</dd>
        </div>
        <div>
          <dt className="mono">{s.assigned}</dt>
          <dd className="mt-1 text-[15px] text-text">{fmtDate(student.assigned_at)}</dd>
        </div>
      </dl>
      <div className="mt-auto flex flex-wrap items-center gap-x-6 gap-y-3 pt-6">
        <Button href={href} variant={open ? "secondary" : "primary"} className="!h-12 !px-5">
          {open ? s.edit : s.evaluate}
          <span className="sr-only"> {name}</span>
        </Button>
      </div>
    </article>
  );
}

function MyEvaluations({ students, mine }: { students: MyStudent[]; mine: Mine[] }) {
  if (mine.length === 0) return <p className="t-small text-muted">{m.empty}</p>;
  const names = new Map(students.map((x) => [x.student_id, x.full_name]));
  return (
    <ul className="border-t" style={rule} data-testid="my-evaluations">
      {mine.map((e) => (
        <li key={e.id} className="grid gap-2 border-b py-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-start md:gap-x-8" style={rule} data-testid="my-evaluation" data-status={e.status}>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <p className="text-[1.0625rem] font-medium text-text">{names.get(e.student_id) || m.unknownStudent}</p>
              <Tag tone={e.status === "published" ? "blueprint" : e.status === "submitted" ? "brass" : "default"}>
                <span data-testid="evaluation-status">{m.status[e.status]}</span>
              </Tag>
            </div>
            <p className="t-small mt-1 text-muted">{[instructorContextLabel(e.context), `${m.sent} ${fmtDate(e.created_at)}`].join(" · ")}</p>
            <p className="t-small mt-2 text-dim">{m.statusNote[e.status]}</p>
            {e.status === "hidden" && e.moderation_note && (
              <p className="mt-3 border-s-2 ps-4 text-[15px] text-text" style={rule} data-testid="team-note">
                <span className="mono block">{m.teamNote}</span>
                {e.moderation_note}
              </p>
            )}
          </div>
          <Link
            prefetch={false}
            href={`/account/evaluate-student/?student=${e.student_id}&context=${e.context}`}
            className="ul-draw inline-flex min-h-11 items-center self-start pb-0.5 text-[15px] font-medium text-text hover:text-accent-text"
          >
            {e.status === "submitted" ? m.edit : m.view}
            <span className="sr-only"> {names.get(e.student_id) || m.unknownStudent}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
