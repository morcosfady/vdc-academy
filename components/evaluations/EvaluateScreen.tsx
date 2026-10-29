"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";
import type { CriterionKey, EvaluationView, StudentEvaluation, TalentCard } from "@/lib/db";
import { CONTEXTS, CRITERIA, RECOMMENDATIONS, emptyEvaluation, evaluationErrors, evaluationRow, evaluationSchema, valuesFromRow, type EvaluationValues } from "@/lib/evaluationSchema";
import { evaluations } from "@/content/copy-evaluations";
import { Software } from "@/components/ds/Chips";
import { Check, TextareaField } from "@/components/forms/Field";
import { Button } from "@/components/ui/Button";
import { OptSelect } from "@/components/account/signup/fields";
import { AccountShell } from "@/components/account/AccountShell";
import { LiveStatus, Notice } from "@/components/account/Notice";
import { Block } from "@/components/account/Skeleton";
import { ScoreInput, StudentEvaluationCard, programTitle } from "./parts";

const f = evaluations.form;
const rule = { borderColor: "var(--rule)" } as const;

// /account/evaluate/?student=<id>[&context=<context>]: the evaluation form for one student. Static export, so the id
// comes from the query string after mount. Only a verified recruiter gets past the first check; the database enforces
// the same rule, the opt-in of the student, the daily cap and the "submitted" status.
export function EvaluateScreen() {
  return (
    <AccountShell sheet={f.sheet} name={f.name} title={f.title} lead={f.lead} actions={<Button href="/account/#talent" variant="link">{f.back}</Button>}>
      <Gate />
    </AccountShell>
  );
}

function Gate() {
  const { isRecruiter, recruiter } = useAuth();
  const [params, setParams] = useState<{ student: string; context: string } | null>(null);
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    setParams({ student: sp.get("student") ?? "", context: sp.get("context") ?? "" });
  }, []);
  if (!params) return <Block className="h-64 rounded-[12px]" />;
  if (!isRecruiter) return <Notice>{f.recruitersOnly}</Notice>;
  if (recruiter?.verification_status !== "approved")
    return (
      <Notice>
        {f.notVerified}{" "}
        <Link prefetch={false} href="/account/" className="ul-draw pb-0.5 font-medium hover:text-accent-text">
          {f.back}
        </Link>
      </Notice>
    );
  return <Loaded studentId={params.student} contextParam={params.context} />;
}

type Phase = "idle" | "sending" | "done" | "failed";

