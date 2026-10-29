"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";
import type { CriterionKey, EvaluationView, InstructorEvaluation, MyStudent } from "@/lib/db";
import {
  CRITERIA,
  INSTRUCTOR_CONTEXTS,
  READINESS,
  emptyInstructorEvaluation,
  instructorEvaluationErrors,
  instructorEvaluationRow,
  instructorEvaluationSchema,
  instructorValuesFromRow,
  type InstructorEvaluationValues,
} from "@/lib/instructorEvaluationSchema";
import { evaluations } from "@/content/copy-evaluations";
import { TextareaField } from "@/components/forms/Field";
import { Button } from "@/components/ui/Button";
import { OptSelect } from "@/components/account/signup/fields";
import { AccountShell } from "@/components/account/AccountShell";
import { LiveStatus, Notice } from "@/components/account/Notice";
import { Block } from "@/components/account/Skeleton";
import { fmtDate } from "@/components/account/format";
import { ScoreInput, StudentEvaluationCard, programTitle, shortName } from "./parts";

const f = evaluations.form;
const t = evaluations.instructorEvals;
const rule = { borderColor: "var(--rule)" } as const;

// /account/evaluate-student/?student=<id>[&context=<context>]: an approved instructor evaluates a student the team
// assigned to them. Static export, so the id comes from the query string after mount. The student is read from the
// view my_students only (name and program), never from the student's profile. The database enforces the same rules:
// verified instructor, assigned student, the daily cap, the "submitted" status and the lock after the team decides.
export function InstructorEvaluateScreen() {
  return (
    <AccountShell sheet={t.sheet} name={t.name} title={t.title} lead={t.lead} actions={<Button href="/account/#students" variant="link">{t.back}</Button>}>
      <Gate />
    </AccountShell>
  );
}

function Gate() {
  const { isInstructor, instructor } = useAuth();
  const [params, setParams] = useState<{ student: string; context: string } | null>(null);
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    setParams({ student: sp.get("student") ?? "", context: sp.get("context") ?? "" });
  }, []);
  if (!params) return <Block className="h-64 rounded-[12px]" />;
  if (!isInstructor) return <Notice>{t.instructorsOnly}</Notice>;
  if (instructor?.verification_status !== "approved")
    return (
      <Notice>
        {t.notApproved}{" "}
        <Link prefetch={false} href="/account/" className="ul-draw pb-0.5 font-medium hover:text-accent-text">
          {t.back}
        </Link>
      </Notice>
    );
  return <Loaded studentId={params.student} contextParam={params.context} />;
}

type Phase = "idle" | "sending" | "done" | "failed";

