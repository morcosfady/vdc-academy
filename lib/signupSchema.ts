import { z } from "./zod";

// Registration (/signup) and onboarding (/onboarding/): one schema per role, every field required. The same rules
// run in three places: the form (these schemas), the in-browser mock (profileComplete below, lib/demo/engine.ts)
// and the database (public.profile_complete() in supabase/migrations/0005_roles_registration.sql). Change one,
// change all three. Stored values are stable keys; the labels are what people see.

export type Opt = { value: string; label: string };
const opts = (pairs: [string, string][]): Opt[] => pairs.map(([value, label]) => ({ value, label }));
const values = (o: Opt[]) => o.map((x) => x.value) as [string, ...string[]];
export const labelOf = (o: Opt[], v: string | null | undefined) => o.find((x) => x.value === v)?.label ?? v ?? "";

export const ACCOUNT_TYPES = opts([["student", "Student"], ["instructor", "Instructor"], ["recruiter", "Recruiter"]]);
// The two choices the sign-up offers. "recruiter" still works (the code is kept) but is not offered since v11.
export const SIGNUP_TYPES = ["student", "instructor"] as const;

export const STUDENT_STATUS = opts([["fresh_grad", "Fresh graduate"], ["student", "Current student"], ["professional", "Working professional"], ["career_changer", "Career changer"]]);
export const DEGREE_FIELDS = opts([["architecture", "Architecture"], ["civil", "Civil engineering"], ["structural", "Structural engineering"], ["mechanical", "Mechanical engineering"], ["electrical", "Electrical engineering"], ["construction_management", "Construction management"], ["other_engineering", "Other engineering"], ["other", "Other"]]);
export const DEGREE_LEVELS = opts([["diploma", "Diploma"], ["bachelor", "Bachelor's"], ["master", "Master's"], ["phd", "PhD"]]);
export const EXPERIENCE = opts([["0", "No experience yet"], ["lt1", "Under 1 year"], ["1-3", "1 to 3 years"], ["3-5", "3 to 5 years"], ["5+", "5+ years"]]);
export const REVIT_LEVELS = opts([["none", "None"], ["beginner", "Beginner"], ["intermediate", "Intermediate"], ["advanced", "Advanced"]]);
export const CAREER_GOALS = opts([["bim_modeler", "BIM Modeler"], ["bim_coordinator", "BIM Coordinator"], ["vdc_engineer", "VDC Engineer"], ["bim_manager", "BIM Manager"], ["not_sure", "Not sure yet"]]);
export const FORMATS = opts([["online", "Online live"], ["in_person", "In person (Fort Worth)"], ["either", "Either"]]);
export const HEARD_FROM = opts([["linkedin", "LinkedIn"], ["google", "Google"], ["friend", "A friend or colleague"], ["university", "University"], ["bay_bim", "Bay BIM Designs"], ["event", "An event"], ["other", "Other"]]);

export const COMPANY_TYPES = opts([["ae_firm", "AE design firm"], ["general_contractor", "General contractor"], ["subcontractor", "Subcontractor (MEP, low voltage, etc.)"], ["owner_developer", "Owner / developer"], ["bim_consultancy", "BIM consultancy"], ["other", "Other"]]);
export const COMPANY_SIZES = opts([["1-10", "1 to 10"], ["11-50", "11 to 50"], ["51-200", "51 to 200"], ["201-1000", "201 to 1000"], ["1000+", "1000+"]]);
export const HIRING_ROLES = opts([["bim_modeler", "BIM Modeler"], ["bim_coordinator", "BIM Coordinator"], ["vdc_engineer", "VDC Engineer"], ["bim_manager", "BIM Manager"], ["revit_drafter", "Revit Drafter"], ["other", "Other"]]);
// Instructors: what they teach (the academy programs, stored by slug), how long, and when.
export const INSTRUCTOR_SUBJECTS = opts([
  ["vdc-professional-bootcamp", "VDC Professional Bootcamp"],
  ["bim-fundamentals-revit", "BIM Fundamentals with Revit"],
  ["revit-architecture", "Revit Architecture"],
  ["revit-structure", "Revit Structure"],
  ["revit-mep", "Revit MEP"],
  ["low-voltage-bim", "Low Voltage & Technology Systems BIM"],
  ["revit-family-creation", "Revit Family Creation"],
  ["navisworks-clash-detection", "Navisworks: Coordination & Clash Detection"],
  ["4d-5d-simulation", "4D/5D Construction Simulation"],
  ["dynamo-for-revit", "Dynamo for Revit (BIM Automation)"],
  ["bim-management-iso-19650", "BIM Management & ISO 19650 basics"],
]);
export const INDUSTRY_YEARS = opts([["3-5", "3 to 5 years"], ["5-10", "5 to 10 years"], ["10-15", "10 to 15 years"], ["15+", "15+ years"]]);
export const TEACHING_YEARS = opts([["none", "New to teaching"], ["lt2", "Under 2 years"], ["2-5", "2 to 5 years"], ["5+", "5+ years"]]);
export const AVAILABILITY = opts([["evenings", "Weekday evenings"], ["weekends", "Weekends"], ["daytime", "Weekday daytime"], ["flexible", "Flexible"]]);
export const BIO_MIN = 40;
export const BIO_MAX = 600;

