// Email templates in the brand: paper background, ink text, Poppins with a system fallback, a mono "sheet tag"
// line, one blueprint button, hairlines, and the footer "VDC Academy · a Bay BIM Designs company".
// Plain template functions (no React Email: the static repo has no build step for it). Every email has an HTML
// and a plain-text version. No em dashes.
import type { Status } from "./validate.ts";

export type Row = [label: string, value: string];
export type Email = { subject: string; html: string; text: string };

export type Sheet = {
  tag: string; // "S-100 · APPLICATION RECEIVED"
  title: string;
  intro: string[];
  rows?: Row[];
  steps?: string[];
  button?: { label: string; href: string };
  links?: { label: string; href: string }[]; // quieter text links under the button
  outro?: string[];
};

// Palette (app/globals.css): paper #F6F4EF, paper-2 #ECEAE3, ink #0A1D23, blueprint #2A63C4, brass #B8925A, slate #365B62.
const C = { paper: "#F6F4EF", paper2: "#ECEAE3", ink: "#0A1D23", ink3: "#52666D", blueprint: "#2A63C4", brass: "#B8925A", slate: "#365B62", line: "#D8D4CB" };
const FONT = "Poppins, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif";
const MONO = "'IBM Plex Mono', Menlo, Consolas, monospace";
const FOOTER = "VDC Academy · a Bay BIM Designs company";

export const esc = (s: unknown) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c);

const p = (t: string) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:${C.ink}">${esc(t)}</p>`;

function rowsHtml(rows: Row[]) {
  const cells = rows
    .filter(([, v]) => v !== "")
    .map(
      ([k, v]) =>
        `<tr><td style="padding:8px 16px 8px 0;font-family:${MONO};font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:${C.slate};vertical-align:top;white-space:nowrap;border-top:1px solid ${C.line}">${esc(k)}</td>` +
        `<td style="padding:8px 0;font-size:14px;line-height:1.5;color:${C.ink};border-top:1px solid ${C.line}">${esc(v)}</td></tr>`,
    )
    .join("");
  return cells ? `<table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%;margin:8px 0 18px;border-bottom:1px solid ${C.line}">${cells}</table>` : "";
}

function stepsHtml(steps: string[]) {
  return `<ol style="margin:4px 0 18px;padding-left:22px;font-size:15px;line-height:1.6;color:${C.ink}">${steps.map((s) => `<li style="margin:0 0 6px">${esc(s)}</li>`).join("")}</ol>`;
}

function buttonHtml(b: { label: string; href: string }) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:6px 0 22px"><tr><td style="background:${C.blueprint};border-radius:4px">` +
    `<a href="${esc(b.href)}" style="display:inline-block;padding:12px 22px;font-family:${FONT};font-size:14px;font-weight:600;color:#FFFFFF;text-decoration:none">${esc(b.label)}</a></td></tr></table>`;
}

function linksHtml(links: { label: string; href: string }[]) {
  return links
    .map((l) => `<p style="margin:0 0 10px;font-size:14px;line-height:1.6"><a href="${esc(l.href)}" style="color:${C.blueprint};font-weight:600;text-decoration:underline">${esc(l.label)}</a></p>`)
    .join("");
}

export function render(sheet: Sheet): { html: string; text: string } {
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600&display=swap" rel="stylesheet"><title>${esc(sheet.title)}</title></head>
<body style="margin:0;padding:28px 12px;background:${C.paper2}">
<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;max-width:560px;margin:0 auto;background:${C.paper};border:1px solid ${C.line};font-family:${FONT}">
<tr><td style="padding:28px 32px 0">
<p style="margin:0 0 6px;font-family:${MONO};font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:${C.slate}">${esc(sheet.tag)}</p>
<div style="height:2px;width:40px;background:${C.brass};margin:0 0 20px"></div>
<h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;font-weight:600;color:${C.ink}">${esc(sheet.title)}</h1>
${sheet.intro.map(p).join("")}
${sheet.steps ? stepsHtml(sheet.steps) : ""}
${sheet.rows ? rowsHtml(sheet.rows) : ""}
${sheet.button ? buttonHtml(sheet.button) : ""}
${sheet.links ? linksHtml(sheet.links) : ""}
${(sheet.outro ?? []).map(p).join("")}
</td></tr>
<tr><td style="padding:16px 32px 24px;border-top:1px solid ${C.line}">
<p style="margin:0;font-family:${MONO};font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:${C.ink3}">${esc(FOOTER)}</p>
<p style="margin:6px 0 0;font-size:12px;line-height:1.5;color:${C.ink3}">You receive this because of an account or a form on the VDC Academy site. Reply to this email to reach us.</p>
</td></tr>
</table>
</body></html>`;

  const lines: string[] = [sheet.tag, "", sheet.title, "", ...sheet.intro.flatMap((t) => [t, ""])];
  if (sheet.steps) lines.push(...sheet.steps.map((s, i) => `${i + 1}. ${s}`), "");
  if (sheet.rows) lines.push(...sheet.rows.filter(([, v]) => v !== "").map(([k, v]) => `${k}: ${v}`), "");
  if (sheet.button) lines.push(`${sheet.button.label}: ${sheet.button.href}`, "");
  if (sheet.links) lines.push(...sheet.links.map((l) => `${l.label}: ${l.href}`), "");
  if (sheet.outro) lines.push(...sheet.outro.flatMap((t) => [t, ""]));
  lines.push("--", FOOTER);
  return { html, text: lines.join("\n") };
}

const list = (items: string[]) => (items.length === 0 ? "the programs you chose" : items.length === 1 ? items[0] : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`);