function Loaded({ studentId, contextParam }: { studentId: string; contextParam: string }) {
  const { user, recruiter } = useAuth();
  const [card, setCard] = useState<TalentCard | null | undefined>(undefined);
  const [mine, setMine] = useState<StudentEvaluation[]>([]);
  const [loadError, setLoadError] = useState(false);
  const [values, setValues] = useState<EvaluationValues | null>(null);
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
    if (!/^[0-9a-f-]{36}$/i.test(studentId)) return setCard(null);
    const [t, m] = await Promise.all([
      sb.from("talent_cards").select("*").eq("student_id", studentId).maybeSingle(),
      sb.from("student_evaluations").select("*").eq("student_id", studentId).eq("recruiter_id", user.id).order("created_at", { ascending: false }),
    ]);
    if (t.error || m.error) return setLoadError(true);
    const list = (m.data ?? []) as StudentEvaluation[];
    setCard((t.data as TalentCard | null) ?? null);
    setMine(list);
    const first = list.find((x) => x.context === contextParam) ?? list.find((x) => x.status === "submitted") ?? list[0];
    setValues(first ? valuesFromRow(first) : { ...emptyEvaluation(), context: CONTEXTS.some((x) => x.value === contextParam) ? contextParam : "" });
  }, [user, studentId, contextParam]);

  useEffect(() => {
    void load();
  }, [load]);

  const existing = useMemo(() => (values ? mine.find((x) => x.context === values.context) ?? null : null), [mine, values]);
  const locked = existing !== null && existing.status !== "submitted";

  if (loadError)
    return (
      <Notice tone="error" action={{ label: "Try again", onClick: () => void load() }}>
        {f.loadError}
      </Notice>
    );
  if (card === undefined || values === null) return <Block className="h-80 rounded-[12px]" />;
  if (card === null)
    return (
      <div className="card max-w-[640px] p-7 md:p-9" data-testid="student-missing">
        <h2 className="t-h3">{f.missing.title}</h2>
        <p className="t-small mt-3 text-muted">{f.missing.text}</p>
        <div className="mt-6">
          <Button href="/account/#talent" variant="secondary">
            {f.missing.action}
          </Button>
        </div>
      </div>
    );

  const touch = () => {
    if (phase === "done" || phase === "failed") setPhase("idle");
  };
  const clearError = (k: string) => setErrors((s) => Object.fromEntries(Object.entries(s).filter(([key]) => key !== k)));
  const set = <K extends keyof EvaluationValues>(k: K, v: EvaluationValues[K]) => {
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
    setValues((s) => (found ? valuesFromRow(found) : { ...(s && !existing ? s : emptyEvaluation()), context: ctx }));
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
    const errs = evaluationErrors(values);
    setErrors(errs);
    setSummary(true);
    if (Object.keys(errs).length) {
      requestAnimationFrame(() => summaryRef.current?.focus());
      return;
    }
    const sb = getSupabase();
    if (!sb) return;
    const parsed = evaluationSchema.parse(values);
    setPhase("sending");
    setMessage("");
    const row = evaluationRow(parsed, studentId, user.id);
    if (existing) {
      const body = { scores: row.scores, overall: row.overall, recommendation: row.recommendation, strengths: row.strengths, improvements: row.improvements, private_note: row.private_note, show_company_name: row.show_company_name };
      const { data, error } = await sb.from("student_evaluations").update(body).eq("id", existing.id).select();
      if (error) return fail(error);
      const changed = (data ?? []) as StudentEvaluation[];
      if (changed.length === 0) {
        setPhase("failed");
        return setMessage(f.locked);
      }
      setMine((list) => list.map((x) => (x.id === changed[0].id ? changed[0] : x)));
      setSaved("edited");
    } else {
      const { data, error } = await sb.from("student_evaluations").insert(row).select().single();
      if (error || !data) return fail(error);
      setMine((list) => [data as StudentEvaluation, ...list]);
      setSaved("created");
    }
    setPhase("done");
  }

  function fail(error: { message?: string; code?: string } | null) {
    const text = (error?.message ?? "").toLowerCase();
    setPhase("failed");
    if (text.includes("daily limit")) setMessage(f.limit);
    else if (error?.code === "23505" || text.includes("duplicate")) setMessage(f.duplicate);
    else if (text.includes("not available")) setMessage(f.unavailable);
    else if (text.includes("locked")) setMessage(f.locked);
    else setMessage(f.failed);
  }

  const errorList = Object.entries(errors);
  const place = [card.city, card.country].filter(Boolean).join(", ");
  const preview: EvaluationView = {
    id: "preview",
    published_at: new Date().toISOString(),
    context: (values.context || "portfolio_review") as EvaluationView["context"],
    scores: values.scores,
    overall: values.overall,
    recommendation: (values.recommendation || "") as EvaluationView["recommendation"],
    strengths: values.strengths.trim(),
    improvements: values.improvements.trim(),
    company_name: values.show_company_name ? (recruiter?.company_name ?? null) : null,
  };

  return (
    <div className="grid-12 gap-y-10">
      <div className="col-span-12 lg:col-span-7 lg:row-start-1">
        <section className="card mb-10 p-6" aria-label={f.student.label} data-testid="evaluate-student">
          <p className="mono">{f.student.label}</p>
          <h2 className="mt-2 !text-[1.375rem] !font-semibold !tracking-normal">{card.display_name}</h2>
          {place && <p className="t-small mt-1 text-muted">{place}</p>}
          <dl className="mt-4 grid gap-3 border-t pt-4 sm:grid-cols-2" style={rule}>
            <div className="sm:col-span-2">
              <dt className="mono">{f.student.programs}</dt>
              <dd className="mt-1 text-[15px] text-text">{card.programs.length ? card.programs.map(programTitle).join(", ") : "·"}</dd>
            </div>
            {card.graduation_year && (
              <div>
                <dt className="mono">{f.student.graduated}</dt>
                <dd className="mt-1 text-[15px] text-text">{card.graduation_year}</dd>
              </div>
            )}
            {card.software.length > 0 && (
              <div className="sm:col-span-2">
                <dt className="mono">{f.student.skills}</dt>
                <dd className="mt-2 flex flex-wrap gap-2">
                  {card.software.map((s) => (
                    <Software key={s}>{s}</Software>
                  ))}
                </dd>
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
            <OptSelect label={f.context.label} name="context" options={CONTEXTS} value={values.context} onChange={pickContext} error={errors.context} placeholder={f.context.choose} />
            {existing && existing.status === "submitted" && <p className="mono !normal-case" data-testid="editing-note">{f.context.existing}</p>}
          </div>

          {locked && existing ? (
            <div id="eval-locked" className="grid gap-5" data-testid="evaluation-locked">
              <Notice tone={existing.status === "hidden" ? "error" : "info"}>{existing.status === "published" ? f.lockedPublished : f.lockedHidden}</Notice>
              {existing.moderation_note && (
                <p className="border-s-2 ps-4 text-[15px] text-text" style={rule}>
                  <span className="mono block">{evaluations.recruiter.mine.teamNote}</span>
                  {existing.moderation_note}
                </p>
              )}
              <div>
                <p className="mono">{f.privateNote.label}</p>
                <p className="mono mt-1 !normal-case">{f.privateNote.tag}</p>
                <p className="mt-2 whitespace-pre-line break-words text-[15px] text-text">{existing.private_note || "·"}</p>
              </div>
            </div>
          ) : (
            <>
              <fieldset className="grid gap-8">
                <legend className="mono rule-b w-full pb-3 !text-xs !font-normal !tracking-[0.08em]">{f.scoresTitle}</legend>
                <p className="t-small -mt-2 text-muted">{f.scoresLead}</p>
                {CRITERIA.map((k) => (
                  <ScoreInput key={k.key} name={`score-${k.key}`} label={k.label} hint={k.hint} value={values.scores[k.key]} onChange={(n) => setScore(k.key, n)} error={errors[`score-${k.key}`]} />
                ))}
                <ScoreInput name="overall" label={f.overall} hint={f.overallLead} value={values.overall} onChange={(n) => set("overall", n)} error={errors.overall} />
              </fieldset>

              <OptSelect label={f.recommendation.label} name="recommendation" options={RECOMMENDATIONS} value={values.recommendation} onChange={(x) => set("recommendation", x)} error={errors.recommendation} placeholder={f.recommendation.choose} />

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
                <p className="mono !text-text">{f.privateNote.tag}</p>
                <div className="mt-4">
                  <TextareaField label={f.privateNote.label} name="private_note" rows={3} value={values.private_note} onChange={(e) => set("private_note", e.target.value)} error={errors.private_note} aria-describedby="private-hint" />
                </div>
                <p id="private-hint" className="t-small mt-6 text-dim">
                  {f.privateNote.hint} <span className="mono !normal-case">{f.count(values.private_note.length)}</span>
                </p>
              </div>
              <div>
                <Check name="show_company_name" checked={values.show_company_name} onChange={(e) => set("show_company_name", e.target.checked)} label={f.showCompany} />
                <p className="t-small ms-7 text-dim">{f.showCompanyHint}</p>
              </div>
            </>
          )}
        </form>
      </div>

      <aside className="col-span-12 self-start lg:col-span-5 lg:row-span-2 lg:row-start-1 lg:sticky lg:top-24" aria-label={f.previewTitle} data-testid="evaluation-preview-panel">
        <p className="mono">{f.previewTitle}</p>
        <p className="t-small mt-1 text-dim">{f.previewLead}</p>
        <StudentEvaluationCard ev={preview} preview className="mt-4" />
      </aside>

      <div className="col-span-12 grid gap-5 lg:col-span-7 lg:row-start-2">
        {phase === "done" && saved && (
          <div className="grid gap-4" data-testid="evaluation-sent">
            <Notice tone="ok">{saved === "created" ? f.success : f.savedEdit}</Notice>
            <p className="flex flex-wrap gap-x-6 gap-y-2 text-[15px]">
              <Link prefetch={false} href="/account/#talent" className="ul-draw pb-0.5 font-medium text-text hover:text-accent-text">
                {f.another}
              </Link>
              <Link prefetch={false} href="/account/#evaluations" className="ul-draw pb-0.5 font-medium text-text hover:text-accent-text">
                {f.seeMine}
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
          <div className="flex items-center gap-6">
            <Button type="submit" form="evaluation-form" disabled={phase === "sending"} className="sm:min-w-[220px]" data-testid="submit-evaluation">
              {phase === "sending" ? (existing ? f.saving : f.sending) : existing ? f.save : f.submit}
            </Button>
            <LiveStatus>{phase === "sending" ? (existing ? f.saving : f.sending) : ""}</LiveStatus>
          </div>
        )}
      </div>
    </div>
  );
}
