// Types and labels for the account tables (supabase/migrations/0003_accounts.sql). Keep in step with the SQL.

import type { AccountType, Role } from "./roles";
export type { AccountType, Role };
export type CurrentStatus = "fresh_grad" | "student" | "professional" | "career_changer" | "other";
export type ApplicationStatus = "draft" | "submitted" | "under_review" | "interview" | "accepted" | "enrolled" | "waitlist" | "rejected";
export type DiscountStatus = "none" | "pending" | "verified" | "rejected";

export type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  whatsapp: string | null;
  country: string | null;
  city: string | null;
  age_range: string | null;
  language: string | null;
  current_status: CurrentStatus | null;
  degree: string | null;
  university: string | null;
  graduation_year: number | null;
  linkedin_url: string | null;
  portfolio_url: string | null;
  avatar_path: string | null;
  role: Role;
  marketing_opt_in: boolean;
  created_at: string;
  updated_at: string;
  // v9 registration (supabase/migrations/0005_roles_registration.sql)
  account_type: AccountType | null;
  onboarding_complete: boolean;
  date_of_birth: string | null;
  degree_field: string | null;
  degree_level: string | null;
  experience_years: string | null;
  revit_level: string | null;
  career_goal: string | null;
  preferred_format: string | null;
  heard_from: string | null;
  consent_terms_at: string | null;
  consent_contact_at: string | null;
};

export type VerificationStatus = "pending" | "approved" | "rejected";

// One row per recruiter (1:1 with profiles). The verification columns are written by admins only.
export type RecruiterProfile = {
  id: string;
  job_title: string | null;
  company_name: string | null;
  company_website: string | null;
  company_type: string | null;
  company_size: string | null;
  linkedin_url: string | null;
  hiring_roles: string[];
  expected_hires: string | null;
  authorised_confirmed: boolean;
  verification_status: VerificationStatus;
  verified_by: string | null;
  verified_at: string | null;
  rejection_note: string | null;
  created_at: string;
  updated_at: string;
};

export type HiringStatus = "new" | "in_review" | "matched" | "closed";
export type WorkMode = "on_site" | "hybrid" | "remote";

export type HiringRequest = {
  id: string;
  recruiter_id: string;
  role: string;
  hires: number;
  location: string;
  work_mode: WorkMode;
  start_date: string;
  notes: string | null;
  status: HiringStatus;
  created_at: string;
  updated_at: string;
};

export const verificationLabel: Record<VerificationStatus, string> = { pending: "Pending review", approved: "Approved", rejected: "Not approved" };
export const hiringStatusLabel: Record<HiringStatus, string> = { new: "New", in_review: "In review", matched: "Matched", closed: "Closed" };
export const workModeLabel: Record<WorkMode, string> = { on_site: "On site", hybrid: "Hybrid", remote: "Remote" };

export type Application = {
  id: string;
  user_id: string;
  status: ApplicationStatus;
  created_at: string;
  updated_at: string;
  submitted_at: string | null;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  country: string | null;
  city: string | null;
  dob_or_age: string | null;
  language: string | null;
  current_status: string | null;
  degree: string | null;
  university: string | null;
  graduation_year: number | null;
  gpa: string | null;
  experience_years: string | null;
  job_title: string | null;
  company: string | null;
  software_skills: Record<string, string> | string[] | null; // { tool: level } from the apply form
  career_goal: string | null;
  linkedin_url: string | null;
  portfolio_url: string | null;
  programs: string[];
  format: string | null;
  schedule: string | null;
  start_pref: string | null;
  has_laptop: string | null;
  source: string | null;
  discount_type: string | null;
  discount_percent: number | null;
  discount_status: DiscountStatus;
  discount_verified: boolean;
  proof_file_path: string | null;
  cv_file_path: string | null;
  consent_privacy: boolean;
  consent_contact: boolean;
  newsletter: boolean;
  notes: string | null;
  utm: Record<string, string> | null;
};

export type ApplicationEvent = {
  id: string;
  application_id: string;
  actor_id: string | null;
  type: "status_change" | "note" | "document" | "message";
  from_status: ApplicationStatus | null;
  to_status: ApplicationStatus | null;
  note: string | null;
  visible_to_student: boolean;
  created_at: string;
};

export type Lead = { id: string; created_at: string; name: string; email: string; topic: string | null; handled: boolean };
export type ContactMessage = { id: string; created_at: string; name: string; email: string; message: string; handled: boolean };

// The pipeline as the student sees it (construction-schedule order). Waitlist and rejected sit outside it.
export const PIPELINE: ApplicationStatus[] = ["submitted", "under_review", "interview", "accepted", "enrolled"];

export const statusLabel: Record<ApplicationStatus, string> = {
  draft: "Draft",
  submitted: "Submitted",
  under_review: "Under review",
  interview: "Interview",
  accepted: "Accepted",
  enrolled: "Enrolled",
  waitlist: "Waitlist",
  rejected: "Not this time",
};

export const discountStatusLabel: Record<DiscountStatus, string> = {
  none: "No discount",
  pending: "Pending check",
  verified: "Verified",
  rejected: "Not approved",
};

export const currentStatusLabel: Record<CurrentStatus, string> = {
  fresh_grad: "Fresh graduate",
  student: "Student",
  professional: "Professional",
  career_changer: "Career changer",
  other: "Other",
};

// Profile completeness: the fields the apply form prefills from, equally weighted.
const COMPLETENESS_FIELDS: (keyof Profile)[] = ["full_name", "phone", "country", "city", "current_status", "degree", "university", "graduation_year", "linkedin_url", "avatar_path"];
export function profileCompleteness(p: Profile | null): { percent: number; missing: (keyof Profile)[] } {
  if (!p) return { percent: 0, missing: COMPLETENESS_FIELDS };
  const missing = COMPLETENESS_FIELDS.filter((k) => p[k] === null || p[k] === "" || p[k] === undefined);
  return { percent: Math.round(((COMPLETENESS_FIELDS.length - missing.length) / COMPLETENESS_FIELDS.length) * 100), missing };
}

// Graduation within the last 24 months (June of the graduation year) counts as a fresh graduate.
export function isFreshGrad(year: number | null | undefined, months = 24) {
  if (!year) return false;
  const now = new Date();
  const since = (now.getFullYear() - year) * 12 + (now.getMonth() - 5);
  return since <= months && since >= -12;
}

export const firstName = (full: string | null | undefined) => (full ?? "").trim().split(/\s+/)[0] || "";
export const initials = (full: string | null | undefined, email?: string | null) => {
  const n = (full ?? "").trim();
  if (n) return n.split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");
  return (email ?? "?")[0].toUpperCase();
};
