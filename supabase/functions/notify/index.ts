// Supabase Edge Function `notify`. Called by Database Webhooks on INSERT into applications, leads and contact_messages.
// 1. Checks the webhook secret. 2. Verifies the Cloudflare Turnstile token and records the result (spam rows get
//    no email). 3. Sends emails with Resend: a confirmation to the person and a summary to the academy admin.
//
// Secrets (never in the repo; set with `supabase secrets set ...` or Dashboard > Edge Functions > Secrets):
//   RESEND_API_KEY        Resend API key (re_...)
//   EMAIL_FROM            e.g. "VDC Academy <hello@your-domain.com>" (a domain verified in Resend)
//   ADMIN_NOTIFY_EMAIL    where new applications, leads and messages are announced
//   TURNSTILE_SECRET_KEY  Cloudflare Turnstile secret (optional: when unset, tokens are not checked)
//   WEBHOOK_SECRET        random string; the webhook sends "Authorization: Bearer <WEBHOOK_SECRET>"
//   SITE_URL              e.g. https://morcosfady.github.io/vdc-academy (used in links)
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected by Supabase automatically.
//
// Deploy with `supabase functions deploy notify --no-verify-jwt` (the webhook does not send a user JWT).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type Row = Record<string, unknown>;
type Payload = { type: "INSERT" | "UPDATE" | "DELETE"; table: string; schema: string; record: Row | null };

const env = (k: string) => Deno.env.get(k) ?? "";
const supabase = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false } });

function timingSafeEqual(a: string, b: string) {
  const x = new TextEncoder().encode(a), y = new TextEncoder().encode(b);
  if (x.length !== y.length) return false;
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}

// The table only stores a hash of the IP, so remoteip is not sent; Cloudflare treats it as optional.
async function turnstileOk(token: unknown): Promise<boolean | null> {
  const secret = env("TURNSTILE_SECRET_KEY");
  if (!secret) return null; // not configured: do not block, record "unknown"
  if (typeof token !== "string" || !token) return false;
  try {
    const body = new URLSearchParams({ secret, response: token });
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body });
    const json = (await res.json()) as { success?: boolean };
    return Boolean(json.success);
  } catch (e) {
    console.error("turnstile verify failed", e);
    return false;
  }
}

async function send(to: string, subject: string, html: string, replyTo?: string) {
  const key = env("RESEND_API_KEY"), from = env("EMAIL_FROM");
  if (!key || !from || !to) {
    console.warn("email skipped (missing RESEND_API_KEY, EMAIL_FROM or recipient)", { subject, to: Boolean(to) });
    return;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to, subject, html, ...(replyTo ? { reply_to: replyTo } : {}) }),
  });
  if (!res.ok) console.error("resend error", res.status, await res.text());
}

const esc = (s: unknown) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
const str = (v: unknown) => (Array.isArray(v) ? v.join(", ") : v === null || v === undefined || v === "" ? "" : String(v));
const first = (name: unknown) => str(name).trim().split(/\s+/)[0] || "there";

// Plain, paper-like email: dark ink on white, one accent rule. No images, so it renders everywhere.
const shell = (title: string, body: string) => `<!doctype html><html><body style="margin:0;background:#f3f8fc;padding:24px 12px">
<div style="font-family:Helvetica,Arial,sans-serif;max-width:560px;margin:auto;background:#ffffff;color:#0a1d23;padding:32px;border-top:3px solid #365b62">
<p style="margin:0 0 20px;font-family:Menlo,Consolas,monospace;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#52666d">VDC Academy &middot; by Bay BIM Designs</p>
<h1 style="margin:0 0 16px;font-size:22px;line-height:1.25;font-weight:600">${title}</h1>
${body}
</div>
<p style="font-family:Helvetica,Arial,sans-serif;font-size:11px;color:#52666d;text-align:center;margin:16px 0 0">This email was sent because a form was filled in on the VDC Academy site.</p>
</body></html>`;

const rows = (pairs: [string, unknown][]) =>
  `<table style="border-collapse:collapse;width:100%;font-size:14px">${pairs
    .filter(([, v]) => str(v) !== "")
    .map(([k, v]) => `<tr><td style="padding:6px 12px 6px 0;color:#52666d;vertical-align:top;white-space:nowrap">${esc(k)}</td><td style="padding:6px 0">${esc(str(v))}</td></tr>`)
    .join("")}</table>`;

const steps = ["We review your application within 1 to 2 business days.", "An advisor calls you to confirm fit and answer your questions.", "You get the price, any discount and payment options in writing.", "You join your cohort and build your first model."];
const nextSteps = `<ol style="padding-left:20px;margin:16px 0;font-size:14px;line-height:1.6">${steps.map((s) => `<li>${s}</li>`).join("")}</ol>`;

