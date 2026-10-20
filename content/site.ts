// Everything the owner has to provide lives here. A field is only shown on the site when it has a value
// AND approved is true. Nothing here ever renders as a bracket placeholder. See content/TODO-content.md.
export type Field<T = string> = { value: T | null; approved: boolean };
const f = <T = string>(value: T | null = null, approved = false): Field<T> => ({ value, approved });

export const shown = <T,>(x: Field<T>): T | null => (x.approved && x.value !== null ? x.value : null);

export type Quote = { quote: string; who: string; approved: boolean };
export type Instructor = { name: string; role: string; years?: number; bio?: string; linkedin?: string; photo?: string };
export type StudentWork = { title: string; image: string; program?: string };

// Commercial switches. Flip to true when the owner confirms the real values in content/programs.ts and content/plans.ts.
export const confirmed = {
  prices: false, // program and plan prices
  schedules: false, // durations, hours, formats, schedules, seats, cohort dates
};

export const content = {
  contact: {
    email: f<string>(),
    phone: f<string>(),
    whatsapp: f<string>(), // digits with country code
    address: f<string>("Fort Worth, TX", true),
    hours: f<string>(), // for example "Mon to Fri, 9 to 5 CT"
    responseTime: f<string>("Within two working days", true),
    bookingUrl: f<string>(), // a scheduling link; shows "Book a 15-minute advisor call" on /contact when set
  },
  social: { linkedin: f<string>() },
  nextCohort: f<string>("January 12, 2027", false), // DRAFT, hidden until approved
  domain: f<string>(),
  testimonials: [
    {
      quote:
        "We spent about 6 months working with Bay BIM Designs to kick start our BIM practice inside our Low Voltage Electrical-Design Build Firm. In that time, we were able to successfully train up our Design team in the use BIM modeling, create an entire suite of custom electrical families, and onboard BIM design into our everyday use at the firm.",
      who: "COO at a Technology Design Firm",
      approved: false, // owner must approve reuse of this client quote
    },
  ] as Quote[],
  instructors: [] as Instructor[],
  studentWork: [] as StudentWork[],
  stats: [] as { label: string; value: number; suffix?: string }[], // add real numbers to show a stats row
};

export const hasInstructors = () => content.instructors.length > 0;
export const hasStudentWork = () => content.studentWork.length > 0;
export const approvedQuotes = () => content.testimonials.filter((t) => t.approved);
