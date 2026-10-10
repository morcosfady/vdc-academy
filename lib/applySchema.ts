import { z } from "zod";

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

export const MAX_FILE = 5 * 1024 * 1024;
export const PROOF_TYPES = ["application/pdf", "image/jpeg", "image/png"];
export const CV_TYPES = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
