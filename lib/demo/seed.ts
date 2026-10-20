import { emptyState, seedUser, uuid, type MockState, type Row } from "./engine";

// Sample data for the client demo (/demo/). Every person is obviously fictional: "Sample Student NN" with an
// @example.com address, no real names, phones or links. Rebuilt by "Reset demo data". Deterministic ids so the
// tour cards can link straight to a row.

export const DEMO_STUDENT_EMAIL = "student01@example.com";
export const DEMO_ADMIN_EMAIL = "admin@example.com";
export const DEMO_PASSWORD = "demo-password-1"; // shown in the demo UI; it unlocks sample data only
export const DEMO_APP_ID = "aaaaaaaa-0000-4000-8000-000000000001";

const DAY = 86400_000;
const at = (daysAgo: number, hour = 10) => new Date(Date.now() - daysAgo * DAY - (hour - 10) * 3600_000).toISOString();

type Spec = {
  n: number;
  status: "submitted" | "under_review" | "interview" | "accepted" | "enrolled" | "waitlist" | "rejected";
  programs: string[];
  daysAgo: number;
  discount?: "freshGrad" | "student" | null;
  discountStatus?: "pending" | "verified" | "rejected";
  current: string;
  degree: string;
  experience: string;
  goal: string;
  country: string;
  city: string;
  gradYear?: number;
  proof?: boolean;
  cv?: boolean;
};

const year = new Date().getFullYear();

// 16 applications across every status and most programs. The first one belongs to the demo student.
const specs: Spec[] = [
  { n: 1, status: "under_review", programs: ["revit-mep"], daysAgo: 3, discount: "freshGrad", discountStatus: "pending", current: "Fresh graduate", degree: "Mechanical engineering", experience: "None", goal: "BIM Coordinator", country: "USA", city: "Fort Worth", gradYear: year, proof: true, cv: true },
  { n: 2, status: "submitted", programs: ["bim-fundamentals-revit"], daysAgo: 1, discount: null, current: "Career changer", degree: "Non-engineering", experience: "3 to 5 years", goal: "BIM Modeler", country: "USA", city: "Dallas" },
  { n: 3, status: "submitted", programs: ["vdc-professional-bootcamp"], daysAgo: 2, discount: "freshGrad", discountStatus: "pending", current: "Fresh graduate", degree: "Civil engineering", experience: "Less than 1 year", goal: "VDC Engineer", country: "USA", city: "Arlington", gradYear: year - 1, proof: true },
  { n: 4, status: "submitted", programs: ["navisworks-clash-detection"], daysAgo: 4, discount: null, current: "Working professional", degree: "Construction management", experience: "5+ years", goal: "BIM Manager", country: "USA", city: "Houston", cv: true },
  { n: 5, status: "under_review", programs: ["revit-architecture", "revit-family-creation"], daysAgo: 6, discount: "student", discountStatus: "verified", current: "Current student", degree: "Architecture", experience: "None", goal: "BIM Modeler", country: "USA", city: "Austin", gradYear: year + 1 },
  { n: 6, status: "under_review", programs: ["4d-5d-simulation"], daysAgo: 7, discount: null, current: "Working professional", degree: "Civil engineering", experience: "1 to 3 years", goal: "VDC Engineer", country: "Canada", city: "Toronto" },
  { n: 7, status: "interview", programs: ["vdc-professional-bootcamp"], daysAgo: 9, discount: "freshGrad", discountStatus: "verified", current: "Fresh graduate", degree: "Architecture", experience: "None", goal: "BIM Coordinator", country: "USA", city: "Plano", gradYear: year, proof: true, cv: true },
  { n: 8, status: "interview", programs: ["bim-management-iso-19650"], daysAgo: 11, discount: null, current: "Working professional", degree: "Construction management", experience: "5+ years", goal: "BIM Manager", country: "USA", city: "Denver" },
  { n: 9, status: "accepted", programs: ["revit-structure"], daysAgo: 14, discount: "freshGrad", discountStatus: "verified", current: "Fresh graduate", degree: "Civil engineering", experience: "Less than 1 year", goal: "BIM Modeler", country: "Egypt", city: "Cairo", gradYear: year - 1, proof: true },
  { n: 10, status: "accepted", programs: ["dynamo-for-revit"], daysAgo: 16, discount: null, current: "Working professional", degree: "Mechanical engineering", experience: "3 to 5 years", goal: "VDC Engineer", country: "USA", city: "Fort Worth" },
  { n: 11, status: "enrolled", programs: ["vdc-professional-bootcamp"], daysAgo: 24, discount: "freshGrad", discountStatus: "verified", current: "Fresh graduate", degree: "Electrical engineering", experience: "None", goal: "BIM Coordinator", country: "USA", city: "Irving", gradYear: year, proof: true, cv: true },
  { n: 12, status: "enrolled", programs: ["low-voltage-bim"], daysAgo: 28, discount: null, current: "Working professional", degree: "Electrical engineering", experience: "1 to 3 years", goal: "BIM Modeler", country: "USA", city: "San Antonio" },
  { n: 13, status: "enrolled", programs: ["revit-mep"], daysAgo: 31, discount: "student", discountStatus: "verified", current: "Current student", degree: "Mechanical engineering", experience: "None", goal: "BIM Modeler", country: "Mexico", city: "Monterrey", gradYear: year + 1 },
  { n: 14, status: "waitlist", programs: ["navisworks-clash-detection"], daysAgo: 12, discount: null, current: "Career changer", degree: "Other engineering", experience: "1 to 3 years", goal: "Other", country: "USA", city: "El Paso" },
  { n: 15, status: "rejected", programs: ["revit-architecture"], daysAgo: 20, discount: "freshGrad", discountStatus: "rejected", current: "Fresh graduate", degree: "Non-engineering", experience: "None", goal: "Other", country: "USA", city: "Lubbock", gradYear: year - 4, proof: true },
  { n: 16, status: "submitted", programs: ["bim-fundamentals-revit", "revit-architecture"], daysAgo: 0, discount: "freshGrad", discountStatus: "pending", current: "Fresh graduate", degree: "Architecture", experience: "None", goal: "BIM Modeler", country: "USA", city: "Waco", gradYear: year, proof: true },
];

