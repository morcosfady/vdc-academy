import { emptyState, seedUser, uuid, type MockState, type Row } from "./engine";

// Sample data for the client demo (/demo/). Every person is obviously fictional: "Sample Student NN" with an
// @example.com address, no real names, phones or links. Rebuilt by "Reset demo data". Deterministic ids so the
// tour cards can link straight to a row.

export const DEMO_STUDENT_EMAIL = "student01@example.com";
export const DEMO_ADMIN_EMAIL = "admin@example.com";
export const DEMO_PASSWORD = "demo-password-1"; // shown in the demo UI; it unlocks sample data only
export const DEMO_APP_ID = "aaaaaaaa-0000-4000-8000-000000000001";
// Sample Instructor 01 is pending, 02 approved (the demo instructor dashboard), 03 rejected, 04 approved.
export const DEMO_INSTRUCTOR_EMAIL = "instructor01@example.com";
export const DEMO_APPROVED_INSTRUCTOR_EMAIL = "instructor02@example.com";
export const DEMO_RECRUITER_EMAIL = "recruiter01@example.com";
// An approved recruiter (Sample Company B) and a student who opted in and has published evaluations, for the evaluation cards.
export const DEMO_VERIFIED_RECRUITER_EMAIL = "recruiter02@example.com";
export const DEMO_TALENT_STUDENT_EMAIL = "studenta@example.com";
// The demo owner. Fictional on purpose: the real owner's address lives only in the database grant (0005).
export const DEMO_SUPER_EMAIL = "owner@example.com";

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
    Object.assign(state.tables.profiles.find((p) => p.id === userId)!, { phone: `+1 555 010 ${pad(s.n)}${pad(s.n)}`, whatsapp: `+1 555 010 ${pad(s.n)}${pad(s.n)}`, country: s.country, city: s.city, degree: s.degree, graduation_year: s.gradYear ?? 2018, language: "English", age_range: s.current === "Fresh graduate" ? "22 to 25" : "26 to 30", created_at: at(s.daysAgo + 1) });
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
  // Recruiters (fictional companies) in every verification state, and their hiring requests.
  const recruiters: { n: number; company: string; type: string; size: string; roles: string[]; hires: string; status: "pending" | "approved" | "rejected"; daysAgo: number; note?: string }[] = [
    { n: 1, company: "Sample Company A", type: "general_contractor", size: "51-200", roles: ["bim_coordinator", "vdc_engineer"], hires: "2-5", status: "pending", daysAgo: 1 },
    { n: 2, company: "Sample Company B", type: "ae_firm", size: "11-50", roles: ["bim_modeler", "revit_drafter"], hires: "1", status: "approved", daysAgo: 9 },
    { n: 3, company: "Sample Company C", type: "other", size: "1-10", roles: ["other"], hires: "1", status: "rejected", daysAgo: 12, note: "We could not confirm the company website. Reply from a company email address and we will review it again." },
    { n: 4, company: "Sample Company D", type: "subcontractor", size: "201-1000", roles: ["bim_coordinator", "bim_manager"], hires: "6-10", status: "pending", daysAgo: 3 },
    { n: 5, company: "Sample Company E", type: "general_contractor", size: "201-1000", roles: ["bim_coordinator", "vdc_engineer"], hires: "2-5", status: "approved", daysAgo: 20 },
    { n: 6, company: "Sample Company F", type: "bim_consultancy", size: "11-50", roles: ["bim_modeler", "bim_manager"], hires: "1", status: "approved", daysAgo: 26 },
  ];
  const recruiterIds: string[] = [];
  for (const r of recruiters) {
    const id = seedUser(state, `recruiter${pad(r.n)}@example.com`, DEMO_PASSWORD, { full_name: `Sample Recruiter ${pad(r.n)}` }, "recruiter", {
      profile: { phone: `+1 555 020 ${pad(r.n)}${pad(r.n)}`, country: "USA", city: ["Dallas", "Fort Worth", "Austin", "Houston", "Plano", "Irving"][r.n - 1], heard_from: "linkedin", created_at: at(r.daysAgo) },
      recruiter: {
        job_title: ["Talent lead", "BIM Manager", "Owner", "HR partner", "VDC Director", "Principal"][r.n - 1], company_name: r.company, company_website: `https://example.com/company-${String.fromCharCode(96 + r.n)}`,
        company_type: r.type, company_size: r.size, linkedin_url: `https://www.linkedin.com/in/sample-recruiter-${pad(r.n)}`, hiring_roles: r.roles, expected_hires: r.hires, authorised_confirmed: true,
        verification_status: r.status, verified_by: r.status === "pending" ? null : adminId, verified_at: r.status === "pending" ? null : at(r.daysAgo - 2), rejection_note: r.note ?? null, created_at: at(r.daysAgo),
      },
    });
    recruiterIds.push(id);
  }
  const hiring: [number, string, number, string, string, number, string, string][] = [
    [1, "vdc_engineer", 2, "Dallas, TX", "hybrid", 45, "in_review", "Coordination on two hospital projects. Navisworks required."],
    [1, "bim_modeler", 1, "Fort Worth, TX", "on_site", 30, "new", "Revit architecture, a fresh graduate is welcome."],
    [0, "bim_coordinator", 3, "Remote (US)", "remote", 60, "new", "MEP coordination, Revit MEP and Navisworks."],
  ];
  for (const [ri, role, hires, location, mode, inDays, status, notes] of hiring) {
    const start = new Date(Date.now() + inDays * DAY).toISOString().slice(0, 10);
    state.tables.hiring_requests.push({ id: uuid(state.nextId++), recruiter_id: recruiterIds[ri], role, hires, location, work_mode: mode, start_date: start, notes, status, created_at: at(ri === 1 ? 4 : 1), updated_at: at(1) });
  }

  // Instructors (fictional people) in every verification state.
  const instructors: { n: number; title: string; employer: string; industry: string; teaching: string; subjects: string[]; format: string; availability: string; status: "pending" | "approved" | "rejected"; daysAgo: number; note?: string }[] = [
    { n: 1, title: "BIM Manager", employer: "Sample Company A", industry: "10-15", teaching: "2-5", subjects: ["revit-architecture", "bim-fundamentals-revit"], format: "either", availability: "evenings", status: "pending", daysAgo: 1 },
    { n: 2, title: "VDC Director", employer: "Sample Company B", industry: "15+", teaching: "5+", subjects: ["navisworks-clash-detection", "4d-5d-simulation", "vdc-professional-bootcamp"], format: "online", availability: "weekends", status: "approved", daysAgo: 14 },
    { n: 3, title: "Revit Drafter", employer: "Sample Company C", industry: "3-5", teaching: "none", subjects: ["revit-mep"], format: "in_person", availability: "daytime", status: "rejected", daysAgo: 8, note: "We need a little more teaching experience first. Reply with a recorded sample lesson and we will review it again." },
    { n: 4, title: "MEP Coordinator", employer: "Sample Company D", industry: "5-10", teaching: "lt2", subjects: ["revit-mep", "low-voltage-bim", "dynamo-for-revit"], format: "either", availability: "flexible", status: "approved", daysAgo: 21 },
  ];
  for (const i of instructors) {
    seedUser(state, `instructor${pad(i.n)}@example.com`, DEMO_PASSWORD, { full_name: `Sample Instructor ${pad(i.n)}` }, "instructor", {
      profile: { phone: `+1 555 030 ${pad(i.n)}${pad(i.n)}`, country: "USA", city: ["Dallas", "Fort Worth", "Austin", "Houston"][i.n - 1], heard_from: "bay_bim", created_at: at(i.daysAgo) },
      instructor: {
        job_title: i.title, employer: i.employer, industry_years: i.industry, teaching_years: i.teaching, subjects: i.subjects, teaching_format: i.format, availability: i.availability,
        linkedin_url: `https://www.linkedin.com/in/sample-instructor-${pad(i.n)}`,
        bio: `Sample instructor profile ${pad(i.n)}. Years of BIM delivery on commercial projects, now teaching what works on real jobs.`, info_confirmed: true,
        verification_status: i.status, verified_by: i.status === "pending" ? null : adminId, verified_at: i.status === "pending" ? null : at(i.daysAgo - 2), rejection_note: i.note ?? null, created_at: at(i.daysAgo),
      },
    });
  }

  seedTalent(state, adminId, recruiterIds);

  // The demo super admin: granted like the real owner (a role grant on a confirmed email), with the same screens.
  seedUser(state, DEMO_SUPER_EMAIL, DEMO_PASSWORD, { full_name: "Sample Owner" }, "super_admin");
  state.roleGrants = [{ email: DEMO_SUPER_EMAIL, role: "super_admin" }];

  state.session = null;
  return state;
}

