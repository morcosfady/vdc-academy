// CORS and JSON helpers shared by the Edge Functions. The browser calls them with
// `supabase.functions.invoke(name, { body })`, which sends a preflight first.

export const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export function preflight(req: Request): Response | null {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  return null;
}

export function ok(extra: Record<string, unknown> = {}): Response {
  return json({ ok: true, ...extra }, 200);
}

export function fail(error: string, status: number): Response {
  return json({ ok: false, error }, status);
}

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
