import { z } from "zod";
import type { CurrentStatus, Profile } from "./db";

export const SKILLS = ["Revit", "AutoCAD", "Navisworks", "Dynamo", "ACC / BIM 360", "Bluebeam"] as const;
export const LEVELS = ["None", "Beginner", "Intermediate", "Advanced"] as const;

export const options = {
  language: ["English", "Arabic", "Other"],
  ageRange: ["Under 22", "22 to 25", "26 to 30", "31 to 40", "Over 40"],
  status: ["Fresh graduate", "Current student", "Working professional", "Career changer", "Other"],
  degree: ["Architecture", "Civil engineering", "Mechanical engineering", "Electrical engineering", "Construction management", "Other engineering", "Non-engineering"],
  experience: ["None", "Less than 1 year", "1 to 3 years", "3 to 5 years", "5+ years"],
  goal: ["BIM Modeler", "BIM Coordinator", "VDC Engineer", "BIM Manager", "Other"],
  format: ["Online live", "In-person (Fort Worth, TX)", "Hybrid"],
  schedule: ["Weekdays", "Evenings", "Weekends"],
  start: ["Next cohort", "Later"],
  laptop: ["Yes", "No", "Not sure"],
  source: ["LinkedIn", "Google", "Friend", "University", "Bay BIM Designs", "Other"],
};

const req = (m: string) => z.string().trim().min(1, m);
const url = z.string().trim().refine((v) => v === "" || /^https?:\/\/.+\..+/.test(v), "Please enter a full link starting with https://").optional();

export const step1 = z.object({
  fullName: req("Please enter your full name.").min(2, "Please enter your full name."),
  email: z.string().trim().email("Please enter a valid email address."),
  phone: z.string().trim().min(7, "Please enter your phone number with country code."),
  whatsappSame: z.boolean(),
  whatsapp: z.string().trim().optional(),
  country: req("Please enter your country."),
  city: req("Please enter your city."),
  ageRange: z.string().optional(),
  language: req("Please choose a language."),
});

export const step2 = z.object({
  currentStatus: req("Please choose your status."),
  degree: req("Please choose your degree."),
  university: req("Please enter your university."),
  gradYear: z.string().regex(/^\d{4}$/, "Please choose your graduation year."),
  gpa: z.string().trim().optional(),
});

export const step3 = z.object({
  experience: req("Please choose your experience."),
  jobTitle: z.string().trim().optional(),
  company: z.string().trim().optional(),
  skills: z.record(z.string(), z.string()),
  goal: req("Please choose a career goal."),
  linkedin: url,
  portfolio: url,
});

export const step4 = z.object({
  programs: z.array(z.string()).min(1, "Please choose at least one program."),
  format: req("Please choose a format."),
  schedule: req("Please choose a schedule."),
  start: req("Please choose when you want to start."),
  laptop: req("Please tell us about your laptop."),
  source: z.string().optional(),
});

export const step5 = z.object({
  consentPrivacy: z.literal(true, { message: "Please agree to the Privacy Policy and Terms." }),
  consentContact: z.literal(true, { message: "Please agree to be contacted about your application." }),
  newsletter: z.boolean(),
});

export const fullSchema = step1.and(step2).and(step3).and(step4).and(step5);
export type ApplyValues = z.infer<typeof fullSchema>;

export const stepSchemas = [step1, step2, step3, step4, step5] as const;

export const stepFields: (keyof ApplyValues)[][] = [
  ["fullName", "email", "phone", "whatsapp", "country", "city", "ageRange", "language"],
  ["currentStatus", "degree", "university", "gradYear", "gpa"],
  ["experience", "jobTitle", "company", "skills", "goal", "linkedin", "portfolio"],
  ["programs", "format", "schedule", "start", "laptop", "source"],
  ["consentPrivacy", "consentContact", "newsletter"],
];

