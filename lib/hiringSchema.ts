import { z } from "./zod";
import { HIRING_ROLES, type Opt } from "./signupSchema";
import { workModeLabel, type HiringRequest, type WorkMode } from "./db";
import { account } from "@/content/copy-account";

// A recruiter's hiring request (/account/#hiring). Mirrors the checks on public.hiring_requests in
// supabase/migrations/0005_roles_registration.sql: role from HIRING_ROLES, 1 to 500 hires, a location of 2 to 160
// characters, a work mode, a start date, notes up to 2000 characters. The database sets recruiter_id and status.

const e = account.hiring.errors;

export const HIRES_MIN = 1;
export const HIRES_MAX = 500;
export const NOTES_MAX = 2000;

export const WORK_MODES: Opt[] = (Object.keys(workModeLabel) as WorkMode[]).map((value) => ({ value, label: workModeLabel[value] }));

// Today in the visitor's time zone, as YYYY-MM-DD (what a date input holds).
export function todayIso(d = new Date()) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

const keys = (o: Opt[]) => o.map((x) => x.value) as [string, ...string[]];

export const hiringSchema = z.object({
  role: z.enum(keys(HIRING_ROLES), { error: e.role }),
  hires: z
    .string({ error: e.hires })
    .trim()
    .regex(/^\d{1,3}$/, e.hires)
    .refine((v) => Number(v) >= HIRES_MIN && Number(v) <= HIRES_MAX, e.hires),
  location: z.string({ error: e.location }).trim().min(2, e.location).max(160, e.location),
  work_mode: z.enum(keys(WORK_MODES), { error: e.work_mode }),
  start_date: z
    .string({ error: e.start_date })
    .regex(/^\d{4}-\d{2}-\d{2}$/, e.start_date)
    .refine((v) => v >= todayIso(), e.past),
  notes: z.string().trim().max(NOTES_MAX, e.notes),
});

export type HiringValues = { role: string; hires: string; location: string; work_mode: string; start_date: string; notes: string };
export const emptyHiring: HiringValues = { role: "", hires: "", location: "", work_mode: "", start_date: "", notes: "" };

// The row the browser inserts. recruiter_id is the signed-in user (the database overwrites it anyway).
export function hiringRow(d: z.infer<typeof hiringSchema>, recruiterId: string): Pick<HiringRequest, "recruiter_id" | "role" | "hires" | "location" | "work_mode" | "start_date" | "notes"> {
  return { recruiter_id: recruiterId, role: d.role, hires: Number(d.hires), location: d.location, work_mode: d.work_mode as WorkMode, start_date: d.start_date, notes: d.notes };
}