export const EXPECTED_HIRES = opts([["1", "1"], ["2-5", "2 to 5"], ["6-10", "6 to 10"], ["10+", "10+"]]);

// Free email providers: a soft warning for recruiters ("Work email"), never a block.
export const FREE_EMAIL = ["gmail.com", "googlemail.com", "outlook.com", "hotmail.com", "live.com", "yahoo.com", "ymail.com", "icloud.com", "me.com", "aol.com", "proton.me", "protonmail.com", "gmx.com", "mail.com"];
export const isFreeEmail = (email: string) => FREE_EMAIL.includes(email.trim().toLowerCase().split("@")[1] ?? "");

export const MIN_AGE = 16;
export const FRESH_GRAD_MONTHS = 24;
const thisYear = () => new Date().getFullYear();

// ---- field rules (messages are the inline errors)
const text = (msg: string, max = 120) => z.string({ error: msg }).trim().min(1, msg).max(max, "That is too long.");
const choice = (o: Opt[], msg: string) => z.enum(values(o), { error: msg });
export const phoneRule = z.string({ error: "Please enter your phone number with the country code, for example +1 817 555 0100." }).trim().regex(/^\+[1-9][\d\s().-]{6,24}$/, "Please enter your phone number with the country code, for example +1 817 555 0100.");
export const urlRule = z.string({ error: "Please enter the full website address, starting with https://" }).trim().regex(/^https?:\/\/[^\s/$.?#][^\s]*\.[^\s]{2,}$/i, "Please enter the full website address, starting with https://");
export const linkedinRule = z.string({ error: "Please enter your LinkedIn profile link (linkedin.com/in/...)." }).trim().regex(/^https?:\/\/([a-z]{2,3}\.)?linkedin\.com\/(in|pub|company)\/[^\s/]+\/?.*$/i, "Please enter your LinkedIn profile link (linkedin.com/in/...).");

export function ageOn(dob: string, today = new Date()) {
  const d = new Date(`${dob}T00:00:00`);
  if (Number.isNaN(d.getTime())) return NaN;
  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
  return age;
}
export const dobRule = z
  .string({ error: "Please enter your date of birth." })
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Please enter your date of birth.")
  .refine((v) => ageOn(v) >= MIN_AGE, `You need to be ${MIN_AGE} or older to create an account.`)
  .refine((v) => ageOn(v) <= 100, "Please check the year.");
export const gradYearRule = z
  .string({ error: "Please choose your graduation year." })
  .regex(/^\d{4}$/, "Please choose your graduation year.")
  .refine((v) => Number(v) >= 1960 && Number(v) <= thisYear() + 6, "Please choose your graduation year.");

// Graduated (or graduating) within the last 24 months: the existing fresh graduate notice.
export function freshGradYear(year: string | number | null | undefined) {
  const y = Number(year);
  if (!y) return false;
  const now = new Date();
  const months = (now.getFullYear() - y) * 12 + now.getMonth() - 5; // a June graduation
  return months >= -1 && months <= FRESH_GRAD_MONTHS;
}

// ---- step 2: account
export const passwordRule = z
  .string({ error: "Please choose a password." })
  .min(8, "Use at least 8 characters.")
  .regex(/[A-Za-z]/, "Add at least one letter.")
  .regex(/\d/, "Add at least one number.");

export const accountSchema = z
  .object({
    email: z.string({ error: "Please enter a valid email address." }).trim().email("Please enter a valid email address."),
    password: passwordRule,
    confirm: z.string({ error: "Please type the password again." }).min(1, "Please type the password again."),
  })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "The two passwords do not match." });

// ---- step 3a: student details
const personBase = {
  full_name: text("Please enter your full name.", 120).refine((v) => v.length >= 2, "Please enter your full name."),
  phone: phoneRule,
  country: text("Please enter your country.", 80),
  city: text("Please enter your city.", 80),
  heard_from: choice(HEARD_FROM, "Please tell us how you heard about us."),
};

