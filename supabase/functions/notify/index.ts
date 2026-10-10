// Supabase Edge Function `notify`. Called by Database Webhooks on INSERT into applications, leads and contact_messages.
// 1. Verifies the Cloudflare Turnstile token and records the result. 2. Sends emails with Resend:
//    a confirmation to the person and a notification to the academy admin.
// Secrets (supabase secrets set ...): RESEND_API_KEY, EMAIL_FROM, ADMIN_NOTIFY_EMAIL, TURNSTILE_SECRET_KEY,
// WEBHOOK_SECRET (same value as the webhook's "Authorization: Bearer" header), SITE_URL.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type Payload = { type: "INSERT"; table: string; record: Record<string, any> };

const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

async function turnstileOk(token: string | null) {
  const secret = Deno.env.get("TURNSTILE_SECRET_KEY");
  if (!secret) return true; // not configured: do not block
  if (!token) return false;
  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body: new URLSearchParams({ secret, response: token }),
  });
  return Boolean((await res.json()).success);
}

async function send(to: string, subject: string, html: string) {
  const key = Deno.env.get("RESEND_API_KEY");
  if (!key || !to) return;
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: Deno.env.get("EMAIL_FROM"), to, subject, html }),
  });
}

const esc = (s: unknown) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));

const shell = (body: string) => `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;background:#030e12;color:#eef5f7;padding:32px">
<p style="letter-spacing:.2em;font-size:12px;color:#6fd6cd">VDC ACADEMY · BY BAY BIM DESIGNS</p>${body}</div>`;

Deno.serve(async (req) => {
  if (req.headers.get("Authorization") !== `Bearer ${Deno.env.get("WEBHOOK_SECRET")}`) return new Response("Unauthorized", { status: 401 });
  const { table, record: r } = (await req.json()) as Payload;
  const admin = Deno.env.get("ADMIN_NOTIFY_EMAIL") ?? "";
  const site = Deno.env.get("SITE_URL") ?? "";

  if (table === "applications" || table === "leads" || table === "contact_messages") {
    const ok = await turnstileOk(r.turnstile_token);
    await supabase.from(table).update({ turnstile_ok: ok, turnstile_token: null }).eq("id", r.id);
    if (!ok) return new Response("spam", { status: 200 });
  }

  if (table === "applications") {
    const discount = r.discount_percent ? `<p>Discount: ${esc(r.discount_percent)}% (${esc(r.discount_type)}), pending verification.</p>` : "";
    await send(r.email, "We received your VDC Academy application", shell(
      `<h1 style="font-size:24px">Thank you, ${esc(String(r.full_name).split(" ")[0])}.</h1>
       <p>Application ID: <b>${esc(r.id)}</b></p><p>Program: ${esc((r.programs ?? []).join(", "))}</p>${discount}
       <p>Next: we review in 1 to 2 business days, then an advisor contacts you, then you enroll, then you start learning.</p>`));
    await send(admin, `New application: ${r.full_name}`, shell(
      `<p>${esc(r.full_name)} · ${esc(r.email)} · ${esc(r.phone)}</p><p>${esc((r.programs ?? []).join(", "))}</p>${discount}
       <p><a style="color:#6fd6cd" href="${esc(site)}/admin/">Open in admin</a></p>`));
  } else if (table === "contact_messages") {
    await send(admin, `Contact message from ${r.name}`, shell(`<p>${esc(r.name)} · ${esc(r.email)}</p><p>${esc(r.message)}</p>`));
    await send(r.email, "We got your message", shell(`<p>Thanks ${esc(r.name)}, we will reply soon.</p>`));
  } else if (table === "leads") {
    await send(admin, `New lead: ${r.name}`, shell(`<p>${esc(r.name)} · ${esc(r.email)} · ${esc(r.topic)}</p>`));
  }
  return new Response("ok");
});
