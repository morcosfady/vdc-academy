// Copy for the inner pages. Home copy lives in content/copy.ts.
// Rules: confident and specific, short sentences, "you" focused, no hype, no em dashes.
// Headlines 8 words or fewer, leads 22 words or fewer, buttons 1 to 3 words.

// A legal page: sheet number, title, date and sections. Each section has a heading, optional paragraphs (p),
// an optional bullet list (items) and optional paragraphs after the list (after).
export type LegalSection = { h: string; p?: string[]; items?: string[]; after?: string[] };
export type LegalDoc = { sheet: string; title: string; updated: string; sections: LegalSection[] };
const legal = (d: LegalDoc) => d;

export const pages = {
  programs: {
    sheet: "A-300",
    name: "Programs",
    title: "All programs.",
    lead: "Eleven programs from first model to BIM manager. Filter by what you need, compare up to three.",
    filters: {
      button: "Filters",
      drawerTitle: "Filter programs",
      show: (n: number) => `Show ${n} program${n === 1 ? "" : "s"}`,
      reset: "Reset", level: "Level", discipline: "Discipline", format: "Format", software: "Software", all: "All" },
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
    // Shown while no plan price is confirmed (pricesKnown() is false)
    unknown: {
      title: "How pricing works.",
      lead: "Three ways to enroll and four discounts. Prices are being finalized, so request the list and we send it first.",
      how: { title: "Three plan types.", lead: "Every plan includes real project files and a certificate of completion.", bestFor: ["For one skill, learned fast", "For one job title, step by step", "For a career change, start to finish"], note: "Prices are being finalized.", request: "Request the price list" },
      request: {
        title: "Request the price list.",
        lead: "Tell us which program you have in mind and who you are. You get the list as soon as it is final, with the discount that applies to you.",
        program: "Program of interest",
        anyProgram: "Not sure yet",
        who: "I am a",
        statuses: ["Fresh graduate", "Student", "Professional", "Company"],
        button: "Send me the list",
        topic: "Price list request",
        done: "Thank you. The price list is on its way as soon as it is final.",
      },
      schedule: { sheet: "D-01", name: "Discount schedule" },
    },
    discounts: { title: "Discounts.", cols: ["Discount", "Who", "Off", "Proof"], auto: "Automatic by date", note: (stack: boolean) => `Discounts do not stack${stack ? ", except early bird with the fresh graduate discount" : ""}. They stay pending until we check your documents.` },
    calculator: { title: "Your price.", lead: "Choose a program and tell us who you are.", program: "Program", who: "Who are you?", standard: "Standard", early: "I apply 30 or more days before the start", estimate: "Your estimate", none: "No discount", save: "You save", pending: "Pending a check of your documents." },
    faq: {
      title: "Paying for a program.",
      items: [
        { q: "When do I pay?", a: "After you are accepted. Your acceptance message confirms the price, your discount and the payment options before you pay anything." },
        { q: "Can I pay in installments?", a: "We confirm payment options in your acceptance message. Ask your advisor if you need a plan and we will tell you what is possible for your cohort." },
        { q: "What if I do not qualify for the discount I chose?", a: "We tell you before you pay. You can keep your seat at the price that applies to you, or withdraw at no cost." },
        { q: "Is there a refund policy?", a: "We confirm refund terms in your acceptance message, before you pay anything. Nothing is charged until you have read them." },
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
    why: {
      title: "Why start in BIM?",
      points: [
        "Every major project now runs on a coordinated model.",
        "Design firms, contractors and owners all need people who can build and read one.",
        "The path from first model to BIM manager is clear. Each step is a job title.",
      ],
    },
    first90: {
      title: "Your first 90 days.",
      lead: "What a typical path through the fundamentals and coordination programs looks like. Your own pace may differ.",
      tag: "Typical path",
      steps: [
        { k: "Week 01", t: "Revit basics", d: "Levels, grids, walls and your first views and sheets, on a real project file." },
        { k: "Week 04", t: "First coordinated model", d: "Your discipline model linked with the others. You see where things meet." },
        { k: "Week 08", t: "Clash meeting", d: "You run a clash test in Navisworks, write the report and present it to the room." },
        { k: "Week 12", t: "Portfolio review", d: "An instructor reviews your work the way a hiring manager would." },
      ],
      modelCaption: "Study model, level 3 coordination",
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
    heroAlt: "Glass office tower at dusk, the kind of building our coordinators model",
    story: {
      title: "Our story.",
      text: [
        "Bay BIM Designs models, coordinates and simulates buildings for design and construction teams. Every week the studio runs clash meetings, writes execution plans and hands over models that get built. The academy grew out of that work: the same engineers, the same files, the same standards, taught live.",
        "We started it because the first step into BIM is the hardest one. Most training is videos and demo files. Here you model, coordinate and fix real problems with a coordinator in the room. Fresh graduates get our biggest discount because that first step should also be the easiest one to take.",
      ],
    },
    facts: ["Fort Worth, TX", "Part of Bay BIM Designs", "Live, hands-on training"],
    teach: {
      title: "How we teach.",
      lead: "Every program follows the loop a coordinator runs on a real job.",
      steps: [
        { t: "Model", d: "You build your discipline in Revit on a real project file, to the standard the studio uses." },
        { t: "Coordinate", d: "Your model meets the others in Navisworks. Clash tests show where they collide." },
        { t: "Fix", d: "You reroute, resize and re-check until the report is clean, the way it happens on site." },
        { t: "Present", d: "You walk the room through what you found and what you changed." },
      ],
    },
    studio: {
      title: "From the studio to the classroom.",
      lead: "Bay BIM Designs works for three kinds of client. Each one shapes what you practice.",
      cards: [
        {
          t: "AE design firms",
          studio: "Discipline models, families and templates that keep a design team's drawings and model in step.",
          classroom: "You learn the same modeling standards from your first session.",
        },
        {
          t: "GCs and subcontractors",
          studio: "Federated models, clash detection and 4D sequences before anything is built.",
          classroom: "You run the clash meeting yourself and write the report.",
        },
        {
          t: "Owners",
          studio: "Execution plans, model audits and handover data so a building arrives with its information.",
          classroom: "You see how a BIM manager sets the rules a project follows.",
        },
      ],
      studioLabel: "In the studio",
      classroomLabel: "In the classroom",
    },
    values: {
      title: "What we stand for.",
      items: [
        { t: "Hands-on", d: "You learn by modeling, coordinating and fixing real problems, not by watching slides." },
        { t: "Real files", d: "Practice projects are modeled after the work AE firms, contractors and technology teams do every day." },
        { t: "Honest", d: "Clear programs, clear prices, clear discounts. No inflated promises." },
      ],
    },
    location: {
      title: "Where we are.",
      city: "Fort Worth, TX",
      online: "Live online too",
      onlineText: "Every program can be joined live from anywhere. In-person and hybrid sessions run in the Dallas Fort Worth area.",
      instructors: "Who teaches here",
      work: "What you will build",
    },
    cta: { title: "Build your first model with us.", text: "Apply in five short steps. We reply within two working days." },
    visit: "Visit Bay BIM Designs",
    primary: "Apply now",
    secondary: "See programs",
  },

  companies: {
    sheet: "A-801",
    name: "For companies",
    title: "Train your team on your projects.",
    lead: (pct: number) => `Group training from the coordinators at Bay BIM Designs. Groups of three or more save ${pct}%.`,
    primary: "Plan team training",
    secondary: "Talk to an advisor",
    photoAlt: "Three engineers in hard hats review a model on a laptop",
    offers: [
      { t: "Train your team", d: "Revit, Navisworks and coordination skills for your designers, modelers and project engineers." },
      { t: "Build your standards", d: "Custom families, templates and workflows set up for how your firm works." },
      { t: "Bring BIM into daily work", d: "Coordination routines, clash detection and model checks your team can run on its own." },
    ],
    process: {
      title: "How team training works.",
      lead: "Four steps from first call to a team that runs its own coordination.",
      steps: [
        { t: "Discovery call", d: "What your team builds, which software it uses and where the model slows you down." },
        { t: "Skills check", d: "A short practical check per person, so nobody sits through what they already know." },
        { t: "Custom plan", d: "Modules picked from our programs, on your files and your standards, with a schedule." },
        { t: "Live training and support", d: "Sessions with a coordinator, then questions answered while the team applies it." },
      ],
    },
    cover: {
      title: "What we can cover.",
      lead: "Pick the topics your team needs. Every one comes from work the studio does every week.",
      specialty: "Bay BIM specialty",
      items: [
        { t: "Revit standards and templates", d: "Project templates, naming, view and sheet setup." },
        { t: "Custom families", d: "Parametric families and connectors for your products and details." },
        { t: "Navisworks coordination routine", d: "Federation, search sets, viewpoints and a weekly rhythm." },
        { t: "Clash detection workflow", d: "Tests, tolerances, grouping and reports that get resolved." },
        { t: "Model QA/QC", d: "Audits and checks that catch problems before they reach site." },
        { t: "BIM execution plan", d: "Roles, deliverables, LOD and a common data environment." },
        { t: "Low-voltage BIM", d: "Data, security, AV and fire alarm systems modeled and coordinated.", specialty: true },
      ],
    },
    formats: {
      title: "Formats.",
      items: [
        { t: "On site in DFW", d: "At your office in the Dallas Fort Worth area, on your machines and files." },
        { t: "Live online", d: "Screen-shared sessions with a coordinator, anywhere your team sits." },
        { t: "Hybrid", d: "Kick-off and review in person, working sessions online." },
      ],
      size: (pct: number) => `Teams of three or more get the group discount: ${pct}% off.`,
    },
    form: {
      title: "Tell us about your team.",
      text: "Leave your details and we propose a plan within two working days.",
      topic: "Team training",
      button: "Send request",
      company: "Company",
      name: "Your name",
      email: "Work email",
      phone: "Phone (optional)",
      size: "Team size",
      sizes: ["3 to 5", "6 to 10", "11 to 20", "More than 20"],
      topics: "Topics",
      format: "Preferred format",
      formats: ["On site in DFW", "Live online", "Hybrid"],
      message: "Anything else (optional)",
      done: "Thank you. We reply with a proposed plan within two working days.",
      next: { title: "What happens next", steps: ["We read your request and reply within two working days.", "A short discovery call with a coordinator.", "You receive a plan, a schedule and a quote to approve."] },
    },
    quoteSource: "From Bay BIM Designs clients",
    contact: "Prefer to write a message?",
  },

  contact: {
    sheet: "A-900",
    name: "Contact",
    title: "Talk to an advisor.",
    lead: "Questions about programs, discounts or fit? Send a message. We reply within two working days.",
    block: { project: "Project", location: "Location", coords: "Coordinates", partOf: "Part of", email: "Email", phone: "Phone", whatsapp: "WhatsApp", hours: "Office hours", response: "Response time" },
    panel: "How to reach us",
    book: "Book a 15-minute advisor call",
    bookLead: "Prefer to talk?",
    quick: { title: "Quick links", items: [{ href: "/programs", label: "Programs" }, { href: "/fresh-graduates", label: "Fresh grads" }, { href: "/faq", label: "FAQ" }] },
    mapCaption: "Fort Worth, TX. Live online from anywhere.",
  },

  faq: {
    sheet: "A-901",
    name: "FAQ",
    title: "Questions, answered.",
    lead: "Programs, discounts, equipment and applying. If yours is missing, ask an advisor.",
    search: "Search questions",
    tabs: "FAQ categories",
    count: (n: number, total: number) => `${n} of ${total} questions`,
    empty: { title: "No question matches.", text: "Try another word, or ask an advisor and we answer within two working days.", clear: "Clear search" },
    still: { title: "Still have a question?", button: "Talk to an advisor" },
    ask: "Ask an advisor",
  },

  legal: { name: "Legal", updated: (d: string) => `Last updated ${d}` },

  // Legal copy in plain language. Each section: a heading, paragraphs (p), an optional bullet list (items) and
  // optional paragraphs after the list (after). Items the lawyer must confirm are listed in content/TODO-content.md.
  privacy: legal({
    sheet: "L-001",
    title: "Privacy policy",
    updated: "October 2026",
    sections: [
      {
        h: "Who we are",
        p: [
          "VDC Academy is run by Bay BIM Designs in Fort Worth, Texas. This policy explains what we collect when you visit the site, create an account or apply to a program, and what we do with it. Questions go through the contact page or by replying to any email from us.",
        ],
      },
      {
        h: "What we collect",
        p: ["We collect only what the academy needs to review you, run your account and keep in touch:"],
        items: [
          "Account: your name, email and password. The password is stored hashed by Supabase Auth; we never see it. If you sign in with Google, we receive your name, email and the Google account identifier.",
          "Profile: phone, WhatsApp, country, city, age range, language, degree, university, graduation year, LinkedIn and portfolio links, and an optional profile photo.",
          "Application: the programs you choose, format, schedule, experience, software skills, career goal, the discount you ask for, and the files you upload (proof of graduation or student status, and optionally a CV).",
          "Messages and interest forms: your name, email and the message or topic.",
          "Technical: a hashed version of your network address and a bot-check result on each form. We run no analytics that store personal data.",
        ],
      },
      {
        h: "Why we collect it",
        items: [
          "To review your application and contact you about it.",
          "To check discount eligibility (fresh graduate, student, group).",
          "To run your account: show your application status, your documents and your timeline.",
          "To plan cohorts and tell you about start dates you asked about.",
          "To send the emails described below.",
        ],
      },
      {
        h: "Emails we send",
        p: [
          "Transactional emails are always sent: confirming your email, resetting a password, confirming an application, and telling you when its status changes. Marketing emails (new programs, cohort dates, offers) are sent only if you tick the box for them. You can stop them at any time on your profile page or by replying to the email.",
        ],
      },
      {
        h: "Who helps us",
        p: ["We do not sell your data and we share it with nobody except the services that run the site for us:"],
        items: [
          "Supabase hosts the database, the sign-in service and the private file storage (servers in the United States, us-east-1 region).",
          "Resend sends our emails and sees the address and content of each email it delivers.",
          "Cloudflare Turnstile runs the bot check on forms and may process your network address for that purpose.",
          "GitHub Pages serves the site. It stores no personal data from forms.",
        ],
        after: ["Each of these processes data on our instructions under its own privacy terms. We would disclose data beyond this only when the law requires it."],
      },
      {
        h: "How we protect it",
        p: [
          "Every table uses row level security: your account can read and change only your own rows. Only staff with an admin role can see applications. Uploaded files sit in private buckets and are opened through short-lived links. Passwords are never visible to us. Network addresses are hashed before they are stored.",
        ],
      },
      {
        h: "How long we keep it",
        items: [
          "Documents (CVs, proofs, profile photos): while your application is open and for 12 months after a decision, unless you ask us to delete them earlier.",
          "Account and application records: while your account exists.",
          "Messages and interest forms: 24 months.",
        ],
        after: ["After these periods the data is deleted or anonymised."],
      },
      {
        h: "Your choices",
        items: [
          "See and correct your data on your profile page and in your application.",
          "Ask for a copy of everything we hold about you through the contact page.",
          "Delete your account with the button on your profile page. We handle the request within 30 days and confirm by email. Your rows and files are removed together.",
          "Stop marketing emails on your profile page or by replying to one.",
        ],
        after: ["For anything else, use the contact page. We reply within two working days."],
      },
      {
        h: "Changes to this policy",
        p: ["When this policy changes we update the date at the top. If the change matters to you, account holders get an email first."],
      },
    ],
  }),

  terms: legal({
    sheet: "L-002",
    title: "Terms of use",
    updated: "October 2026",
    sections: [
      {
        h: "These terms",
        p: ["Using the site, creating an account or applying to a program means you accept these terms. VDC Academy is run by Bay BIM Designs."],
      },
      {
        h: "Your account",
        items: [
          "One account per person, with accurate information. You must be at least 16 years old.",
          "Keep your password private. What happens in your account is your responsibility; tell us right away if you think someone else used it.",
          "We can suspend an account that abuses the site, submits false documents or tries to reach other people's data.",
          "You can delete your account at any time from your profile page.",
        ],
      },
      {
        h: "Applications",
        items: [
          "Applying does not guarantee a seat. We review each application and reply within two working days. An advisor may contact you before enrollment.",
          "A submitted application can no longer be edited. If something changes, contact us and we update it with you.",
          "Your dashboard shows the status of your application: submitted, under review, interview, accepted, enrolled, waitlist, or not this time.",
          "Everything you tell us and every document you upload must be true and yours.",
        ],
      },
      {
        h: "Discounts",
        p: [
          "Discounts are pending until we verify your document. Fresh graduate: graduated within the last 24 months. Student: currently enrolled. Group: three or more people from the same company. Early bird: applying 30 or more days before the cohort starts. Discounts do not combine, except early bird with the fresh graduate discount. We can withdraw a discount if the document does not match the application.",
        ],
      },
      {
        h: "Documents you upload",
        p: [
          "You confirm you have the right to share each file. We use them only to check eligibility and review your application, and we keep them as described in the privacy policy. Files must be PDF, JPG or PNG up to 5 MB; profile photos up to 2 MB.",
        ],
      },
      {
        h: "Enrollment and payment",
        p: ["Prices, payment options and cohort dates are confirmed in your acceptance message before you pay anything. Nothing is charged until you have read that message and confirmed."],
      },
      {
        h: "Refunds",
        p: ["Refund terms are shared with your acceptance message, before payment."],
      },
      {
        h: "Certificates",
        p: ["A certificate of completion from VDC Academy by Bay BIM Designs is issued when you finish a program."],
      },
      {
        h: "Acceptable use",
        p: ["Do not use bots or scripts on the site, do not scrape it, and do not try to read or change data that is not yours. The forms have a bot check; repeated abuse is blocked."],
      },
      {
        h: "Changes and liability",
        p: [
          "We can change programs, schedules and prices before you enroll; what you agreed to in your acceptance message stands. The site is provided as is. When these terms change we update the date at the top. These terms are governed by the laws of the State of Texas.",
        ],
      },
    ],
  }),

  instructors: {
    sheet: "A-802",
    name: "Instructors",
    emptyTitle: "Who teaches here.",
    emptyLead: "Working BIM coordinators and VDC engineers from Bay BIM Designs. Names and profiles are published with the first cohort.",
    profile: {
      title: "The instructor profile.",
      text: [
        "Every instructor works at Bay BIM Designs during the day. A typical week means a clash meeting with a general contractor, a model audit for an owner, a family library for a design firm and an execution plan that a project will follow for two years.",
        "They teach what they did that week. When you ask why a duct was rerouted or why a naming rule exists, the answer comes from a job, not a textbook.",
      ],
      weekLabel: "A typical week",
      week: ["Clash meetings with GCs and subcontractors", "Model audits and QA/QC for owners", "Families and templates for design firms", "4D sequences and execution plans"],
    },
    roles: {
      title: "Who you will learn from.",
      items: [
        { t: "BIM Coordinator", d: "Federates the models, runs the clash tests and keeps the weekly meeting honest." },
        { t: "VDC Engineer", d: "Links the model to schedule and cost, builds the 4D sequence and the quantities behind it." },
        { t: "BIM Manager", d: "Writes the execution plan, sets the standards and audits the model before handover." },
      ],
    },
    teach: {
      title: "Want to teach with us?",
      lead: "If you coordinate models for a living and like explaining why, tell us about yourself.",
      name: "Name",
      email: "Email",
      linkedin: "LinkedIn URL (optional)",
      message: "What you do and what you would teach",
      button: "Send",
      topic: "Teach with us",
      done: "Thank you. We read every message and reply within two working days.",
    },
    title: "Learn from working professionals.",
    years: (n: number) => `${n} years`,
  },

  studentWork: {
    sheet: "A-803",
    name: "Student work",
    emptyTitle: "What you will build.",
    emptyLead: "Four example projects from the programs. Projects from the first cohort appear here.",
    firstCohort: "Projects from the first cohort appear here.",
    exampleTag: "Example project",
    examples: [
      { slug: "vdc-professional-bootcamp", t: "Coordinated 3-storey office model", d: "Architecture, structure and MEP modeled in Revit and federated in Navisworks." },
      { slug: "navisworks-clash-detection", t: "MEP clash report", d: "Clash tests between ducts, pipes, trays and structure, grouped, tracked and resolved." },
      { slug: "4d-5d-simulation", t: "4D construction sequence", d: "The model linked to a schedule and played back floor by floor." },
      { slug: "revit-family-creation", t: "Custom family library", d: "Parametric families with types, formulas and MEP connectors." },
    ],
    program: "From the program",
    title: "Models built by our students.",
  },

  empty: { primary: "Apply now", secondary: "See programs" },
};