const statusEnum: Record<string, string> = { "Fresh graduate": "fresh_grad", "Current student": "student", "Working professional": "professional", "Career changer": "career_changer", Other: "other" };
const pad = (n: number) => String(n).padStart(2, "0");
const appId = (n: number) => `aaaaaaaa-0000-4000-8000-${String(n).padStart(12, "0")}`;
const fileId = (n: number, k: string) => `${n}-${k}`;

export function seedDemo(): MockState {
  const state = emptyState();
  state.nextId = 500; // keep generated ids away from the seeded ones

  const adminId = seedUser(state, DEMO_ADMIN_EMAIL, DEMO_PASSWORD, { full_name: "Sample Admin" }, "admin");

  for (const s of specs) {
    const name = `Sample Student ${pad(s.n)}`;
    const email = `student${pad(s.n)}@example.com`;
    const userId = seedUser(state, email, DEMO_PASSWORD, { full_name: name, current_status: statusEnum[s.current] });
    Object.assign(state.tables.profiles.find((p) => p.id === userId)!, { phone: `+1 555 010 ${pad(s.n)}${pad(s.n)}`, country: s.country, city: s.city, degree: s.degree, graduation_year: s.gradYear ?? null, language: "English", age_range: s.current === "Fresh graduate" ? "22 to 25" : "26 to 30" });
    const id = s.n === 1 ? DEMO_APP_ID : appId(s.n);
    const submitted = at(s.daysAgo);
    const proofPath = s.proof ? `${userId}/${fileId(s.n, "proof")}.pdf` : null;
    const cvPath = s.cv ? `${userId}/${fileId(s.n, "cv")}.pdf` : null;
    if (proofPath) state.files[`documents/${proofPath}`] = 48_000;
    if (cvPath) state.files[`documents/${cvPath}`] = 120_000;
    const row: Row = {
      id,
      user_id: userId,
      status: s.status,
      created_at: at(s.daysAgo + 1),
      updated_at: submitted,
      submitted_at: submitted,
      full_name: name,
      email,
      phone: `+1 555 010 ${pad(s.n)}${pad(s.n)}`,
      whatsapp: null,
      country: s.country,
      city: s.city,
      dob_or_age: s.current === "Fresh graduate" ? "22 to 25" : "26 to 30",
      language: "English",
      current_status: s.current,
      degree: s.degree,
      university: s.country === "USA" ? "Sample University" : "Sample International University",
      graduation_year: s.gradYear ?? null,
      gpa: null,
      experience_years: s.experience,
      job_title: s.current === "Working professional" ? "Sample job title" : null,
      company: s.current === "Working professional" ? "Sample Company LLC" : null,
      software_skills: { Revit: s.experience === "None" ? "Beginner" : "Intermediate", AutoCAD: "Intermediate", Navisworks: s.goal === "VDC Engineer" ? "Intermediate" : "None" },
      career_goal: s.goal,
      linkedin_url: null,
      portfolio_url: null,
      programs: s.programs,
      format: s.n % 3 === 0 ? "In-person (Fort Worth, TX)" : "Online live",
      schedule: s.n % 2 === 0 ? "Evenings" : "Weekends",
      start_pref: "Next cohort",
      has_laptop: "Yes",
      source: ["LinkedIn", "Google", "Friend", "University"][s.n % 4],
      discount_type: s.discount ?? null,
      discount_percent: s.discount === "freshGrad" ? 40 : s.discount === "student" ? 25 : 0,
      discount_status: s.discount ? (s.discountStatus ?? "pending") : "none",
      discount_verified: s.discountStatus === "verified",
      proof_file_path: proofPath,
      cv_file_path: cvPath,
      consent_privacy: true,
      consent_contact: true,
      newsletter: s.n % 2 === 0,
      notes: null,
      utm: s.n % 4 === 0 ? { utm_source: "linkedin", utm_campaign: "sample" } : null,
      turnstile_ok: true,
    };
    state.tables.applications.push(row);

    // The student's timeline: submitted, then every step up to the current status.
    const steps: string[] = ["submitted", "under_review", "interview", "accepted", "enrolled"];
    const upto = s.status === "waitlist" || s.status === "rejected" ? ["submitted", "under_review", s.status] : steps.slice(0, steps.indexOf(s.status) + 1);
    let from = "draft";
    upto.forEach((to, i) => {
      state.tables.application_events.push({ id: uuid(state.nextId++), application_id: id, actor_id: i === 0 ? userId : adminId, type: "status_change", from_status: from, to_status: to, note: null, visible_to_student: true, created_at: at(Math.max(0, s.daysAgo - i * 2), 10 + i) });
      from = to;
    });
    if (s.discountStatus === "verified") state.tables.application_events.push({ id: uuid(state.nextId++), application_id: id, actor_id: adminId, type: "note", from_status: null, to_status: null, note: "Your discount proof is verified. The discount applies to your invoice.", visible_to_student: true, created_at: at(Math.max(0, s.daysAgo - 2), 14) });
    if (s.n === 1) state.tables.application_events.push({ id: uuid(state.nextId++), application_id: id, actor_id: adminId, type: "note", from_status: null, to_status: null, note: "Internal: transcript looks complete, confirm the graduation date on the call.", visible_to_student: false, created_at: at(1, 15) });
  }

  state.tables.leads.push(
    { id: uuid(state.nextId++), created_at: at(0, 9), name: "Sample Lead 01", email: "lead01@example.com", topic: "Send me the price list", handled: false },
    { id: uuid(state.nextId++), created_at: at(2, 11), name: "Sample Company Contact", email: "company01@example.com", topic: "Team training: 6 people, Revit MEP, in person", handled: false },
    { id: uuid(state.nextId++), created_at: at(9, 16), name: "Sample Lead 02", email: "lead02@example.com", topic: "Tell me when accounts open", handled: true },
  );
  state.tables.contact_messages.push(
    { id: uuid(state.nextId++), created_at: at(1, 13), name: "Sample Visitor 01", email: "visitor01@example.com", message: "Do you offer weekend sessions for the Navisworks program?", handled: false },
    { id: uuid(state.nextId++), created_at: at(6, 10), name: "Sample Visitor 02", email: "visitor02@example.com", message: "Is the fresh graduate discount available for international students?", handled: true },
  );
  state.session = null;
  return state;
}

export const demoStudentId = (state: MockState) => state.users.find((u) => u.email === DEMO_STUDENT_EMAIL)?.id ?? null;
export const demoAdminId = (state: MockState) => state.users.find((u) => u.email === DEMO_ADMIN_EMAIL)?.id ?? null;