export const defaultValues: ApplyValues = {
  fullName: "", email: "", phone: "", whatsappSame: true, whatsapp: "", country: "", city: "", ageRange: "", language: "English",
  currentStatus: "", degree: "", university: "", gradYear: "", gpa: "",
  experience: "", jobTitle: "", company: "", skills: Object.fromEntries(SKILLS.map((s) => [s, "None"])), goal: "", linkedin: "", portfolio: "",
  programs: [], format: "", schedule: "", start: "", laptop: "", source: "",
  consentPrivacy: false as unknown as true, consentContact: false as unknown as true, newsletter: false,
};

// Fresh graduate = graduated within the last 24 months (graduation taken as end of June).
export function isFreshGrad(gradYear: string, now = new Date()) {
  if (!/^\d{4}$/.test(gradYear)) return false;
  const months = (now.getFullYear() - Number(gradYear)) * 12 + (now.getMonth() - 5);
  return months <= 24 && months >= -12;
}

// Documents go to the private `documents` bucket, which accepts PDF, JPG and PNG up to 5 MB (proof and CV alike).
export const MAX_FILE = 5 * 1024 * 1024;
export const PROOF_TYPES = ["application/pdf", "image/jpeg", "image/png"];
export const CV_TYPES = PROOF_TYPES;
export const FILE_EXT: Record<string, string> = { "application/pdf": "pdf", "image/jpeg": "jpg", "image/png": "png" };

// ---- Account mapping. The form keeps its labels; profiles.current_status is an enum checked by the database.
export const STATUS_ENUM: Record<string, CurrentStatus> = {
  "Fresh graduate": "fresh_grad",
  "Current student": "student",
  "Working professional": "professional",
  "Career changer": "career_changer",
  Other: "other",
};
export const statusToEnum = (label: string | null | undefined): CurrentStatus | null => (label ? STATUS_ENUM[label] ?? null : null);
export const enumToStatus = (e: string | null | undefined): string => Object.entries(STATUS_ENUM).find(([, v]) => v === e)?.[0] ?? "";

const str = (x: unknown) => (typeof x === "string" ? x : "");

// Steps 1 and 2 prefilled from the profile (and the account email). Empty profile fields leave the form untouched.
export function valuesFromProfile(p: Profile | null | undefined, email?: string | null): Partial<ApplyValues> {
  const out: Partial<ApplyValues> = {};
  if (email) out.email = email;
  if (!p) return out;
  if (p.full_name) out.fullName = p.full_name;
  if (p.phone) out.phone = p.phone;
  if (p.whatsapp && p.whatsapp !== p.phone) {
    out.whatsapp = p.whatsapp;
    out.whatsappSame = false;
  }
  if (p.country) out.country = p.country;
  if (p.city) out.city = p.city;
  if (p.age_range) out.ageRange = p.age_range;
  if (p.language) out.language = p.language;
  if (p.current_status) out.currentStatus = enumToStatus(p.current_status);
  if (p.degree) out.degree = p.degree;
  if (p.university) out.university = p.university;
  if (p.graduation_year) out.gradYear = String(p.graduation_year);
  if (p.linkedin_url) out.linkedin = p.linkedin_url;
  if (p.portfolio_url) out.portfolio = p.portfolio_url;
  return out;
}

// What the apply form writes back to profiles: only filled fields, never `role`, never the email (auth owns it).
export function profilePatch(v: Partial<ApplyValues>): Partial<Profile> {
  const out: Partial<Profile> = {};
  const put = <K extends keyof Profile>(k: K, val: Profile[K] | "" | undefined) => {
    if (val !== "" && val !== undefined && val !== null) out[k] = val;
  };
  put("full_name", v.fullName?.trim());
  put("phone", v.phone?.trim());
  put("whatsapp", v.whatsappSame ? v.phone?.trim() : v.whatsapp?.trim());
  put("country", v.country?.trim());
  put("city", v.city?.trim());
  put("age_range", v.ageRange);
  put("language", v.language);
  put("current_status", statusToEnum(v.currentStatus) ?? undefined);
  put("degree", v.degree);
  put("university", v.university?.trim());
  put("graduation_year", /^\d{4}$/.test(v.gradYear ?? "") ? Number(v.gradYear) : undefined);
  put("linkedin_url", v.linkedin?.trim());
  put("portfolio_url", v.portfolio?.trim());
  return out;
}

