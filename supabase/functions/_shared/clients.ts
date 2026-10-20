// Two Supabase clients per request:
// - `callerClient` carries the browser's Authorization header, so `auth.getUser()` tells us who is calling and
//   `rpc("is_admin")` runs the same check Row Level Security uses.
// - `serviceClient` uses the service role (injected by Supabase as SUPABASE_SERVICE_ROLE_KEY) for the few reads
//   and writes that RLS would block: loading a lead inserted by an anonymous visitor, stamping notified_at.
import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";

const env = (k: string) => Deno.env.get(k) ?? "";

export function callerClient(req: Request): SupabaseClient {
  const authorization = req.headers.get("Authorization") ?? "";
  return createClient(env("SUPABASE_URL"), env("SUPABASE_ANON_KEY"), {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function serviceClient(): SupabaseClient {
  return createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export type Caller = { id: string; email: string | null; isAdmin: boolean };

// Null when the Authorization header is the anon key or an expired session (no signed-in user).
export async function getCaller(req: Request): Promise<Caller | null> {
  const client = callerClient(req);
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) return null;
  let isAdmin = false;
  const admin = await client.rpc("is_admin");
  if (!admin.error) isAdmin = admin.data === true;
  return { id: data.user.id, email: data.user.email ?? null, isAdmin };
}

// The public site URL without a trailing slash (SITE_URL secret, e.g. https://morcosfady.github.io/vdc-academy).
export const siteUrl = (path = "/") => `${env("SITE_URL").replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
export const adminEmail = () => env("ADMIN_NOTIFY_EMAIL");