function Loaded({ studentId, contextParam }: { studentId: string; contextParam: string }) {
  const { user, profile } = useAuth();
  const [student, setStudent] = useState<MyStudent | null | undefined>(undefined);
  const [mine, setMine] = useState<InstructorEvaluation[]>([]);
  const [loadError, setLoadError] = useState(false);
  const [values, setValues] = useState<InstructorEvaluationValues | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [summary, setSummary] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [message, setMessage] = useState("");
  const [saved, setSaved] = useState<"created" | "edited" | null>(null);
  const summaryRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const sb = getSupabase();
    if (!sb || !user) return;
    setLoadError(false);
    if (!/^[0-9a-f-]{36}$/i.test(studentId)) return setStudent(null);
    const [s, m] = await Promise.all([
      sb.from("my_students").select("*").eq("student_id", studentId).maybeSingle(),
      sb.from("instructor_evaluations").select("*").eq("student_id", studentId).eq("instructor_id", user.id).order("created_at", { ascending: false }),
    ]);
    if (s.error || m.error) return setLoadError(true);
    const list = (m.data ?? []) as InstructorEvaluation[];
    setStudent((s.data as MyStudent | null) ?? null);
    setMine(list);
    // A link with a reason opens that evaluation (read-only once decided); a link without one opens the one still
    // waiting, or a new form. A decided evaluation never hides the way to write another.
    const first = list.find((x) => x.context === contextParam) ?? list.find((x) => x.status === "submitted");
    setValues(first ? instructorValuesFromRow(first) : { ...emptyInstructorEvaluation(), context: INSTRUCTOR_CONTEXTS.some((x) => x.value === contextParam) ? contextParam : "" });
  }, [user, studentId, contextParam]);

  useEffect(() => {
    void load();
  }, [load]);

  const existing = useMemo(() => (values ? (mine.find((x) => x.context === values.context) ?? null) : null), [mine, values]);
  const locked = existing !== null && existing.status !== "submitted";

  if (loadError)
    return (
      <Notice tone="error" action={{ label: "Try again", onClick: () => void load() }}>
        {t.loadError}
      </Notice>
    );
  if (student === null)
    return (
      <div className="card max-w-[640px] p-7 md:p-9" data-testid="student-missing">
        <h2 className="t-h3">{t.missing.title}</h2>
        <p className="t-small mt-3 text-muted">{t.missing.text}</p>
        <div className="mt-6">
          <Button href="/account/#students" variant="secondary">
            {t.missing.action}
          </Button>
        </div>
      </div>
    );
  if (student === undefined || values === null) return <Block className="h-80 rounded-[12px]" />;

  const touch = () => {
    if (phase === "done" || phase === "failed") setPhase("idle");
  };
  const clearError = (k: string) => setErrors((s) => Object.fromEntries(Object.entries(s).filter(([key]) => key !== k)));
  const set = <K extends keyof InstructorEvaluationValues>(k: K, v: InstructorEvaluationValues[K]) => {
    setValues((s) => (s ? { ...s, [k]: v } : s));
    clearError(String(k));
    touch();
  };
  const setScore = (k: CriterionKey, n: number) => {
    setValues((s) => (s ? { ...s, scores: { ...s.scores, [k]: n } } : s));
    clearError(`score-${k}`);
    touch();
  };
  // Switching the reason loads the evaluation for that reason if there is one; otherwise the words typed so far stay.
  const pickContext = (ctx: string) => {
    const found = mine.find((x) => x.context === ctx);
    setValues((s) => (found ? instructorValuesFromRow(found) : { ...(s && !existing ? s : emptyInstructorEvaluation()), context: ctx }));
    clearError("context");
    setSaved(null);
    setPhase("idle");
  };

  const focusField = (k: string) => {
    const el = document.querySelector<HTMLElement>(`[name="${k}"]`);
    el?.focus();
    el?.scrollIntoView({ block: "center" });
  };

  async function submit(ev: React.FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    if (phase === "sending" || !values || !user || locked) return;
    const errs = instructorEvaluationErrors(values);
    setErrors(errs);
    setSummary(true);
    if (Object.keys(errs).length) {
      requestAnimationFrame(() => summaryRef.current?.focus());
      return;
    }
    const sb = getSupabase();
    if (!sb) return;
    const parsed = instructorEvaluationSchema.parse(values);
    setPhase("sending");
    setMessage("");
    const row = instructorEvaluationRow(parsed, studentId, user.id, student?.program ?? null);
    if (existing) {
      const body = { scores: row.scores, overall: row.overall, readiness: row.readiness, strengths: row.strengths, improvements: row.improvements, private_note: row.private_note };
      const { data, error } = await sb.from("instructor_evaluations").update(body).eq("id", existing.id).select();
      if (error) return fail(error);
      const changed = (data ?? []) as InstructorEvaluation[];
      if (changed.length === 0) {
        setPhase("failed");
        return setMessage(f.locked);
      }
      setMine((list) => list.map((x) => (x.id === changed[0].id ? changed[0] : x)));
      setSaved("edited");
    } else {
      const { data, error } = await sb.from("instructor_evaluations").insert(row).select().single();
      if (error || !data) return fail(error);
      setMine((list) => [data as InstructorEvaluation, ...list]);
      setSaved("created");
    }
    setPhase("done");
  }

  function fail(error: { message?: string; code?: string } | null) {
    const text = (error?.message ?? "").toLowerCase();
    setPhase("failed");
    if (text.includes("daily limit")) setMessage(t.limit);
    else if (error?.code === "23505" || text.includes("duplicate")) setMessage(f.duplicate);
    else if (text.includes("not assigned")) setMessage(t.notAssigned);
    else if (text.includes("locked")) setMessage(f.locked);
    else setMessage(f.failed);
  }

  const errorList = Object.entries(errors);
  const preview: EvaluationView = {
    id: "preview",
    published_at: new Date().toISOString(),
    context: (values.context || "mid_course") as EvaluationView["context"],
    scores: values.scores,
    overall: values.overall,
    recommendation: null,
    strengths: values.strengths.trim(),
    improvements: values.improvements.trim(),
    company_name: null,
    source: "instructor",
    author_name: shortName(profile?.full_name) || null,
    program: student?.program ?? null,
    readiness: (values.readiness || null) as EvaluationView["readiness"],
  };

  return (
    <div className="grid-12 gap-y-10">
      <div className="col-span-12 min-w-0 lg:col-span-7 lg:row-start-1">
        <section className="card mb-10 p-6" aria-label={t.student.label} data-testid="evaluate-student">
          <p className="mono">{t.student.label}</p>
          <h2 className="mt-2 !text-[1.375rem] !font-semibold !tracking-normal">{student?.full_name || "·"}</h2>
          <dl className="mt-4 grid gap-3 border-t pt-4 sm:grid-cols-2" style={rule}>
            <div>
              <dt className="mono">{t.student.program}</dt>
              <dd className="mt-1 text-[15px] text-text">{student?.program ? programTitle(student.program) : t.noProgram}</dd>
            </div>
            {student?.assigned_at && (
              <div>
                <dt className="mono">{t.student.assigned}</dt>
                <dd className="mt-1 text-[15px] text-text">{fmtDate(student.assigned_at)}</dd>
              </div>
            )}
          </dl>
        </section>

        {summary && errorList.length > 0 && (
          <div ref={summaryRef} tabIndex={-1} role="alert" className="mb-8 rounded-[8px] border border-err p-5 outline-none" data-testid="error-summary">
            <p className="font-medium text-text">{f.errorSummary(errorList.length)}</p>
            <ul className="mt-3 grid gap-1.5">
              {errorList.map(([k, msg]) => (
                <li key={k}>
                  <button type="button" onClick={() => focusField(k)} className="text-start text-[15px] text-err underline underline-offset-4">
                    {msg}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <form id="evaluation-form" onSubmit={submit} noValidate className="grid gap-10" aria-describedby={locked ? "eval-locked" : undefined}>
          <div className="grid gap-3">
            <OptSelect label={t.context.label} name="context" options={INSTRUCTOR_CONTEXTS} value={values.context} onChange={pickContext} error={errors.context} placeholder={t.context.choose} />
            {existing && existing.status === "submitted" && (
              <p className="mono !normal-case" data-testid="editing-note">
                {t.context.existing}
              </p>
            )}
          </div>

          {locked && existing ? (
            <div id="eval-locked" className="grid gap-5" data-testid="evaluation-locked">
              <Notice tone={existing.status === "hidden" ? "error" : "info"}>{existing.status === "published" ? f.lockedPublished : f.lockedHidden}</Notice>
              {existing.moderation_note && (
                <p className="border-s-2 ps-4 text-[15px] text-text" style={rule}>
                  <span className="mono block">{t.mine.teamNote}</span>
                  {existing.moderation_note}
                </p>
              )}
              <div>
                <p className="mono">{t.privateNote.label}</p>
                <p className="mono mt-1 !normal-case">{t.privateNote.tag}</p>
                <p className="mt-2 whitespace-pre-line break-words text-[15px] text-text">{existing.private_note || "·"}</p>
              </div>
            </div>
          ) : (
            <>
              <fieldset className="grid gap-8">
                <legend className="sr-only">{f.scoresTitle}</legend>
                <div>
                  <p className="mono rule-b pb-3 !text-xs !font-normal !tracking-[0.08em]" aria-hidden>
                    {f.scoresTitle}
                  </p>
                  <p className="t-small mt-4 text-muted">{t.scoresLead}</p>
                </div>
                {CRITERIA.map((k) => (
                  <ScoreInput key={k.key} name={`score-${k.key}`} label={k.label} hint={k.hint} value={values.scores[k.key]} onChange={(n) => setScore(k.key, n)} error={errors[`score-${k.key}`]} />
                ))}
                <ScoreInput name="overall" label={f.overall} hint={t.overallLead} value={values.overall} onChange={(n) => set("overall", n)} error={errors.overall} />
              </fieldset>

              <OptSelect label={t.readiness.label} name="readiness" options={READINESS} value={values.readiness} onChange={(x) => set("readiness", x)} error={errors.readiness} placeholder={t.readiness.choose} />

              <div>
                <TextareaField label={f.strengths.label} name="strengths" rows={4} value={values.strengths} onChange={(e) => set("strengths", e.target.value)} error={errors.strengths} aria-describedby="strengths-hint" />
                <p id="strengths-hint" className="t-small mt-6 text-dim">
                  {f.strengths.hint} <span className="mono !normal-case">{f.count(values.strengths.length)}</span>
                </p>
              </div>
              <div>
                <TextareaField label={f.improvements.label} name="improvements" rows={4} value={values.improvements} onChange={(e) => set("improvements", e.target.value)} error={errors.improvements} aria-describedby="improvements-hint" />
                <p id="improvements-hint" className="t-small mt-6 text-dim">
                  {f.improvements.hint} <span className="mono !normal-case">{f.count(values.improvements.length)}</span>
                </p>
              </div>
              <div className="rounded-[8px] border p-5" style={rule}>
                <p className="mono !text-text">{t.privateNote.tag}</p>
                <div className="mt-4">
                  <TextareaField label={t.privateNote.label} name="private_note" rows={3} value={values.private_note} onChange={(e) => set("private_note", e.target.value)} error={errors.private_note} aria-describedby="private-hint" />
                </div>
                <p id="private-hint" className="t-small mt-6 text-dim">
                  {t.privateNote.hint} <span className="mono !normal-case">{f.count(values.private_note.length)}</span>
                </p>
              </div>
            </>
          )}
        </form>
      </div>

      <aside className="col-span-12 min-w-0 self-start lg:col-span-5 lg:row-span-2 lg:row-start-1 lg:sticky lg:top-24" aria-label={f.previewTitle} data-testid="evaluation-preview-panel">
        <p className="mono">{f.previewTitle}</p>
        <p className="t-small mt-1 text-dim">{f.previewLead}</p>
        <StudentEvaluationCard ev={preview} preview className="mt-4" />
      </aside>

      <div className="col-span-12 grid min-w-0 gap-5 lg:col-span-7 lg:row-start-2">
        {phase === "done" && saved && (
          <div className="grid gap-4" data-testid="evaluation-sent">
            <Notice tone="ok">{saved === "created" ? f.success : f.savedEdit}</Notice>
            <p className="flex flex-wrap gap-x-6 gap-y-2 text-[15px]">
              <Link prefetch={false} href="/account/#students" className="ul-draw pb-0.5 font-medium text-text hover:text-accent-text">
                {t.another}
              </Link>
            </p>
          </div>
        )}
        {phase === "failed" && (
          <Notice tone="error" action={{ label: "Dismiss", onClick: () => setPhase("idle") }}>
            {message}
          </Notice>
        )}
        {!locked && (
          <>
            <p className="t-small max-w-[60ch] text-muted" data-testid="review-note">
              {t.review}
            </p>
            <div className="flex items-center gap-6">
              <Button type="submit" form="evaluation-form" disabled={phase === "sending"} className="sm:min-w-[220px]" data-testid="submit-evaluation">
                {phase === "sending" ? (existing ? f.saving : f.sending) : existing ? f.save : f.submit}
              </Button>
              <LiveStatus>{phase === "sending" ? (existing ? f.saving : f.sending) : ""}</LiveStatus>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