export const DISCOUNT_LABEL: Record<string, string> = { freshGrad: "Fresh graduate", student: "Current student", group: "Group" };

// 1. Student: the application was received.
export function applicationReceived(a: { firstName: string; programs: string[]; discountType: string; discountPercent: number; accountUrl: string }): Email {
  const discount = a.discountType ? `${DISCOUNT_LABEL[a.discountType] ?? a.discountType}, ${a.discountPercent}% off. We check your proof within two working days.` : "";
  const sheet: Sheet = {
    tag: "S-100 · APPLICATION RECEIVED",
    title: `Thank you, ${a.firstName}. Your application is in.`,
    intro: [`You applied for ${list(a.programs)}. Here is what happens next.`],
    steps: [
      "We review your application within two working days.",
      "An advisor emails or calls to confirm fit and answer your questions.",
      "You get the price, any discount and the payment options in writing.",
      "You join your cohort and build your first model.",
    ],
    rows: [["Programs", a.programs.join(", ")], ["Discount", discount]],
    button: { label: "Open your dashboard", href: a.accountUrl },
    outro: ["Your dashboard shows every step of your application. Reply to this email if anything changes."],
  };
  return { subject: "We received your VDC Academy application", ...render(sheet) };
}

// 2. Admin: a new application, with a link to the admin page.
export function adminNewApplication(a: { name: string; programs: string[]; rows: Row[]; botCheck: string; adminUrl: string }): Email {
  const sheet: Sheet = {
    tag: "S-101 · NEW APPLICATION",
    title: `New application from ${a.name || "an applicant"}`,
    intro: [`Programs: ${a.programs.join(", ") || "none chosen"}. Bot check: ${a.botCheck}.`],
    rows: a.rows,
    button: { label: "Open in admin", href: a.adminUrl },
    outro: ["Reply to this email to answer the applicant directly."],
  };
  return { subject: `New application: ${a.name || "applicant"} (${a.programs[0] ?? "no program"})`, ...render(sheet) };
}

// 3. Student: a status changed. Calm wording, one next step, a link to the dashboard.
type StatusCopy = { tag: string; subject: string; title: string; intro: string[]; outro: string[] };

export function statusCopy(status: Status, firstName: string, programs: string[]): StatusCopy {
  const prog = list(programs);
  switch (status) {
    case "submitted":
      return {
        tag: "S-200 · SUBMITTED",
        subject: "Your application is in the queue",
        title: `${firstName}, your application is back in the queue.`,
        intro: [`Your application for ${prog} is marked as submitted. We review it within two working days.`],
        outro: ["Nothing to do on your side. Your dashboard shows the next step as soon as it changes."],
      };
    case "under_review":
      return {
        tag: "S-210 · UNDER REVIEW",
        subject: "We are reviewing your application",
        title: `${firstName}, we are reading your application.`,
        intro: [`An advisor is reviewing your application for ${prog}. This usually takes a few working days. If we need a detail, we email you.`],
        outro: ["If you uploaded a discount proof, it is checked in the same pass."],
      };
    case "interview":
      return {
        tag: "S-220 · INTERVIEW",
        subject: "Let us talk about your application",
        title: `${firstName}, we would like to talk.`,
        intro: [`The next step for ${prog} is a 20-minute conversation with an advisor. We email or call you to set a time that suits you.`],
        outro: ["Nothing to prepare. Bring your questions about the schedule, the software and the work after the program."],
      };
    case "accepted":
      return {
        tag: "S-230 · ACCEPTED",
        subject: "You have a seat at VDC Academy",
        title: `${firstName}, you have a seat.`,
        intro: [`Your application for ${prog} is accepted. Your acceptance message with the price, your discount, the payment options and the refund terms follows separately.`],
        outro: ["Nothing is charged until you have read that message and confirmed."],
      };
    case "enrolled":
      return {
        tag: "S-240 · ENROLLED",
        subject: "You are enrolled",
        title: `${firstName}, you are enrolled.`,
        intro: [`Welcome to ${prog}. Your cohort date, the schedule and the laptop checklist arrive before the first session.`],
        outro: ["Your dashboard shows your cohort and your documents in one place."],
      };
    case "waitlist":
      return {
        tag: "S-250 · WAITLIST",
        subject: "You are on the waitlist",
        title: `${firstName}, you are on the waitlist.`,
        intro: [`This cohort of ${prog} is full. You are on the waitlist, and you hear from us first when a seat opens or when the next cohort is scheduled.`],
        outro: ["Nothing else to do. Your place on the list is kept."],
      };
    case "rejected":
      return {
        tag: "S-260 · DECISION",
        subject: "About your VDC Academy application",
        title: `${firstName}, thank you for applying.`,
        intro: [`We cannot offer you a seat in this intake of ${prog}. This is about the fit for this program and this intake, not about your potential.`],
        outro: ["If you want, reply to this email and an advisor will suggest a program that fits better, or the next intake."],
      };
    default:
      return {
        tag: "S-200 · UPDATE",
        subject: "Your application was updated",
        title: `${firstName}, your application was updated.`,
        intro: [`There is a change on your application for ${prog}.`],
        outro: ["Your dashboard shows the details."],
      };
  }
}