export const studentSchema = z
  .object({
    ...personBase,
    whatsapp_same: z.boolean(),
    whatsapp: z.string().trim().optional(),
    date_of_birth: dobRule,
    current_status: choice(STUDENT_STATUS, "Please choose your current status."),
    degree_field: choice(DEGREE_FIELDS, "Please choose your field of study."),
    degree_level: choice(DEGREE_LEVELS, "Please choose your degree level."),
    university: text("Please enter your university or school.", 160),
    graduation_year: gradYearRule,
    experience_years: choice(EXPERIENCE, "Please choose your years of experience."),
    revit_level: choice(REVIT_LEVELS, "Please choose your Revit level."),
    career_goal: choice(CAREER_GOALS, "Please choose a career goal."),
    preferred_format: choice(FORMATS, "Please choose how you prefer to learn."),
  })
  .superRefine((v, ctx) => {
    if (!v.whatsapp_same && !phoneRule.safeParse(v.whatsapp ?? "").success) ctx.addIssue({ code: "custom", path: ["whatsapp"], message: "Please enter your WhatsApp number with the country code." });
  });

// ---- step 3b: recruiter details
export const recruiterSchema = z.object({
  ...personBase,
  job_title: text("Please enter your job title.", 120),
  company_name: text("Please enter your company name.", 160),
  company_website: urlRule,
  company_type: choice(COMPANY_TYPES, "Please choose your company type."),
  company_size: choice(COMPANY_SIZES, "Please choose your company size."),
  linkedin_url: linkedinRule,
  hiring_roles: z.array(z.enum(values(HIRING_ROLES)), { error: "Please choose at least one role you hire for." }).min(1, "Please choose at least one role you hire for."),
  expected_hires: choice(EXPECTED_HIRES, "Please choose how many people you expect to hire."),
});

// ---- step 3c: instructor details
export const instructorSchema = z.object({
  ...personBase,
  job_title: text("Please enter your current job title.", 120),
  employer: text("Please enter your company or employer.", 160),
  industry_years: choice(INDUSTRY_YEARS, "Please choose your years in the industry."),
  teaching_years: choice(TEACHING_YEARS, "Please choose your teaching experience."),
  subjects: z.array(z.enum(values(INSTRUCTOR_SUBJECTS)), { error: "Please choose at least one program you can teach." }).min(1, "Please choose at least one program you can teach."),
  teaching_format: choice(FORMATS, "Please choose how you can teach."),
  availability: choice(AVAILABILITY, "Please choose when you are available."),
  linkedin_url: linkedinRule,
  bio: z.string({ error: "Please write a short bio." }).trim().min(BIO_MIN, `Please write at least ${BIO_MIN} characters about your background.`).max(BIO_MAX, `Please keep it under ${BIO_MAX} characters.`),
});

// ---- the owner's short step (an email with a server-side grant)
export const ownerSchema = z.object({
  full_name: text("Please enter your full name.", 120).refine((v) => v.length >= 2, "Please enter your full name."),
  phone: phoneRule,
});

// ---- step 4: consents
export const consentSchema = (kind: boolean | "recruiter" | "instructor") =>
  z.object({
    consent_terms: z.literal(true, { error: "Please agree to the Terms and Privacy Policy." }),
    consent_contact: z.literal(true, { error: "Please agree so we can contact you about your account." }),
    authorised_confirmed: kind === true || kind === "recruiter" ? z.literal(true, { error: "Please confirm you can recruit for this company." }) : kind === "instructor" ? z.literal(true, { error: "Please confirm your details are accurate and that you can teach this material." }) : z.boolean().optional(),
  });

export type StudentDetails = z.infer<typeof studentSchema>;
export type RecruiterDetails = z.infer<typeof recruiterSchema>;
export type InstructorDetails = z.infer<typeof instructorSchema>;
export type Consents = { consent_terms: boolean; consent_contact: boolean; authorised_confirmed?: boolean };

// ---- what a complete profile looks like (mirrors public.profile_complete in 0005; the mock uses this)
type Row = Record<string, unknown>;
const filled = (v: unknown) => (Array.isArray(v) ? v.length > 0 : v !== null && v !== undefined && String(v).trim() !== "");

