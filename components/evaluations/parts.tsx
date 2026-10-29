"use client";

import { useId } from "react";
import { Tag } from "@/components/ds/Chips";
import { programs } from "@/content/programs";
import { evaluations } from "@/content/copy-evaluations";
import type { EvaluationView } from "@/lib/db";
import { CRITERIA, SCORE_WORDS, contextLabel, recommendationLabel } from "@/lib/evaluationSchema";
import { instructorContextLabel, readinessLabel } from "@/lib/instructorEvaluationSchema";
import { cn } from "@/lib/utils";
import { fmtDate } from "@/components/account/format";

const rule = { borderColor: "var(--rule)" } as const;

export const programTitle = (slug: string) => programs.find((p) => p.slug === slug)?.title ?? slug;

// "Sam Dawson" becomes "Sam D." (what a student sees of an instructor).
export function shortName(full: string | null | undefined) {
  const parts = (full ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  return parts.length === 1 ? parts[0] : `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`;
}

// One to five, as a segmented radio group. Real radios, so Tab reaches the group and the arrow keys change the score.
export function ScoreInput({ name, label, hint, value, onChange, error }: { name: string; label: string; hint?: string; value: number; onChange: (n: number) => void; error?: string }) {
  const id = useId();
  return (
    <fieldset aria-describedby={`${hint ? `${id}-h ` : ""}${error ? `${id}-e` : ""}`.trim() || undefined} aria-invalid={error ? true : undefined} className="relative min-w-0">
      <legend className="text-[15px] font-medium text-text">{label}</legend>
      {hint && (
        <p id={`${id}-h`} className="t-small mt-0.5 text-dim">
          {hint}
        </p>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <label key={n} className="relative cursor-pointer">
            <input type="radio" name={name} value={n} checked={value === n} onChange={() => onChange(n)} className="peer sr-only" />
            <span
              className={cn(
                "grid size-12 place-items-center rounded-[4px] border text-[1rem] font-medium tabular-nums text-text transition-colors duration-200",
                "peer-checked:border-transparent peer-checked:bg-cta peer-checked:text-cta-text peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[color:var(--accent)]",
                error && "border-err",
              )}
              style={error ? undefined : rule}
            >
              {n}
            </span>
          </label>
        ))}
        <span className="mono ms-2 min-w-[7ch]" aria-hidden>
          {value ? SCORE_WORDS[value] : ""}
        </span>
      </div>
      {error && (
        <p id={`${id}-e`} role="alert" className="mt-1.5 text-[13px] leading-5 text-err">
          {error}
        </p>
      )}
    </fieldset>
  );
}

// Thin blueprint lines, one per criterion. No new colours: a hairline track and a blueprint line to the score.
export function ScoreBars({ items, className }: { items: { key: string; label: string; value: number }[]; className?: string }) {
  return (
    <ul className={cn("grid gap-3", className)} data-testid="score-bars">
      {items.map((it) => (
        <li key={it.key} className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-x-4 gap-y-1.5" data-score={it.key}>
          <span className="text-[15px] text-text">{it.label}</span>
          <span className="mono !text-text tabular-nums">{Number.isInteger(it.value) ? it.value : it.value.toFixed(1)}</span>
          <span aria-hidden className="col-span-2 block h-px w-full" style={{ background: "var(--rule)" }}>
            <span className="block h-0.5 -translate-y-px bg-accent" style={{ width: `${Math.max(0, Math.min(5, it.value)) * 20}%` }} />
          </span>
        </li>
      ))}
    </ul>
  );
}

export const criteriaItems = (scores: Record<string, number>) => CRITERIA.map((c) => ({ key: c.key, label: c.label, value: scores[c.key] ?? 0 }));

// A published evaluation as the student reads it. Also the recruiter's preview, so both show the same thing.
// The private note has no place in this component: it is not even part of EvaluationView.
export function StudentEvaluationCard({ ev, className, preview = false }: { ev: EvaluationView; className?: string; preview?: boolean }) {
  const c = evaluations.student.card;
  const ic = evaluations.instructorEvals.studentCard;
  const byInstructor = ev.source === "instructor";
  const from = byInstructor ? ic.from : c.from;
  const who = byInstructor ? ev.author_name || ic.anInstructor : (ev.company_name ?? c.aVerifiedRecruiter);
  const basis = byInstructor ? instructorContextLabel(ev.context) : contextLabel(ev.context);
  const meta = [byInstructor && ev.program ? programTitle(ev.program) : "", basis, ev.published_at ? fmtDate(ev.published_at) : ""].filter(Boolean).join(" · ");
  return (
    <article
      className={cn("card min-w-0 max-w-full p-6 md:p-7", className)}
      data-testid={preview ? "evaluation-preview" : "evaluation-card"}
      data-source={byInstructor ? "instructor" : "recruiter"}
      aria-label={`${from} ${who}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <div className="min-w-0">
          <p className="mono">{from}</p>
          <h3 className="mt-1 break-words !text-[1.25rem]" data-testid="evaluation-from">
            {who}
          </h3>
        </div>
        <Tag tone="brass">
          <span data-testid="evaluation-verdict">{byInstructor ? readinessLabel(ev.readiness) : recommendationLabel(ev.recommendation)}</span>
        </Tag>
      </div>
      <p className="mono mt-3 !normal-case !tracking-normal">{meta}</p>
      <div className="mt-5 flex items-baseline gap-3 border-t pt-5" style={rule}>
        <p className="mono">{c.overall}</p>
        <p className="text-[1.5rem] font-semibold leading-none tabular-nums text-text">
          {ev.overall || "·"}
          <span className="text-[1rem] font-normal text-dim"> / 5</span>
        </p>
      </div>
      <ScoreBars items={criteriaItems(ev.scores)} className="mt-5" />
      {ev.strengths && (
        <div className="mt-6">
          <p className="mono">{c.strengths}</p>
          <p className="mt-1.5 whitespace-pre-line break-words text-[15px] leading-6 text-text">{ev.strengths}</p>
        </div>
      )}
      {ev.improvements && (
        <div className="mt-5">
          <p className="mono">{c.improvements}</p>
          <p className="mt-1.5 whitespace-pre-line break-words text-[15px] leading-6 text-text">{ev.improvements}</p>
        </div>
      )}
    </article>
  );
}