export const demoStudentId = (state: MockState) => state.users.find((u) => u.email === DEMO_STUDENT_EMAIL)?.id ?? null;
export const demoAdminId = (state: MockState) => state.users.find((u) => u.email === DEMO_ADMIN_EMAIL)?.id ?? null;
export const demoInstructorId = (state: MockState) => state.users.find((u) => u.email === DEMO_INSTRUCTOR_EMAIL)?.id ?? null;
export const demoApprovedInstructorId = (state: MockState) => state.users.find((u) => u.email === DEMO_APPROVED_INSTRUCTOR_EMAIL)?.id ?? null;
export const demoRecruiterId = (state: MockState) => state.users.find((u) => u.email === DEMO_RECRUITER_EMAIL)?.id ?? null;
export const demoSuperId = (state: MockState) => state.users.find((u) => u.email === DEMO_SUPER_EMAIL)?.id ?? null;
export const demoVerifiedRecruiterId = (state: MockState) => state.users.find((u) => u.email === DEMO_VERIFIED_RECRUITER_EMAIL)?.id ?? null;
export const demoTalentStudentId = (state: MockState) => state.users.find((u) => u.email === DEMO_TALENT_STUDENT_EMAIL)?.id ?? null;

// ---- talent profiles and evaluations (migration 0007). Eight fictional students: five opted in, three stay hidden.
type Talent = { letter: string; city: string; country: string; grad: number; programs: string[]; skills: Record<string, string>; visible: boolean; linkedin?: boolean; portfolio?: boolean };
const talent: Talent[] = [
  { letter: "A", city: "Fort Worth", country: "USA", grad: year, programs: ["revit-mep"], skills: { Revit: "Intermediate", Navisworks: "Beginner", AutoCAD: "Intermediate" }, visible: true, linkedin: true },
  { letter: "B", city: "Dallas", country: "USA", grad: year - 1, programs: ["vdc-professional-bootcamp"], skills: { Revit: "Advanced", Navisworks: "Intermediate", Dynamo: "Beginner" }, visible: true, linkedin: true, portfolio: true },
  { letter: "C", city: "Arlington", country: "USA", grad: year, programs: ["revit-architecture", "revit-family-creation"], skills: { Revit: "Intermediate", AutoCAD: "Advanced" }, visible: true },
  { letter: "D", city: "Austin", country: "USA", grad: year - 2, programs: ["navisworks-clash-detection"], skills: { Navisworks: "Advanced", Revit: "Intermediate" }, visible: true, portfolio: true },
  { letter: "E", city: "Houston", country: "USA", grad: year + 1, programs: ["bim-fundamentals-revit"], skills: { Revit: "Beginner", AutoCAD: "Beginner" }, visible: true },
  { letter: "F", city: "Plano", country: "USA", grad: year - 1, programs: ["revit-structure"], skills: { Revit: "Intermediate" }, visible: false },
  { letter: "G", city: "Irving", country: "USA", grad: year, programs: ["low-voltage-bim"], skills: { Revit: "Beginner", Navisworks: "None" }, visible: false },
  { letter: "H", city: "San Antonio", country: "USA", grad: year - 3, programs: ["dynamo-for-revit"], skills: { Dynamo: "Advanced", Revit: "Advanced" }, visible: false },
];

