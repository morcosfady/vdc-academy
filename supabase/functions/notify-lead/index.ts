// Edge Function `notify-lead`. The site calls it after an anonymous visitor inserts a lead or a contact message:
// supabase.functions.invoke("notify-lead", { body: { table: "leads" | "contact_messages", id } }).
//
// Anonymous callers are allowed: the anon key is a valid JWT, so the gateway (verify_jwt = true) lets it in.
// Nothing in the body is trusted beyond a table name and a uuid; the row itself is loaded with the service role.
// Guards: bodies over 2 KB are rejected, callers are rate limited by a hash of their IP (in memory, per isolate,
// best effort), the Turnstile token on the row is verified when TURNSTILE_SECRET_KEY is set (a failed check
// sends no email but still answers { ok: true }, so a bot learns nothing), and `notified_at` makes the admin
// summary a one-time email per row (migration 0004).
//
// Secrets: RESEND_API_KEY, EMAIL_FROM, ADMIN_NOTIFY_EMAIL, TURNSTILE_SECRET_KEY (optional), SITE_URL.
// Returns JSON { ok: true } or { ok: false, error }. Logs never contain personal data.
import { fail, ok, preflight } from "../_shared/cors.ts";
import { adminEmail, serviceClient, siteUrl } from "../_shared/clients.ts";
import { adminLead, type Row } from "../_shared/email.ts";
import { sendEmail } from "../_shared/resend.ts";
import { verifyTurnstile } from "../_shared/turnstile.ts";
import { readJson, str, validateLeadBody } from "../_shared/validate.ts";

const MAX_BODY_BYTES = 2048;
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 12;
const hits = new Map<string, { count: number; start: number }>();

async function ipHash(req: Request): Promise<string> {
  const ip = (req.headers.get("cf-connecting-ip") ?? req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim();
  const bytes = new TextEncoder().encode(ip || "unknown");
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function rateLimited(key: string): boolean {
  const now = Date.now();
  if (hits.size > 5000) hits.clear();
  const h = hits.get(key);
  if (!h || now - h.start > WINDOW_MS) {
    hits.set(key, { count: 1, start: now });
    return false;
  }
  h.count += 1;
  return h.count > MAX_PER_WINDOW;
}

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  if (req.method !== "POST") return fail("method not allowed", 405);

  const declared = Number(req.headers.get("content-length") ?? "0");
  if (declared > MAX_BODY_BYTES) return fail("body too large", 413);

  if (rateLimited(await ipHash(req))) return fail("too many requests", 429);

  const body = await readJson(req, MAX_BODY_BYTES);
  if (!body.ok) return fail(body.error, body.error === "body too large" ? 413 : 400);
  const parsed = validateLeadBody(body.value);
  if (!parsed.ok) return fail(parsed.error, 400);
  const { table, id } = parsed.value;

  const db = serviceClient();
  const { data: row, error } = await db.from(table).select("*").eq("id", id).maybeSingle();
  if (error) {
    console.error("load row failed", table, error.code ?? "", { id });
    return fail("could not load the row", 500);
  }
  if (!row) return fail("not found", 404);
  if (row.notified_at) return ok({ already: true });

  const verified = await verifyTurnstile(row.turnstile_token);
  const botCheck = verified === null ? "not configured" : verified ? "passed" : "failed";
  const stamp: Record<string, unknown> = { notified_at: new Date().toISOString(), turnstile_token: null };
  if (verified !== null) stamp.turnstile_ok = verified;

  let sent = false;
  if (verified !== false && adminEmail()) {
    const rows: Row[] =
      table === "contact_messages"
        ? [["Name", str(row.name)], ["Email", str(row.email)], ["Message", str(row.message)], ["Received", str(row.created_at)], ["Row", id]]
        : [["Name", str(row.name)], ["Email", str(row.email)], ["Topic", str(row.topic)], ["Received", str(row.created_at)], ["Row", id]];
    const mail = adminLead({ table, name: str(row.name), rows, botCheck, adminUrl: siteUrl("/admin/") });
    sent = await sendEmail({ to: adminEmail(), subject: mail.subject, html: mail.html, text: mail.text, replyTo: str(row.email) || undefined });
  }

  const { error: e } = await db.from(table).update(stamp).eq("id", id);
  if (e) console.error("stamp notified_at failed", table, e.code ?? "", { id });

  console.log("lead notified", { table, id, sent, botCheck });
  return ok();
});