export function statusChanged(status: Status, a: { firstName: string; programs: string[]; accountUrl: string }): Email {
  const c = statusCopy(status, a.firstName, a.programs);
  const sheet: Sheet = { tag: c.tag, title: c.title, intro: c.intro, button: { label: "Open your dashboard", href: a.accountUrl }, outro: c.outro };
  return { subject: c.subject, ...render(sheet) };
}

// 4. Admin: a lead or a contact message.
export function adminLead(a: { table: "leads" | "contact_messages"; name: string; rows: Row[]; botCheck: string; adminUrl: string }): Email {
  const isMessage = a.table === "contact_messages";
  const sheet: Sheet = {
    tag: isMessage ? "S-310 · NEW MESSAGE" : "S-300 · NEW LEAD",
    title: isMessage ? `Message from ${a.name || "a visitor"}` : `New lead: ${a.name || "a visitor"}`,
    intro: [`From the ${isMessage ? "contact form" : "site forms"}. Bot check: ${a.botCheck}.`],
    rows: a.rows,
    button: { label: "Open the inbox", href: a.adminUrl },
    outro: ["Reply to this email to answer directly."],
  };
  return { subject: isMessage ? `Contact message from ${a.name || "a visitor"}` : `New lead: ${a.name || "a visitor"}`, ...render(sheet) };
}

// v9 account emails ------------------------------------------------------------------------------------------
// Labels for the stored recruiter keys (the same as lib/signupSchema.ts; the functions cannot import the site).
export const COMPANY_TYPE_LABEL: Record<string, string> = {
  ae_firm: "AE design firm",
  general_contractor: "General contractor",
  subcontractor: "Subcontractor (MEP, low voltage, etc.)",
  owner_developer: "Owner / developer",
  bim_consultancy: "BIM consultancy",
  other: "Other",
};
export const COMPANY_SIZE_LABEL: Record<string, string> = { "1-10": "1 to 10", "11-50": "11 to 50", "51-200": "51 to 200", "201-1000": "201 to 1000", "1000+": "1000+" };
export const HIRING_ROLE_LABEL: Record<string, string> = {
  bim_modeler: "BIM Modeler",
  bim_coordinator: "BIM Coordinator",
  vdc_engineer: "VDC Engineer",
  bim_manager: "BIM Manager",
  revit_drafter: "Revit Drafter",
  other: "Other",
};
export const EXPECTED_HIRES_LABEL: Record<string, string> = { "1": "1", "2-5": "2 to 5", "6-10": "6 to 10", "10+": "10+" };
export const labelOf = (map: Record<string, string>, v: unknown) => {
  const k = v === null || v === undefined ? "" : String(v);
  return map[k] ?? k;
};

// 5. Student: welcome after the email is confirmed.
export function welcomeStudent(a: { firstName: string; programsUrl: string; applyUrl: string; accountUrl: string }): Email {
  const sheet: Sheet = {
    tag: "S-010 · WELCOME",
    title: `Welcome, ${a.firstName}. Your account is open.`,
    intro: ["Your email is confirmed and your VDC Academy account is ready. Here is how to start."],
    steps: [
      "Look through the programs and pick the one that fits where you want to work.",
      "Apply in five short steps. Your answers save as you go, so you can stop and come back.",
      "Follow your application on your dashboard. We reply within two working days.",
    ],
    button: { label: "See the programs", href: a.programsUrl },
    links: [
      { label: "Start your application", href: a.applyUrl },
      { label: "Open your dashboard", href: a.accountUrl },
    ],
    outro: ["Questions before you apply? Reply to this email and an advisor answers."],
  };
  return { subject: "Welcome to VDC Academy", ...render(sheet) };
}

