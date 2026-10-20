// Cloudflare Turnstile server-side check. Returns true or false, or null when no secret is configured
// (then nothing is blocked and the row records "unknown").

export async function verifyTurnstile(token: unknown): Promise<boolean | null> {
  const secret = Deno.env.get("TURNSTILE_SECRET_KEY") ?? "";
  if (!secret) return null;
  if (typeof token !== "string" || !token) return false;
  try {
    const body = new URLSearchParams({ secret, response: token });
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body });
    const data = (await res.json()) as { success?: boolean };
    return Boolean(data.success);
  } catch (e) {
    console.error("turnstile verify failed", e instanceof Error ? e.message : "unknown error");
    return false;
  }
}