export type ApplicationRow = Record<string, unknown>;

// Form values to an applications row (draft or submitted). Empty strings become null so drafts stay clean.
export function rowFromValues(v: Partial<ApplyValues>): ApplicationRow {
  const n = (x: string | undefined) => (x && x.trim() ? x.trim() : null);
  return {
    full_name: n(v.fullName),
    email: n(v.email),
    phone: n(v.phone),
    whatsapp: v.whatsappSame === false ? n(v.whatsapp) : n(v.phone),
    country: n(v.country),
    city: n(v.city),
    dob_or_age: n(v.ageRange),
    language: n(v.language),
    current_status: n(v.currentStatus),
    degree: n(v.degree),
    university: n(v.university),
    graduation_year: /^\d{4}$/.test(v.gradYear ?? "") ? Number(v.gradYear) : null,
    gpa: n(v.gpa),
    experience_years: n(v.experience),
    job_title: n(v.jobTitle),
    company: n(v.company),
    software_skills: v.skills ?? null,
    career_goal: n(v.goal),
    linkedin_url: n(v.linkedin),
    portfolio_url: n(v.portfolio),
    programs: v.programs ?? [],
    format: n(v.format),
    schedule: n(v.schedule),
    start_pref: n(v.start),
    has_laptop: n(v.laptop),
    source: n(v.source),
    newsletter: Boolean(v.newsletter),
  };
}

// A saved row back into form values (resuming a draft from the dashboard or after a reload).
export function valuesFromRow(r: ApplicationRow): Partial<ApplyValues> {
  const out: Partial<ApplyValues> = {};
  const take = (k: keyof ApplyValues, val: unknown) => {
    if (val !== null && val !== undefined && val !== "") (out as Record<string, unknown>)[k] = val;
  };
  take("fullName", str(r.full_name));
  take("email", str(r.email));
  take("phone", str(r.phone));
  if (str(r.whatsapp) && r.whatsapp !== r.phone) {
    out.whatsapp = str(r.whatsapp);
    out.whatsappSame = false;
  }
  take("country", str(r.country));
  take("city", str(r.city));
  take("ageRange", str(r.dob_or_age));
  take("language", str(r.language));
  take("currentStatus", str(r.current_status));
  take("degree", str(r.degree));
  take("university", str(r.university));
  take("gradYear", typeof r.graduation_year === "number" ? String(r.graduation_year) : "");
  take("gpa", str(r.gpa));
  take("experience", str(r.experience_years));
  take("jobTitle", str(r.job_title));
  take("company", str(r.company));
  if (r.software_skills && typeof r.software_skills === "object" && !Array.isArray(r.software_skills)) {
    out.skills = { ...defaultValues.skills, ...(r.software_skills as Record<string, string>) };
  }
  take("goal", str(r.career_goal));
  take("linkedin", str(r.linkedin_url));
  take("portfolio", str(r.portfolio_url));
  if (Array.isArray(r.programs) && r.programs.length) out.programs = r.programs.filter((p): p is string => typeof p === "string");
  take("format", str(r.format));
  take("schedule", str(r.schedule));
  take("start", str(r.start_pref));
  take("laptop", str(r.has_laptop));
  take("source", str(r.source));
  if (typeof r.newsletter === "boolean") out.newsletter = r.newsletter;
  return out;
}

// Which step a saved draft reaches, from what it already holds (the local draft remembers the exact step).
export function inferStep(r: ApplicationRow) {
  if (Array.isArray(r.programs) && r.programs.length && r.format) return 4;
  if (r.experience_years && r.career_goal) return 3;
  if (r.degree && r.university) return 2;
  if (r.full_name && r.phone && r.country) return 1;
  return 0;
}
