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