// 6. Recruiter: welcome, the company account is under review.
export function welcomeRecruiter(a: { firstName: string; company: string; accountUrl: string }): Email {
  const company = a.company || "your company";
  const sheet: Sheet = {
    tag: "S-020 · COMPANY ACCOUNT",
    title: `Welcome, ${a.firstName}. Your company account is under review.`,
    intro: [`Your email is confirmed. We check every company account by hand before it is verified, and we are looking at ${company} now.`],
    steps: [
      "We review your company details, usually within one or two working days.",
      "You get an email as soon as the account is verified.",
      "Your dashboard shows the review status and your company details in the meantime.",
    ],
    button: { label: "Open your dashboard", href: a.accountUrl },
    outro: ["If we need anything else to verify the company, we email you. You can also reply to this email."],
  };
  return { subject: "Your VDC Academy company account is under review", ...render(sheet) };
}

// 7. Academy team (admin or super admin): access is active.
export function welcomeTeam(a: { firstName: string; adminUrl: string }): Email {
  const sheet: Sheet = {
    tag: "S-030 · TEAM ACCESS",
    title: `${a.firstName}, your team access is active.`,
    intro: ["Your email is confirmed and your account has VDC Academy team access: applications, recruiters, leads and messages are in the admin."],
    button: { label: "Open the admin", href: a.adminUrl },
    outro: ["If you did not expect team access, reply to this email right away."],
  };
  return { subject: "Your VDC Academy team access is active", ...render(sheet) };
}

// 8. Admin: a recruiter confirmed their email and waits for verification.
export function adminNewRecruiter(a: { company: string; name: string; rows: Row[]; adminUrl: string }): Email {
  const company = a.company || "a company";
  const sheet: Sheet = {
    tag: "S-120 · NEW RECRUITER",
    title: `New recruiter to review: ${company}`,
    intro: [`${a.name || "A recruiter"} confirmed their email. Check the company before you approve or reject the account.`],
    rows: a.rows,
    button: { label: "Review recruiters", href: a.adminUrl },
    outro: ["Reply to this email to write to the recruiter directly."],
  };
  return { subject: `New recruiter to review: ${company}`, ...render(sheet) };
}

// 9. Recruiter: the company account is verified.
export function recruiterApproved(a: { firstName: string; company: string; accountUrl: string }): Email {
  const company = a.company || "Your company";
  const sheet: Sheet = {
    tag: "S-130 · VERIFIED",
    title: `${a.firstName}, your company account is verified.`,
    intro: [`${company} is now verified on VDC Academy. You can send hiring requests from your dashboard, and we match them with our graduates.`],
    button: { label: "Open your dashboard", href: a.accountUrl },
    outro: ["Reply to this email if you want to talk through a role before you send it."],
  };
  return { subject: "Your company account is verified", ...render(sheet) };
}

// 10. Recruiter: the company account could not be verified. The admin's note is shown when there is one.
export function recruiterRejected(a: { firstName: string; note: string; contactUrl: string }): Email {
  const sheet: Sheet = {
    tag: "S-140 · DECISION",
    title: `${a.firstName}, we could not verify your company account.`,
    intro: ["We review every company account by hand, and we could not verify this one."],
    rows: a.note ? [["Note from the team", a.note]] : undefined,
    button: { label: "Contact us", href: a.contactUrl },
    outro: ["If something is missing or has changed, contact us or reply to this email and we look again."],
  };
  return { subject: "About your VDC Academy company account", ...render(sheet) };
}

// 11. Student: a recruiter's evaluation was published. No company, no scores, no private note: the dashboard has them.
export function evaluationPublished(a: { firstName: string; accountUrl: string }): Email {
  const sheet: Sheet = {
    tag: "S-130 · EVALUATION",
    title: `${a.firstName}, a recruiter evaluated your work.`,
    intro: ["A verified recruiter wrote an evaluation of your work, and the academy team has published it. It is on your dashboard now."],
    button: { label: "Read the evaluation", href: a.accountUrl },
    outro: ["Only verified recruiters can see your profile, and only because you chose to share it. You can turn that off any time on your profile page."],
  };
  return { subject: "A recruiter evaluated your work", ...render(sheet) };
}