// recruiter = index into the recruiter list above (0 is Sample Recruiter 01 ... 5 is Sample Recruiter 06)
type SeededEvaluation = { student: string; recruiter: number; context: string; status: "submitted" | "published" | "hidden"; scores: number[]; overall: number; rec: string; strengths: string; improvements: string; privateNote: string; showCompany: boolean; daysAgo: number; hideNote?: string };
const CRITERION_ORDER = ["modeling", "coordination", "standards", "communication", "professionalism", "portfolio"];
const evaluationSeed: SeededEvaluation[] = [
  { student: "A", recruiter: 1, context: "portfolio_review", status: "published", scores: [4, 4, 5, 4, 5, 4], overall: 4, rec: "yes", strengths: "Clean, well named families and a tidy sheet set. The MEP model followed the standard we asked for.", improvements: "Show more coordination work across disciplines, not only single-discipline models.", privateNote: "Sample note: would interview for the coordinator role next quarter.", showCompany: true, daysAgo: 6 },
  { student: "A", recruiter: 4, context: "interview", status: "published", scores: [4, 3, 4, 5, 5, 4], overall: 4, rec: "strong_yes", strengths: "Explained a clash decision clearly and calmly. Asked good questions about our model standards.", improvements: "Practice walking through a full model review in under ten minutes.", privateNote: "Sample note: salary expectation is in range.", showCompany: false, daysAgo: 3 },
  { student: "A", recruiter: 5, context: "project_review", status: "submitted", scores: [3, 3, 4, 4, 4, 3], overall: 3, rec: "maybe", strengths: "Solid duct routing and a good eye for clearances on the sample project.", improvements: "Documentation was thin. Add notes for every sheet you issue.", privateNote: "Sample note: wait for the next cohort project before deciding.", showCompany: true, daysAgo: 0 },
  { student: "B", recruiter: 1, context: "project_review", status: "submitted", scores: [5, 4, 4, 4, 5, 5], overall: 5, rec: "strong_yes", strengths: "Strong model accuracy and a real portfolio. The coordination log was easy to follow.", improvements: "Be more confident when presenting trade-offs to a senior reviewer.", privateNote: "Sample note: fast track to a second interview.", showCompany: true, daysAgo: 1 },
  { student: "B", recruiter: 4, context: "portfolio_review", status: "published", scores: [5, 5, 4, 4, 4, 5], overall: 5, rec: "strong_yes", strengths: "The best clash resolution story in this batch, with before and after views.", improvements: "Tidy the naming of linked files so another team can open them without help.", privateNote: "Sample note: send the offer template.", showCompany: true, daysAgo: 8 },
  { student: "C", recruiter: 1, context: "portfolio_review", status: "submitted", scores: [4, 3, 3, 4, 4, 4], overall: 4, rec: "yes", strengths: "Careful architectural families and good attention to levels and grids.", improvements: "Learn the naming standard we use for sheets and views.", privateNote: "Sample note: check availability in March.", showCompany: true, daysAgo: 2 },
  { student: "D", recruiter: 1, context: "interview", status: "hidden", scores: [3, 3, 3, 3, 3, 3], overall: 3, rec: "maybe", strengths: "Fine, a good start overall.", improvements: "More detail please, in every box.", privateNote: "Sample note: too short to publish.", showCompany: true, daysAgo: 5, hideNote: "Please describe the work you reviewed and give one example in each box." },
  { student: "D", recruiter: 5, context: "worked_together", status: "published", scores: [4, 5, 4, 3, 4, 4], overall: 4, rec: "yes", strengths: "Found and fixed three clashes on a shared model without being asked.", improvements: "Update the team earlier when a deadline is at risk.", privateNote: "Sample note: good fit for a coordination assistant role.", showCompany: true, daysAgo: 10 },
  { student: "E", recruiter: 4, context: "portfolio_review", status: "submitted", scores: [3, 2, 3, 4, 4, 3], overall: 3, rec: "not_now", strengths: "Friendly and quick to learn. The first models are accurate for a beginner.", improvements: "Needs more practice before a junior role. Finish the bootcamp project first.", privateNote: "Sample note: revisit after the next cohort.", showCompany: true, daysAgo: 1 },
];

