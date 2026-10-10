// Form submission for a static site (GitHub Pages has no server). Rows go straight to Supabase over REST with
// the anon key. Row Level Security allows INSERT only (see supabase/migrations). Emails and Turnstile checks
// run in a Supabase Edge Function triggered by a database webhook. To move to a server host later, replace
// the two functions below with server actions; nothing else needs to change.

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const submissionsEnabled = Boolean(URL && KEY);

export type SubmitResult = { ok: true } | { ok: false; reason: "disabled" | "failed"; message: string };

export async function insertRow(table: "applications" | "leads" | "contact_messages" | "newsletter_subscribers", row: Record<string, unknown>): Promise<SubmitResult> {
  if (!submissionsEnabled) return { ok: false, reason: "disabled", message: "Submissions are not connected yet." };
  try {
    const res = await fetch(`${URL}/rest/v1/${table}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: KEY as string, Authorization: `Bearer ${KEY}`, Prefer: "return=minimal" },
      body: JSON.stringify(row),
    });
    if (!res.ok) return { ok: false, reason: "failed", message: "We could not save that. Please try again." };
    return { ok: true };
  } catch {
    return { ok: false, reason: "failed", message: "Network problem. Please try again." };
  }
}

// Uploads go to a private bucket. Returns the stored path, or null on failure.
export async function uploadFile(file: File, folder: "proof" | "cv"): Promise<string | null> {
  if (!submissionsEnabled) return null;
  const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") ?? "bin";
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;
  try {
    const res = await fetch(`${URL}/storage/v1/object/applications/${path}`, {
      method: "POST",
      headers: { apikey: KEY as string, Authorization: `Bearer ${KEY}`, "Content-Type": file.type || "application/octet-stream", "x-upsert": "false" },
      body: file,
    });
    return res.ok ? path : null;
  } catch {
    return null;
  }
}

export const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
