import { z } from "./zod";
import type { CriterionKey, InstructorContext, InstructorEvaluation, Readiness } from "./db";
import type { Opt } from "./signupSchema";
import { CRITERIA, SCORE_WORDS, TEXT_MAX, TEXT_MIN, emptyScores } from "./evaluationSchema";
import { evaluations } from "@/content/copy-evaluations";

// An instructor's evaluation of a student they teach. Mirrors public.instructor_evaluations in
// supabase/migrations/0009_instructor_evaluations.sql: the same six criteria scored 1 to 5 as the recruiter form, an overall
// 1 to 5, a readiness, strengths, improvements and a private note up to 1000 characters each, no HTML tags, one evaluation
// per student, instructor and context. The database sets instructor_id and status ("submitted") and only accepts a student
// assigned to the instructor. Change one, change the migration and the mock (lib/demo/engine.ts).

export { CRITERIA, SCORE_WORDS, TEXT_MAX, TEXT_MIN };
export const INSTRUCTOR_DAILY_LIMIT = 30;

const e = evaluations.form.errors;

export const INSTRUCTOR_CONTEXTS: Opt[] = [
  { value: "mid_course", label: "Mid course" },
  { value: "end_of_course", label: "End of course" },
  { value: "project_review", label: "Project review" },
];

export const READINESS: Opt[] = [
  { value: "ready", label: "Ready for work" },
  { value: "almost_there", label: "Almost there" },
  { value: "needs_practice", label: "Needs more practice" },
];

export const instructorContextLabel = (v: string | null | undefined) => INSTRUCTOR_CONTEXTS.find((x) => x.value === v)?.label ?? v ?? "";
export const readinessLabel = (v: string | null | undefined) => READINESS.find((x) => x.value === v)?.label ?? v ?? "";

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

export const instructorEvaluationSchema = z.object({
  context: z.enum(keys(INSTRUCTOR_CONTEXTS), { error: e.context }),
  scores: z.object({ modeling: score, coordination: score, standards: score, communication: score, professionalism: score, portfolio: score }),
  overall: z.number({ error: e.overall }).int(e.overall).min(1, e.overall).max(5, e.overall),
  readiness: z.enum(keys(READINESS), { error: "Please choose how ready the student is." }),
  strengths: text(TEXT_MIN, e.strengths),
  improvements: text(TEXT_MIN, e.improvements),
  private_note: z.string().trim().max(TEXT_MAX, e.long).refine((v) => !NO_HTML.test(v), e.html),
});

// The form state: a score of 0 means "not chosen yet".
export type InstructorEvaluationValues = {
  context: string;
  scores: Record<CriterionKey, number>;
  overall: number;
  readiness: string;
  strengths: string;
  improvements: string;
  private_note: string;
};

export const emptyInstructorEvaluation = (): InstructorEvaluationValues => ({ context: "", scores: emptyScores(), overall: 0, readiness: "", strengths: "", improvements: "", private_note: "" });

export const instructorValuesFromRow = (r: InstructorEvaluation): InstructorEvaluationValues => ({
  context: r.context,
  scores: { ...emptyScores(), ...r.scores },
  overall: r.overall,
  readiness: r.readiness,
  strengths: r.strengths,
  improvements: r.improvements,
  private_note: r.private_note,
});

// Error keys for the summary and for focusing: "scores.modeling" becomes the field name "score-modeling".
export function instructorEvaluationErrors(v: InstructorEvaluationValues): Record<string, string> {
  const parsed = instructorEvaluationSchema.safeParse(v);
  if (parsed.success) return {};
  const out: Record<string, string> = {};
  for (const i of parsed.error.issues) {
    const k = i.path[0] === "scores" ? `score-${String(i.path[1])}` : String(i.path[0]);
    out[k] ??= i.message;
  }
  return out;
}

// The row the browser inserts. instructor_id is the signed-in user and status is "submitted"; the database enforces both.
export function instructorEvaluationRow(d: z.infer<typeof instructorEvaluationSchema>, studentId: string, instructorId: string, program: string | null) {
  return {
    student_id: studentId,
    instructor_id: instructorId,
    program,
    context: d.context as InstructorContext,
    scores: d.scores,
    overall: d.overall,
    readiness: d.readiness as Readiness,
    strengths: d.strengths,
    improvements: d.improvements,
    private_note: d.private_note,
  };
}