function seedTalent(state: MockState, adminId: string, recruiterIds: string[]) {
  const ids: Record<string, string> = {};
  talent.forEach((t, i) => {
    const name = `Sample Student ${t.letter}`;
    const email = `student${t.letter.toLowerCase()}@example.com`;
    const phone = `+1 555 030 0${i}0${i}`;
    const userId = seedUser(state, email, DEMO_PASSWORD, { full_name: name, current_status: "fresh_grad" }, "student", {
      profile: {
        phone,
        whatsapp: phone,
        city: t.city,
        country: t.country,
        graduation_year: t.grad,
        linkedin_url: t.linkedin ? `https://www.linkedin.com/in/sample-student-${t.letter.toLowerCase()}` : null,
        portfolio_url: t.portfolio ? `https://example.com/portfolio-${t.letter.toLowerCase()}` : null,
        talent_visible: t.visible,
        talent_consent_at: t.visible ? at(12 - i) : null,
        created_at: at(40 - i),
      },
    });
    ids[t.letter] = userId;
    const submitted = at(30 - i);
    state.tables.applications.push({
      id: `aaaaaaaa-0000-4000-8000-0000000002${String(i).padStart(2, "0")}`,
      user_id: userId, status: "enrolled", created_at: submitted, updated_at: submitted, submitted_at: submitted,
      full_name: name, email, phone, whatsapp: null, country: t.country, city: t.city, dob_or_age: "22 to 25", language: "English", current_status: "Fresh graduate",
      degree: "Architecture", university: "Sample University", graduation_year: t.grad, gpa: null, experience_years: "None", job_title: null, company: null, software_skills: t.skills, career_goal: "BIM Coordinator",
      linkedin_url: null, portfolio_url: null, programs: t.programs, format: "Online live", schedule: "Evenings", start_pref: "Next cohort", has_laptop: "Yes", source: "LinkedIn",
      discount_type: null, discount_percent: 0, discount_status: "none", discount_verified: false, proof_file_path: null, cv_file_path: null, consent_privacy: true, consent_contact: true,
      newsletter: false, notes: null, utm: null, turnstile_ok: true,
    });
  });
  seedTeaching(state, adminId, ids);
  evaluationSeed.forEach((e, n) => {
    const sent = at(e.daysAgo);
    const decided = e.status !== "submitted";
    const decidedAt = at(Math.max(0, e.daysAgo - 1));
    state.tables.student_evaluations.push({
      id: `eeeeeeee-0000-4000-8000-${String(n + 1).padStart(12, "0")}`,
      student_id: ids[e.student], recruiter_id: recruiterIds[e.recruiter], application_id: null, context: e.context,
      scores: Object.fromEntries(CRITERION_ORDER.map((k, i) => [k, e.scores[i]])), overall: e.overall, recommendation: e.rec,
      strengths: e.strengths, improvements: e.improvements, private_note: e.privateNote, show_company_name: e.showCompany,
      status: e.status, moderation_note: e.hideNote ?? null, moderated_by: decided ? adminId : null, moderated_at: decided ? decidedAt : null,
      published_at: e.status === "published" ? decidedAt : null, notified_at: e.status === "published" ? decidedAt : null,
      created_at: sent, updated_at: sent,
    });
  });
}

