// Sends one email through the Resend REST API. Secrets: RESEND_API_KEY, EMAIL_FROM.
// Logs only the subject and the status code, never an address or a body.

export type Mail = { to: string; subject: string; html: string; text: string; replyTo?: string };

export async function sendEmail(mail: Mail): Promise<boolean> {
  const key = Deno.env.get("RESEND_API_KEY") ?? "";
  const from = Deno.env.get("EMAIL_FROM") ?? "";
  if (!key || !from || !mail.to) {
    console.warn("email skipped: RESEND_API_KEY, EMAIL_FROM or the recipient is missing", { subject: mail.subject });
    return false;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: mail.to,
        subject: mail.subject,
        html: mail.html,
        text: mail.text,
        ...(mail.replyTo ? { reply_to: mail.replyTo } : {}),
      }),
    });
    if (!res.ok) {
      console.error("resend error", res.status, { subject: mail.subject });
      return false;
    }
    return true;
  } catch (e) {
    console.error("resend request failed", e instanceof Error ? e.message : "unknown error", { subject: mail.subject });
    return false;
  }
}
