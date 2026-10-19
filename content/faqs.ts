import { discounts, earlyBird, freshGradMonths } from "@/config/discounts";

// Every answer repeats what the site already says (programs, discounts, apply flow). Nothing here is a new promise.
export type FaqCategory = "programs" | "pricing" | "applying" | "equipment" | "companies";
export type FaqItem = { q: string; a: string; category: FaqCategory };

export const faqCategories: { id: FaqCategory | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "programs", label: "Programs" },
  { id: "pricing", label: "Pricing and discounts" },
  { id: "applying", label: "Applying" },
  { id: "equipment", label: "Equipment" },
  { id: "companies", label: "Companies" },
];

export const faqs: FaqItem[] = [
  // Programs
  { category: "programs", q: "Do I need BIM experience to start?", a: "No. BIM Fundamentals with Revit starts from zero. Every other program lists what it expects." },
  { category: "programs", q: "Who is the academy for?", a: "Fresh graduates, current students, working professionals and career changers in architecture, engineering and construction." },
  { category: "programs", q: "Who teaches the programs?", a: "Working professionals from Bay BIM Designs, a BIM and VDC company in Fort Worth, TX." },
  { category: "programs", q: "Are programs online or in person?", a: "Formats are being confirmed per program. The application lets you choose online, in person in Fort Worth, TX, or hybrid." },
  { category: "programs", q: "Do you issue a certificate?", a: "Yes. You receive a certificate of completion from VDC Academy by Bay BIM Designs." },

  // Pricing and discounts
  {
    category: "pricing",
    q: "How does the fresh graduate discount work?",
    a: `Graduated in the last ${freshGradMonths} months? Upload your certificate or transcript. The discount stays pending until we verify it.`,
  },
  { category: "pricing", q: "When do I pay?", a: "After you are accepted. Your acceptance message confirms the price, your discount and the payment options before you pay anything." },
  {
    category: "pricing",
    q: "Is there a student discount?",
    a: `Yes. Students enrolled in engineering, architecture or construction save ${discounts.student.percent}% with a student ID. The discount stays pending until we check it.`,
  },
  {
    category: "pricing",
    q: "Do discounts stack?",
    a: `No, with one exception: early bird (${earlyBird.percent}% when you apply ${earlyBird.daysBeforeStart} or more days before the start) stacks with the fresh graduate discount. Every other combination takes the single best discount.`,
  },

  // Applying
  { category: "applying", q: "How do I apply?", a: "Use the Apply button. It takes five short steps: about you, your education, your experience, the program you want, and a review." },
  { category: "applying", q: "What files can I upload?", a: "Your graduation certificate or student ID, and optionally a CV. PDF, JPG or PNG for proof, PDF or DOC for a CV, up to 5 MB each." },
  { category: "applying", q: "How long until I hear back?", a: "We review applications within 1 to 2 business days, then set up a short advisor call to confirm fit and answer your questions." },
  {
    category: "applying",
    q: "I graduate next year. Can I apply now?",
    a: "Yes. Apply as a current student. If you graduate before the cohort starts, tell us and we switch you to the fresh graduate price.",
  },

  // Equipment
  { category: "equipment", q: "What do I need to run Revit?", a: "A laptop that can run Revit. The application asks about your laptop and we help you check it." },
  {
    category: "equipment",
    q: "Which software do the programs use?",
    a: "Autodesk Revit, Navisworks, Dynamo and Autodesk Construction Cloud, plus Microsoft Project or Primavera P6 in the 4D/5D program. Each program page lists its software.",
  },
  {
    category: "equipment",
    q: "My laptop may be too slow. Can I still apply?",
    a: "Yes. The application asks about your laptop. If it is not enough for Revit, we tell you before you pay anything.",
  },

  // Companies
  { category: "companies", q: "Can my company train a team?", a: "Yes. See the For Companies page or contact us. We invoice companies directly." },
  {
    category: "companies",
    q: "How does the group discount work?",
    a: `${discounts.group.who}: ${discounts.group.percent}% off. It is applied once an admin approves the group.`,
  },
  { category: "companies", q: "Can training run at our office?", a: "Yes. Team training runs on site in the Dallas Fort Worth area, live online, or as a mix of both." },
];

export const faqsIn = (category: FaqCategory) => faqs.filter((f) => f.category === category);
