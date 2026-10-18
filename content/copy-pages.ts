// Copy for the inner pages. Home copy lives in content/copy.ts.
// Rules: confident and specific, short sentences, "you" focused, no hype, no em dashes.
// Headlines 8 words or fewer, leads 22 words or fewer, buttons 1 to 3 words.

export const pages = {
  programs: {
    sheet: "A-300",
    name: "Programs",
    title: "All programs.",
    lead: "Eleven programs from first model to BIM manager. Filter by what you need, compare up to three.",
    filters: { level: "Level", discipline: "Discipline", format: "Format", software: "Software", all: "All" },
    count: (n: number, total: number) => `${n} of ${total} programs`,
    clear: "Clear filters",
    empty: "No program matches every filter. Clear one to see more.",
    compare: {
      add: "Compare",
      full: "Three selected",
      tray: (n: number) => `${n} of 3 selected`,
      open: "Compare",
      close: "Hide table",
      clear: "Clear",
      remove: (t: string) => `Remove ${t}`,
      rows: { duration: "Duration", hours: "Hours", level: "Level", format: "Format", software: "Software", price: "Price", cohort: "Next cohort" },
      onRequest: "On request",
      title: "Side by side",
    },
  },

  program: {
    facts: { weeks: (n: number) => `${n} weeks`, hours: (n: number) => `${n} hours live` },
    outcomes: "What you will learn",
    modules: "Modules",
    software: "Software",
    build: "You will build",
    details: "Details",
    prerequisites: "Prerequisites",
    certificate: "Certificate",
    enroll: {
      label: "Enrollment",
      toggle: "I graduated in the last 24 months",
      full: "Full price",
      save: (pct: number) => `Fresh graduate price, ${pct}% off`,
      pending: "Discount pending verification of your certificate or transcript.",
      onRequest: "Price on request",
      onRequestNote: "We send the price with your acceptance message.",
      cohort: "Next cohort",
      seats: "Seats",
      schedule: "Schedule",
      apply: "Apply now",
      ask: "Ask a question",
    },
    related: "Related programs",
    all: "All programs",
    modelAlt: (d: string) => `White study model with the ${d} systems isolated`,
  },

  pricing: {
    sheet: "A-500",
    name: "Pricing",
    title: "Simple plans.",
    lead: "Pick a plan and see what you pay. Fresh graduates save 40% on every one.",
    toggle: "I graduated in the last 24 months",
    recommended: "Recommended",
    was: "Full price",
    pending: "Fresh graduate discount, pending verification",
    onRequest: "Price on request",
    apply: "Apply",
    finalizing: { title: "Pricing is being finalized.", text: "Apply to get the price list first, or leave your email and we will send it.", topic: "Send me the price list", button: "Send price list" },
    discounts: { title: "Discounts.", cols: ["Discount", "Who", "Off", "Proof"], auto: "Automatic by date", note: (stack: boolean) => `Discounts do not stack${stack ? ", except early bird with the fresh graduate discount" : ""}. They stay pending until we check your documents.` },
    calculator: { title: "Your price.", lead: "Choose a program and tell us who you are.", program: "Program", who: "Who are you?", standard: "Standard", early: "I apply 30 or more days before the start", estimate: "Your estimate", none: "No discount", save: "You save", pending: "Pending a check of your documents." },
    faq: {
      title: "Paying for a program.",
      items: [
        { q: "When do I pay?", a: "After you are accepted. Your acceptance message confirms the price, your discount and the payment options before you pay anything." },
        { q: "Can I pay in installments?", a: "Payment options are confirmed per cohort in your acceptance message. Ask your advisor if you need a plan." },
        { q: "What if I do not qualify for the discount I chose?", a: "We tell you before you pay. You can keep your seat at the price that applies to you, or withdraw at no cost." },
        { q: "Is there a refund policy?", a: "Yes. Refund terms are shared with your acceptance message, before payment." },
        { q: "Can my company pay?", a: "Yes. We invoice companies directly. Groups of three or more from one company also get the group discount." },
      ],
    },
  },

  grads: {
    sheet: "FG-40",
    name: "Fresh graduates",
    title: "Just graduated? Start here.",
    lead: (pct: number, months: number) => `Graduated in the last ${months} months? You get our biggest discount: ${pct}% off every program.`,
    off: "off every program",
    primary: "Check if I qualify",
    secondary: "Apply now",
    photoAlt: "Young engineer in a hard hat holding a tablet on a construction site",
    eligibility: { title: "Who qualifies.", lead: "Four discounts. One applies to you, and early bird can stack with the fresh graduate offer.", cols: ["Who", "Proof", "Off"], auto: "Automatic by date" },
    how: {
      title: "How it works.",
      steps: [
        { t: "Apply", d: "Fill in the five short steps and pick your program." },
        { t: "Upload proof", d: "Add your graduation certificate or transcript. PDF, JPG or PNG up to 5 MB." },
        { t: "We check it", d: "We review it within 1 to 2 business days and confirm your discount in writing." },
      ],
    },
    faq: {
      title: "Questions.",
      items: (months: number) => [
        { q: "Who counts as a fresh graduate?", a: `Anyone who graduated within the last ${months} months, from any degree. Engineering, architecture and construction degrees are the best fit.` },
        { q: "What proof do I need?", a: "Your graduation certificate or an official transcript, as a PDF, JPG or PNG up to 5 MB." },
        { q: "Can I combine it with another discount?", a: "Early bird can stack with the fresh graduate discount. Other discounts do not combine." },
        { q: "When do I know if I got it?", a: "Your discount stays pending until we check your document. We reply within 1 to 2 business days." },
        { q: "I graduate next year. Can I apply now?", a: "Yes. Apply as a current student. If you graduate before the cohort starts, tell us and we switch you to the fresh graduate price." },
      ],
    },
  },

  path: {
    sheet: "A-400",
    name: "Learning path",
    title: "From first model to VDC manager.",
    lead: "Each program sits on a floor. Each floor is a job title. Start where you are.",
    floors: { title: "Programs by floor.", lead: "Every program on the path, floor by floor.", floor: (n: number) => `Floor ${String(n).padStart(2, "0")}` },
  },

  apply: {
    sheet: "A-700",
    name: "Apply",
    steps: ["About you", "Education", "Experience", "Program", "Review"],
    floors: (n: number) => `${n} of 5 floors built`,
    modelAlt: "Study model that gains one floor for each completed step",
    resume: { q: "Resume where you left off?", yes: "Resume", no: "Start over" },
    back: "Back",
    next: "Continue",
    submit: "Submit application",
    sending: "Sending",
    fallback: { title: "Applications open soon.", text: "Leave your name and email and we will tell you the moment they open", topic: "Notify me when applications open", button: "Notify me", explore: "Explore programs" },
  },

  success: {
    sheet: "A-701",
    name: "Application received",
    title: (name?: string) => `Thank you${name ? `, ${name}` : ""}.`,
    program: (p: string) => `Your application for ${p} is in.`,
    discount: "Your discount is pending verification of your document.",
    nextTitle: "What happens next",
    next: [
      { t: "We review", d: "Within 1 to 2 business days." },
      { t: "Advisor call", d: "A short call to confirm fit and answer your questions." },
      { t: "Enroll and pay", d: "You get the price, discount and payment options in writing." },
      { t: "Start learning", d: "Join your cohort and build your first model." },
    ],
    home: "Back to home",
    modelAlt: "The finished study model, all floors built",
  },

  about: {
    sheet: "A-800",
    name: "About",
    title: "Built by people who build models.",
    lead: "VDC Academy is the training arm of Bay BIM Designs, a BIM and VDC studio in Fort Worth, TX.",
    story: [
      "Bay BIM Designs models, coordinates and simulates buildings for design and construction teams. Every week the studio runs clash meetings, writes execution plans and hands over models that get built. The academy grew out of that work: the same engineers, the same files, the same standards, taught live.",
      "We started the academy because the first step into BIM is the hardest one. Most training is videos and demo files. You learn here by modeling, coordinating and fixing real problems, with a coordinator in the room. Fresh graduates get our biggest discount because that first step should also be the easiest one to take.",
    ],
    facts: ["Fort Worth, TX", "Part of Bay BIM Designs", "Live, hands-on training"],
    values: {
      title: "What we stand for.",
      items: [
        { t: "Hands-on", d: "You learn by modeling, coordinating and fixing real problems, not by watching slides." },
        { t: "Real files", d: "Practice projects are modeled after the work AE firms, contractors and technology teams do every day." },
        { t: "Honest", d: "Clear programs, clear prices, clear discounts. No inflated promises." },
      ],
    },
    visit: "Visit Bay BIM Designs",
    primary: "Apply now",
    secondary: "See programs",
  },

  companies: {
    sheet: "A-801",
    name: "For companies",
    title: "Train your team on your projects.",
    lead: (pct: number) => `Group training from the coordinators at Bay BIM Designs. Groups of three or more save ${pct}%.`,
    offers: [
      { t: "Train your team", d: "Revit, Navisworks and coordination skills for your designers, modelers and project engineers." },
      { t: "Build your standards", d: "Custom families, templates and workflows set up for how your firm works." },
      { t: "Bring BIM into daily work", d: "Coordination routines, clash detection and model checks your team can run on its own." },
    ],
    form: { title: "Tell us about your team.", text: "Leave your details and we propose a plan within two working days.", topic: "Team training", button: "Contact me" },
    quoteSource: "From Bay BIM Designs clients",
    contact: "Prefer to write a message?",
  },

  contact: {
    sheet: "A-900",
    name: "Contact",
    title: "Talk to an advisor.",
    lead: "Questions about programs, discounts or fit? Send a message. We reply within two working days.",
    block: { project: "Project", location: "Location", coords: "Coordinates", partOf: "Part of", email: "Email", phone: "Phone" },
  },

  faq: {
    sheet: "A-901",
    name: "FAQ",
    title: "Questions, answered.",
    lead: "Programs, discounts, equipment and applying. If yours is missing, ask an advisor.",
    more: [
      { q: "How do I apply?", a: "Use the Apply button. It takes five short steps: about you, your education, your experience, the program you want, and a review." },
      { q: "What files can I upload?", a: "Your graduation certificate or student ID, and optionally a CV. PDF, JPG or PNG for proof, PDF or DOC for a CV, up to 5 MB each." },
      { q: "Are programs online or in person?", a: "Formats are being confirmed per program. The application lets you choose online, in person in Fort Worth, TX, or hybrid." },
      { q: "Do you issue a certificate?", a: "Yes. You receive a certificate of completion from VDC Academy by Bay BIM Designs." },
      { q: "Can my company train a team?", a: "Yes. See the For Companies page or contact us." },
    ],
    ask: "Ask an advisor",
  },

  legal: { name: "Legal", updated: (d: string) => `Last updated ${d}` },

  instructors: {
    sheet: "A-802",
    name: "Instructors",
    emptyTitle: "Coming with our first cohort.",
    emptyLead: "Your instructors run BIM coordination at Bay BIM Designs during the day. Names and profiles are published with the first cohort.",
    title: "Learn from working professionals.",
    years: (n: number) => `${n} years`,
  },

  studentWork: {
    sheet: "A-803",
    name: "Student work",
    emptyTitle: "Coming with our first cohort.",
    emptyLead: "Student models and coordination projects are published here after the first cohort finishes.",
    title: "Models built by our students.",
  },

  empty: { primary: "Apply now", secondary: "See programs" },
};
