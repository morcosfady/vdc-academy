import { z } from "./zod";
import type { CriterionKey, EvaluationContext, Recommendation, StudentEvaluation } from "./db";
import type { Opt } from "./signupSchema";
import { evaluations } from "@/content/copy-evaluations";

// A recruiter's evaluation of a student (/account/evaluate/). Mirrors public.student_evaluations in
// supabase/migrations/0007_evaluations.sql: six criteria scored 1 to 5 with stable keys, an overall 1 to 5, a
// recommendation, strengths, improvements and a private note up to 1000 characters each, no HTML tags, one evaluation
// per student, recruiter and context. The database sets recruiter_id and status ("submitted").

const e = evaluations.form.errors;

export const TEXT_MAX = 1000;
export const TEXT_MIN = 10;
export const DAILY_LIMIT = 20;

// Keys are stored in the database (jsonb) and never change; labels and hints are copy.
export const CRITERIA: { key: CriterionKey; label: string; hint: string }[] = [
  { key: "modeling", label: "Modeling accuracy", hint: "Correct, complete and well built models" },
  { key: "coordination", label: "Coordination and clash handling", hint: "Finds and resolves clashes across disciplines" },
  { key: "standards", label: "Standards and naming", hint: "Follows BIM standards, naming and organisation" },
  { key: "communication", label: "Communication", hint: "Explains work clearly and asks good questions" },
  { key: "professionalism", label: "Professionalism", hint: "Reliable, on time and open to feedback" },
  { key: "portfolio", label: "Portfolio quality", hint: "Work that shows real projects and care" },
];

export const SCORE_WORDS = ["", "Far below", "Below", "Meets", "Above", "Well above"] as const;

export const RECOMMENDATIONS: Opt[] = [
  { value: "strong_yes", label: "Strong yes" },
  { value: "yes", label: "Yes" },
  { value: "maybe", label: "Maybe" },
  { value: "not_now", label: "Not now" },
];

export const CONTEXTS: Opt[] = [
  { value: "portfolio_review", label: "Portfolio review" },
  { value: "interview", label: "Interview" },
  { value: "project_review", label: "Project review" },
  { value: "worked_together", label: "Worked together" },
];

export const recommendationLabel = (v: string | null | undefined) => RECOMMENDATIONS.find((x) => x.value === v)?.label ?? v ?? "";
export const contextLabel = (v: string | null | undefined) => CONTEXTS.find((x) => x.value === v)?.label ?? v ?? "";
export const criterionLabel = (k: string) => CRITERIA.find((c) => c.key === k)?.label ?? k;

const keys = (o: Opt[]) => o.map((x) => x.value) as [string, ...string[]];
const NO_HTML = /<\s*\/?\s*[a-zA-Z!]/;

const score = z.number({ error: e.score }).int(e.score).min(1, e.score).max(5, e.score);
const text = (min: number, short: string) =>
  z
    .string()
    .trim()
    .min(min, short)
    .max(TEXT_MAX, e.long)
    .refine((v) => !NO_HTML.test(v), e.html);

export const evaluationSchema = z.object({
  context: z.enum(keys(CONTEXTS), { error: e.context }),
  scores: z.object({ modeling: score, coordination: score, standards: score, communication: score, professionalism: score, portfolio: score }),
  overall: z.number({ error: e.overall }).int(e.overall).min(1, e.overall).max(5, e.overall),
  recommendation: z.enum(keys(RECOMMENDATIONS), { error: e.recommendation }),
  strengths: text(TEXT_MIN, e.strengths),
  improvements: text(TEXT_MIN, e.improvements),
  private_note: z.string().trim().max(TEXT_MAX, e.long).refine((v) => !NO_HTML.test(v), e.html),
  show_company_name: z.boolean(),
});

// The form state: a score of 0 means "not chosen yet".
export type EvaluationValues = {
  context: string;
  scores: Record<CriterionKey, number>;
  overall: number;
  recommendation: string;
  strengths: string;
  improvements: string;
  private_note: string;
  show_company_name: boolean;
};

export const emptyScores = (): Record<CriterionKey, number> => ({ modeling: 0, coordination: 0, standards: 0, communication: 0, professionalism: 0, portfolio: 0 });
export const emptyEvaluation = (): EvaluationValues => ({ context: "", scores: emptyScores(), overall: 0, recommendation: "", strengths: "", improvements: "", private_note: "", show_company_name: true });

export const valuesFromRow = (r: StudentEvaluation): EvaluationValues => ({
  context: r.context,
  scores: { ...emptyScores(), ...r.scores },
  overall: r.overall,
  recommendation: r.recommendation,
  strengths: r.strengths,
  improvements: r.improvements,
  private_note: r.private_note,
  show_company_name: r.show_company_name,
});

// Error keys for the summary and for focusing: "scores.modeling" becomes the field name "score-modeling".
export function evaluationErrors(v: EvaluationValues): Record<string, string> {
  const parsed = evaluationSchema.safeParse(v);
  if (parsed.success) return {};
  const out: Record<string, string> = {};
  for (const i of parsed.error.issues) {
    const k = i.path[0] === "scores" ? `score-${String(i.path[1])}` : String(i.path[0]);
    out[k] ??= i.message;
  }
  return out;
}

// The row the browser inserts. recruiter_id is the signed-in user and status is "submitted"; the database enforces both.
export function evaluationRow(d: z.infer<typeof evaluationSchema>, studentId: string, recruiterId: string) {
  return {
    student_id: studentId,
    recruiter_id: recruiterId,
    context: d.context as EvaluationContext,
    scores: d.scores,
    overall: d.overall,
    recommendation: d.recommendation as Recommendation,
    strengths: d.strengths,
    improvements: d.improvements,
    private_note: d.private_note,
    show_company_name: d.show_company_name,
  };
}

// Average of the six scores for a list of published evaluations (one decimal), for the student's card.
export function averageScores(list: { scores: Record<string, number>; overall: number }[]) {
  if (!list.length) return { overall: 0, byCriterion: {} as Record<CriterionKey, number> };
  const byCriterion = Object.fromEntries(CRITERIA.map((c) => [c.key, list.reduce((s, x) => s + (x.scores[c.key] ?? 0), 0) / list.length])) as Record<CriterionKey, number>;
  return { overall: list.reduce((s, x) => s + x.overall, 0) / list.length, byCriterion };
}