// Instructor assignments and evaluations (0009). Sample Instructor 02 and 04 are approved; 01 is pending, 03 rejected.
// `ids` maps the talent students A to E; the demo student is Sample Student 01.
function seedTeaching(state: MockState, adminId: string, ids: Record<string, string>) {
  const instructorId = (n: number) => state.users.find((u) => u.email === `instructor${String(n).padStart(2, "0")}@example.com`)?.id;
  const i2 = instructorId(2);
  const i4 = instructorId(4);
  const demo = demoStudentId(state);
  if (!i2 || !i4 || !demo) return;
  const roster: [string, string, string | null][] = [
    [i2, ids.A, "revit-architecture"],
    [i2, ids.B, "navisworks-clash-detection"],
    [i2, demo, "bim-fundamentals-revit"],
    [i4, ids.C, "revit-mep"],
    [i4, ids.D, "dynamo-for-revit"],
  ];
  roster.forEach(([instructor, student, program], n) => {
    state.tables.instructor_assignments.push({ id: `a5516000-0000-4000-8000-${String(n + 1).padStart(12, "0")}`, instructor_id: instructor, student_id: student, program, created_by: adminId, created_at: at(30 - n) });
  });
  type Seed = { instructor: string; student: string; program: string | null; context: string; status: "submitted" | "published" | "hidden"; scores: number[]; overall: number; readiness: string; strengths: string; improvements: string; privateNote: string; hideNote?: string; daysAgo: number };
  const list: Seed[] = [
    { instructor: i2, student: ids.A, program: "revit-architecture", context: "end_of_course", status: "published", scores: [4, 4, 5, 4, 5, 4], overall: 4, readiness: "ready", strengths: "Clean, well named families and a clear sheet set. Asks good questions in class.", improvements: "Check the level of detail before you share a model, and keep the browser organization tidy.", privateNote: "Strong candidate for the next advanced cohort.", daysAgo: 8 },
    { instructor: i2, student: ids.B, program: "navisworks-clash-detection", context: "mid_course", status: "submitted", scores: [3, 4, 3, 4, 5, 3], overall: 4, readiness: "almost_there", strengths: "Finds clashes quickly and explains each one in plain words.", improvements: "Group the clashes by discipline before the report and name the viewpoints.", privateNote: "", daysAgo: 2 },
    { instructor: i2, student: demo, program: "bim-fundamentals-revit", context: "mid_course", status: "published", scores: [3, 3, 4, 4, 5, 3], overall: 4, readiness: "almost_there", strengths: "Reliable and on time. Good progress on views and sheets.", improvements: "Practice linking models and shared coordinates before the final project.", privateNote: "", daysAgo: 5 },
    { instructor: i4, student: ids.C, program: "revit-mep", context: "project_review", status: "hidden", scores: [3, 3, 3, 3, 3, 3], overall: 3, readiness: "needs_practice", strengths: "Turned the work in on time.", improvements: "Needs more practice with duct routing.", privateNote: "", hideNote: "Too short to help the student. Ask the instructor to add detail.", daysAgo: 6 },
    { instructor: i4, student: ids.D, program: "dynamo-for-revit", context: "mid_course", status: "submitted", scores: [4, 3, 4, 3, 4, 4], overall: 4, readiness: "almost_there", strengths: "Builds clear graphs and documents each step.", improvements: "Test the script on a second model before sharing it with the group.", privateNote: "", daysAgo: 1 },
  ];
  list.forEach((e, n) => {
    const sent = at(e.daysAgo);
    const decided = e.status !== "submitted";
    const decidedAt = at(Math.max(0, e.daysAgo - 1));
    state.tables.instructor_evaluations.push({
      id: `1e5e0000-0000-4000-8000-${String(n + 1).padStart(12, "0")}`,
      student_id: e.student, instructor_id: e.instructor, program: e.program, context: e.context,
      scores: Object.fromEntries(CRITERION_ORDER.map((k, i) => [k, e.scores[i]])), overall: e.overall, readiness: e.readiness,
      strengths: e.strengths, improvements: e.improvements, private_note: e.privateNote,
      status: e.status, moderation_note: e.hideNote ?? null, moderated_by: decided ? adminId : null, moderated_at: decided ? decidedAt : null,
      published_at: e.status === "published" ? decidedAt : null, notified_at: e.status === "published" ? decidedAt : null,
      created_at: sent, updated_at: sent,
    });
  });
}
