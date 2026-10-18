// All final site copy in one place so the owner can edit it without touching components.
// Rules: confident and specific, short sentences, "you" focused, no hype, no em dashes.
// Headlines 8 words or fewer, leads 22 words or fewer, buttons 1 to 3 words.

export const copy = {
  hero: {
    sheet: "A-000",
    name: "VDC Academy",
    headline: ["Learn BIM the way", "it's built on site."],
    lead: "Live training in Revit, Navisworks and VDC from the engineers at Bay BIM Designs.",
    primary: "Apply now",
    secondary: "Explore programs",
    facts: { programs: (n: number) => `${n} programs`, live: "Live + hands-on", grads: (pct: number) => `Fresh grads save ${pct}%` },
    footer: ["Fort Worth, TX", "32.7555° N, 97.3308° W", "Scroll"],
    modelAlt: "White architectural study model of a seven storey stepped office building, on paper",
  },

  explorer: {
    sheet: "A-101",
    name: "Inside the model",
    title: "Inside the model.",
    hint: "Pick a discipline. Drag to turn.",
    all: { title: "Whole model", text: "Structure, air, water and data in one coordinated model. This is what BIM looks like inside." },
    lodLabel: "Level of development",
    clash: { id: "CLASH #0147", what: "Duct vs beam", open: "Open", resolved: "Resolved" },
    sim: { label: "Construction schedule", week: (w: number, t: number) => `Week ${w} of ${t}` },
    view: "View program",
    modelAlt: "Interactive 3D building. Drag to rotate. Use the list to isolate a discipline.",
  },

  why: {
    sheet: "A-201",
    name: "Why VDC Academy",
    title: "Taught by people who coordinate real projects.",
    lead: "Your instructors run BIM coordination at Bay BIM Designs during the day. You learn what they do.",
    row2: { title: "Practice on real project files", text: "Not demo files. You work in the models our coordinators use, with the same standards and the same deadlines.", caption: "Site walk, level 3 coordination" },
    photo1Alt: "Two engineers in hard hats review a drawing set on a construction site",
    photo2Alt: "Engineer in a hard hat checks a model on a tablet on site",
    dimension: "12 weeks, live",
    benefits: [
      { t: "Live sessions", d: "An instructor in the room, not a video." },
      { t: "Real project files", d: "Models like the ones teams build." },
      { t: "The tools firms use", d: "Revit, Navisworks and ACC, current versions." },
      { t: "A portfolio", d: "Work you can show an employer." },
      { t: "Career support", d: "CV review, interviews, LinkedIn." },
      { t: "A certificate", d: "From VDC Academy by Bay BIM Designs." },
    ],
  },

  programs: {
    sheet: "A-301",
    name: "Programs",
    title: "Pick your track.",
    lead: "Eleven programs, from first model to BIM manager. Start where you are.",
    tabs: ["All", "Foundations", "Modeling", "Coordination", "Construction", "Leadership"],
    note: (pct: number) => `Fresh graduates save up to ${pct}% on every program.`,
    all: (n: number) => `View all ${n} programs`,
  },

  path: {
    sheet: "A-401",
    name: "Learning path",
    title: "Five floors to a BIM career.",
    lead: "Each program sits on a floor. Each floor is a job title.",
    floors: [
      { n: "00", title: "Foundations", role: "BIM Trainee", skills: ["Revit basics", "Views and sheets"] },
      { n: "01", title: "Discipline modeling", role: "BIM Modeler", skills: ["Architecture, structure or MEP", "Custom families"] },
      { n: "02", title: "Coordination", role: "BIM Coordinator", skills: ["Navisworks federation", "Clash reports"] },
      { n: "03", title: "4D and 5D", role: "VDC Engineer", skills: ["Schedule linking", "Quantity takeoff"] },
      { n: "04", title: "Leadership", role: "BIM / VDC Manager", skills: ["Execution plans", "ISO 19650"] },
    ],
    cta: "See the learning path",
  },

  grads: {
    tag: "Offer · FG-40",
    title: "Just graduated? Start here.",
    lines: [
      { k: "Who", v: "Graduated in the last 24 months" },
      { k: "Proof", v: "Your certificate or transcript" },
      { k: "You get", v: "The biggest discount and career support" },
    ],
    primary: "Check if I qualify",
    secondary: "See the offer",
    photoAlt: "Young engineer in a hard hat holding a tablet on a construction site",
    quiz: {
      title: "Check if I qualify",
      year: "When did you graduate?",
      degree: "Your degree",
      submit: "See my result",
      yes: "You qualify for the fresh graduate discount, pending verification.",
      yesNote: "Upload your certificate or transcript with your application.",
      no: (months: number) => `Your graduation date is outside the ${months} month window.`,
      noNote: "You may still qualify for the student discount or the early bird price. Apply and we will check.",
      applyYes: "Apply with my discount",
      applyNo: "Apply anyway",
      again: "Check again",
    },
  },

  closing: {
    title: "Your BIM career starts here.",
    line: "Apply in five short steps. We reply within two working days.",
    primary: "Apply now",
    secondary: "Talk to an advisor",
    modelAlt: "The study model at night, lit floor by floor",
  },

  notFound: {
    sheet: "E-404",
    title: "This page has a clash.",
    text: "The address you followed does not match anything in the model.",
    home: "Back to home",
    programs: "See programs",
  },
};
