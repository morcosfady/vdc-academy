// Apply-specific copy that is not in content/copy-pages.ts. Plain words, no em dashes.
export const applyCopy = {
  fallback: {
    title: "Applications open soon.",
    lead: "Leave your email and we will notify you.",
    note: "Your application was not sent. Your answers stay saved in this browser, so you can come back and submit when applications open.",
    noteIdle: "Applications are not connected on this site yet. Nothing is saved here until they are.",
    back: "Back to your answers",
  },
  honeypot: "website",

  // The gate: /apply when the visitor has no account yet. Sign up and log in inline, no page jump.
  gate: {
    title: "Create an account to apply and track your status.",
    lead: "Your answers save as you go. Come back any time, from any device, and see where your application stands.",
    tabsLabel: "Account",
    tabs: { signup: "Sign up", login: "Log in" },
    fields: { name: "Full name", email: "Email", password: "Password", status: "Current status" },
    passwordHint: "At least 8 characters.",
    consent: "I agree to the Privacy Policy and Terms. *",
    marketing: "Send me news about new cohorts (optional).",
    create: "Create account",
    creating: "Creating",
    login: "Log in",
    loggingIn: "Logging in",
    magic: "Email me a link",
    magicSent: "Check your email for a link to log in, then come back here.",
    checkEmail: "Check your email, then come back here.",
    checkEmailNote: (email: string) => `We sent a confirmation link to ${email}. Open it and this page picks up where you left off.`,
    fullPages: { before: "Prefer a full page?", signup: "Sign up", between: "or", login: "log in", after: "there instead." },
    perks: ["Save and finish later", "Track every status change", "Upload documents securely"],
    modelAlt: "White study model of the stepped office building",
    modelCaption: "Your application, built floor by floor",
    submitFirst: "Create an account or log in to submit your application. Your answers are kept.",
    errors: {
      name: "Please enter your full name.",
      email: "Please enter a valid email address.",
      password: "Please use at least 8 characters.",
      status: "Please choose your status.",
      consent: "Please agree to the Privacy Policy and Terms.",
      exists: "An account with this email already exists. Log in instead.",
      wrong: "That email and password do not match.",
      unconfirmed: "Please confirm your email first. The link is in your inbox.",
      generic: "Something went wrong. Please try again.",
    },
  },

  draft: {
    restored: "We restored your draft.",
    saving: "Saving",
    saved: "Draft saved",
    failed: "We could not save your draft. Your answers stay in this browser.",
    later: "Save and finish later",
    startOver: "Start over",
  },

  duplicate: {
    title: "You already applied for this program.",
    lead: (titles: string) => `Your application for ${titles} is in progress. One application per program is enough; we will be in touch about it.`,
    view: "View your application",
    change: "Pick a different program above, or remove this one, to continue.",
  },

  submit: {
    tooFast: "Please wait a few seconds before trying again.",
    upload: "A file could not be uploaded. Please try again.",
    failed: "We could not save your application. Please try again.",
  },

  success: { dashboard: "Go to your dashboard" },
} as const;