function dashboardLink(table: string) {
  const ref = env("SUPABASE_URL").match(/^https?:\/\/([a-z0-9-]+)\.supabase\.co/)?.[1];
  const url = ref ? `https://supabase.com/dashboard/project/${ref}/editor` : "";
  return url ? `<p style="font-size:13px;margin-top:20px"><a style="color:#365b62" href="${esc(url)}">Open the ${esc(table)} table in Supabase</a></p>` : "";
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const secret = env("WEBHOOK_SECRET");
  const auth = req.headers.get("Authorization") ?? "";
  if (!secret || !timingSafeEqual(auth, `Bearer ${secret}`)) return new Response("Unauthorized", { status: 401 });

  let payload: Payload;
  try {
    payload = (await req.json()) as Payload;
  } catch {
    return new Response("Bad payload", { status: 400 });
  }
  const { type, table, record: r } = payload;
  if (type !== "INSERT" || !r) return new Response("ignored", { status: 200 });
  const id = String(r.id ?? "");
  const admin = env("ADMIN_NOTIFY_EMAIL");
  const site = env("SITE_URL").replace(/\/$/, "");

  // Turnstile: record the result and drop the token. Spam rows stay in the table (status "new") but send no email.
  if (table === "applications" || table === "leads" || table === "contact_messages") {
    const ok = await turnstileOk(r.turnstile_token);
    const { error } = await supabase.from(table).update({ turnstile_ok: ok, turnstile_token: null }).eq("id", id);
    if (error) console.error("could not record turnstile result", error);
    if (ok === false) return new Response("spam", { status: 200 });
  }

  if (table === "applications") {
    const discount = r.discount_percent ? `${str(r.discount_percent)}% (${str(r.discount_type) === "freshGrad" ? "fresh graduate" : str(r.discount_type)}), pending verification` : "";
    await send(
      String(r.email ?? ""),
      "We received your VDC Academy application",
      shell(
        `Thank you, ${esc(first(r.full_name))}.`,
        `<p style="font-size:15px;line-height:1.6">Your application is in. Here is what happens next:</p>${nextSteps}
         ${rows([["Application ID", id], ["Program", r.programs], ["Format", r.format], ["Start", r.start_pref], ["Discount", discount]])}
         <p style="font-size:14px;color:#52666d;margin-top:20px">Reply to this email if anything changes.${site ? ` Programs: <a style="color:#365b62" href="${esc(site)}/programs/">${esc(site)}/programs/</a>` : ""}</p>`,
      ),
      admin || undefined,
    );
    await send(
      admin,
      `New application: ${str(r.full_name)} (${str(r.programs) || "no program"})`,
      shell(
        `New application from ${esc(r.full_name)}`,
        rows([
          ["Email", r.email], ["Phone", r.phone], ["WhatsApp", r.whatsapp], ["Location", `${str(r.city)}, ${str(r.country)}`], ["Age", r.dob_or_age], ["Language", r.language],
          ["Status", r.current_status], ["Degree", r.degree], ["University", r.university], ["Graduation", r.graduation_year], ["GPA", r.gpa],
          ["Experience", r.experience_years], ["Job", [r.job_title, r.company].filter(Boolean).join(" at ")], ["Goal", r.career_goal],
          ["Skills", r.software_skills && typeof r.software_skills === "object" ? Object.entries(r.software_skills as Row).map(([k, v]) => `${k}: ${v}`).join(", ") : ""],
          ["LinkedIn", r.linkedin_url], ["Portfolio", r.portfolio_url],
          ["Programs", r.programs], ["Format", r.format], ["Schedule", r.schedule], ["Start", r.start_pref], ["Laptop", r.has_laptop], ["Source", r.source],
          ["Discount", discount], ["Proof file", r.proof_file_path], ["CV file", r.cv_file_path], ["Newsletter", r.newsletter ? "yes" : "no"],
          ["UTM", [r.utm_source, r.utm_medium, r.utm_campaign].filter(Boolean).join(" / ")], ["Application ID", id],
        ]) + dashboardLink("applications"),
      ),
      String(r.email ?? "") || undefined,
    );
  } else if (table === "contact_messages") {
    await send(admin, `Contact message from ${str(r.name)}`, shell(`Message from ${esc(r.name)}`, rows([["Email", r.email], ["Message", r.message]]) + dashboardLink("contact_messages")), String(r.email ?? "") || undefined);
    await send(String(r.email ?? ""), "We got your message", shell(`Thanks, ${esc(first(r.name))}.`, `<p style="font-size:15px;line-height:1.6">We got your message and will reply soon.</p>`), admin || undefined);
  } else if (table === "leads") {
    await send(admin, `New lead: ${str(r.name)}`, shell(`New lead: ${esc(r.name)}`, rows([["Email", r.email], ["Topic", r.topic]]) + dashboardLink("leads")), String(r.email ?? "") || undefined);
  }
  return new Response("ok");
});