export const STUDENT_REQUIRED = ["full_name", "phone", "whatsapp", "country", "city", "date_of_birth", "current_status", "degree_field", "degree_level", "university", "graduation_year", "experience_years", "revit_level", "career_goal", "preferred_format", "heard_from", "consent_terms_at", "consent_contact_at"] as const;
export const RECRUITER_PROFILE_REQUIRED = ["full_name", "phone", "country", "city", "heard_from", "consent_terms_at", "consent_contact_at"] as const;
export const RECRUITER_REQUIRED = ["job_title", "company_name", "company_website", "company_type", "company_size", "linkedin_url", "hiring_roles", "expected_hires"] as const;
export const INSTRUCTOR_PROFILE_REQUIRED = RECRUITER_PROFILE_REQUIRED;
export const INSTRUCTOR_REQUIRED = ["job_title", "employer", "industry_years", "teaching_years", "subjects", "teaching_format", "availability", "linkedin_url", "bio"] as const;
export const OWNER_REQUIRED = ["full_name", "phone"] as const;

export function profileComplete(p: Row | null | undefined, recruiter?: Row | null, instructor?: Row | null): boolean {
  if (!p) return false;
  if (p.role === "admin" || p.role === "super_admin") return OWNER_REQUIRED.every((k) => filled(p[k]));
  if (p.account_type === "student") {
    if (!STUDENT_REQUIRED.every((k) => filled(p[k]))) return false;
    return typeof p.date_of_birth === "string" && ageOn(p.date_of_birth) >= MIN_AGE;
  }
  if (p.account_type === "instructor") {
    if (!INSTRUCTOR_PROFILE_REQUIRED.every((k) => filled(p[k]))) return false;
    return Boolean(instructor) && INSTRUCTOR_REQUIRED.every((k) => filled(instructor![k])) && String(instructor!.bio ?? "").trim().length >= BIO_MIN && instructor!.info_confirmed === true;
  }
  if (p.account_type === "recruiter") {
    if (!RECRUITER_PROFILE_REQUIRED.every((k) => filled(p[k]))) return false;
    return Boolean(recruiter) && RECRUITER_REQUIRED.every((k) => filled(recruiter![k])) && recruiter!.authorised_confirmed === true;
  }
  return false;
}

// Sign-up metadata: what the form sends with auth.signUp, and what the database trigger (or the mock) copies into
// profiles and recruiter_profiles. Never contains a role or a password.
export type SignupMeta = Row & { account_type: "student" | "instructor" | "recruiter" };

export function studentMeta(d: StudentDetails, c: Consents): SignupMeta {
  return {
    account_type: "student",
    full_name: d.full_name.trim(),
    first_name: d.full_name.trim().split(/\s+/)[0], // for the confirmation email greeting

    phone: d.phone.trim(),
    whatsapp: d.whatsapp_same ? d.phone.trim() : (d.whatsapp ?? "").trim(),
    country: d.country.trim(),
    city: d.city.trim(),
    date_of_birth: d.date_of_birth,
    current_status: d.current_status,
    degree_field: d.degree_field,
    degree_level: d.degree_level,
    university: d.university.trim(),
    graduation_year: Number(d.graduation_year),
    experience_years: d.experience_years,
    revit_level: d.revit_level,
    career_goal: d.career_goal,
    preferred_format: d.preferred_format,
    heard_from: d.heard_from,
    consent_terms: c.consent_terms,
    consent_contact: c.consent_contact,
  };
}

export function recruiterMeta(d: RecruiterDetails, c: Consents): SignupMeta {
  return {
    account_type: "recruiter",
    full_name: d.full_name.trim(),
    first_name: d.full_name.trim().split(/\s+/)[0],
    phone: d.phone.trim(),
    country: d.country.trim(),
    city: d.city.trim(),
    heard_from: d.heard_from,
    job_title: d.job_title.trim(),
    company_name: d.company_name.trim(),
    company_website: d.company_website.trim(),
    company_type: d.company_type,
    company_size: d.company_size,
    linkedin_url: d.linkedin_url.trim(),
    hiring_roles: d.hiring_roles,
    expected_hires: d.expected_hires,
    consent_terms: c.consent_terms,
    consent_contact: c.consent_contact,
    authorised_confirmed: c.authorised_confirmed === true,
  };
}

export function instructorMeta(d: InstructorDetails, c: Consents): SignupMeta {
  return {
    account_type: "instructor",
    full_name: d.full_name.trim(),
    first_name: d.full_name.trim().split(/\s+/)[0],
    phone: d.phone.trim(),
    country: d.country.trim(),
    city: d.city.trim(),
    heard_from: d.heard_from,
    job_title: d.job_title.trim(),
    employer: d.employer.trim(),
    industry_years: d.industry_years,
    teaching_years: d.teaching_years,
    subjects: d.subjects,
    teaching_format: d.teaching_format,
    availability: d.availability,
    linkedin_url: d.linkedin_url.trim(),
    bio: d.bio.trim(),
    consent_terms: c.consent_terms,
    consent_contact: c.consent_contact,
    info_confirmed: c.authorised_confirmed === true,
  };
}
