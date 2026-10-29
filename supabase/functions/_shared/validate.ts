// Small hand-written validators for the request bodies. They mirror the shapes the browser sends
// (lib/db.ts types) without pulling Zod into the functions.

export const STATUSES = ["draft", "submitted", "under_review", "interview", "accepted", "enrolled", "waitlist", "rejected"] as const;
export type Status = (typeof STATUSES)[number];
export const EMAILABLE_STATUSES: Status[] = ["submitted", "under_review", "interview", "accepted", "enrolled", "waitlist", "rejected"];

export const LEAD_TABLES = ["leads", "contact_messages"] as const;
export type LeadTable = (typeof LEAD_TABLES)[number];

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export const isUuid = (v: unknown): v is string => typeof v === "string" && UUID.test(v);
export const isEmail = (v: unknown): v is string => typeof v === "string" && v.length <= 200 && EMAIL.test(v);
export const isStatus = (v: unknown): v is Status => typeof v === "string" && (STATUSES as readonly string[]).includes(v);
export const isLeadTable = (v: unknown): v is LeadTable => typeof v === "string" && (LEAD_TABLES as readonly string[]).includes(v);

export type Validation<T> = { ok: true; value: T } | { ok: false; error: string };

// Reads the body as text first so the size can be checked before parsing.
export async function readJson(req: Request, maxBytes = 2048): Promise<Validation<Record<string, unknown>>> {
  let text = "";
  try {
    text = await req.text();
  } catch {
    return { ok: false, error: "unreadable body" };
  }
  if (new TextEncoder().encode(text).length > maxBytes) return { ok: false, error: "body too large" };
  try {
    const parsed = JSON.parse(text || "{}");
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return { ok: false, error: "body must be an object" };
    return { ok: true, value: parsed as Record<string, unknown> };
  } catch {
    return { ok: false, error: "invalid json" };
  }
}

export function validateSubmittedBody(b: Record<string, unknown>): Validation<{ application_id: string }> {
  if (!isUuid(b.application_id)) return { ok: false, error: "application_id must be a uuid" };
  return { ok: true, value: { application_id: b.application_id } };
}

export function validateStatusBody(b: Record<string, unknown>): Validation<{ application_id: string; to_status: Status }> {
  if (!isUuid(b.application_id)) return { ok: false, error: "application_id must be a uuid" };
  if (!isStatus(b.to_status)) return { ok: false, error: "to_status is not a known status" };
  if (!EMAILABLE_STATUSES.includes(b.to_status)) return { ok: false, error: "no email is sent for that status" };
  return { ok: true, value: { application_id: b.application_id, to_status: b.to_status } };
}

export function validateLeadBody(b: Record<string, unknown>): Validation<{ table: LeadTable; id: string }> {
  if (!isLeadTable(b.table)) return { ok: false, error: "table must be leads or contact_messages" };
  if (!isUuid(b.id)) return { ok: false, error: "id must be a uuid" };
  return { ok: true, value: { table: b.table, id: b.id } };
}

export const VERIFY_DECISIONS = ["approved", "rejected"] as const;
export type VerifyDecision = (typeof VERIFY_DECISIONS)[number];
export const isVerifyDecision = (v: unknown): v is VerifyDecision => typeof v === "string" && (VERIFY_DECISIONS as readonly string[]).includes(v);

export function validateRecruiterVerifiedBody(b: Record<string, unknown>): Validation<{ recruiter_id: string; status: VerifyDecision }> {
  if (!isUuid(b.recruiter_id)) return { ok: false, error: "recruiter_id must be a uuid" };
  if (!isVerifyDecision(b.status)) return { ok: false, error: "status must be approved or rejected" };
  return { ok: true, value: { recruiter_id: b.recruiter_id, status: b.status } };
}

export function validateEvaluationBody(b: Record<string, unknown>): Validation<{ evaluation_id: string }> {
  if (!isUuid(b.evaluation_id)) return { ok: false, error: "evaluation_id must be a uuid" };
  return { ok: true, value: { evaluation_id: b.evaluation_id } };
}

// Text helpers used when building emails from database rows.
export const str = (v: unknown): string => (Array.isArray(v) ? v.map(String).join(", ") : v === null || v === undefined ? "" : String(v));
export const firstName = (full: unknown): string => str(full).trim().split(/\s+/)[0] || "there";

// Program slugs ("revit-mep") become readable names ("Revit MEP"); titles pass through untouched.
const ACRONYMS: Record<string, string> = { bim: "BIM", vdc: "VDC", mep: "MEP", "4d": "4D", "5d": "5D", acc: "ACC", cad: "CAD" };
export function programName(slug: unknown): string {
  const s = str(slug).trim();
  if (!/^[a-z0-9-]+$/.test(s)) return s;
  return s
    .split("-")
    .filter(Boolean)
    .map((w) => ACRONYMS[w] ?? (w === "with" || w === "and" || w === "for" ? w : w[0].toUpperCase() + w.slice(1)))
    .join(" ");
}

export const programNames = (programs: unknown): string[] => (Array.isArray(programs) ? programs.map(programName).filter(Boolean) : []);
