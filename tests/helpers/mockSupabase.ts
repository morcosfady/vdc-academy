import type { Page, Route } from "@playwright/test";

// An in-memory Supabase for Playwright: enough of GoTrue (auth), PostgREST (rest) and Storage to run the account,
// apply and admin flows without a project. Install with `await mockSupabase(page)` then open any URL with `?mock=1`.
// Rows are plain objects; filters understand eq, neq, in, is, order, limit, select and single/maybeSingle headers.
// Row Level Security is NOT modelled here (the SQL tests cover that); the mock applies the triggers that matter
// for UI flows: profile row on sign-up, owner stamp on applications, submitted_at, status-change events.

type Row = Record<string, unknown>;
export type MockState = {
  users: { id: string; email: string; password: string; meta: Row; confirmed: boolean }[];
  tables: Record<string, Row[]>;
  session: { userId: string } | null;
  files: Record<string, number>; // path -> size
  requests: { method: string; path: string; body: unknown }[];
  nextId: number;
};

const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

export function emptyState(): MockState {
  return { users: [], tables: { profiles: [], applications: [], application_events: [], leads: [], contact_messages: [], newsletter_subscribers: [], account_deletion_requests: [] }, session: null, files: {}, requests: [], nextId: 1 };
}

export function seedUser(state: MockState, email: string, password: string, meta: Row = {}, role: "student" | "admin" = "student") {
  const id = uuid(state.nextId++);
  state.users.push({ id, email, password, meta, confirmed: true });
  state.tables.profiles.push({ id, email, full_name: (meta.full_name as string) ?? null, phone: null, whatsapp: null, country: null, city: null, age_range: null, language: null, current_status: (meta.current_status as string) ?? null, degree: null, university: null, graduation_year: null, linkedin_url: null, portfolio_url: null, avatar_path: null, role, marketing_opt_in: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
  return id;
}

function tokenFor(userId: string) {
  // supabase-js only decodes the payload; a fake three-part token is enough
  const payload = Buffer.from(JSON.stringify({ sub: userId, role: "authenticated", exp: Math.floor(Date.now() / 1000) + 3600, aud: "authenticated" })).toString("base64url");
  return `mock.${payload}.sig`;
}
function userJson(u: MockState["users"][number]) {
  return { id: u.id, aud: "authenticated", role: "authenticated", email: u.email, email_confirmed_at: u.confirmed ? new Date().toISOString() : null, user_metadata: u.meta, app_metadata: { provider: "email" }, created_at: new Date().toISOString() };
}
function sessionJson(u: MockState["users"][number]) {
  return { access_token: tokenFor(u.id), token_type: "bearer", expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: `refresh-${u.id}`, user: userJson(u) };
}

function parseFilters(sp: URLSearchParams) {
  const f: ((r: Row) => boolean)[] = [];
  let order: { col: string; asc: boolean } | null = null;
  let limit = Infinity;
  for (const [k, v] of sp.entries()) {
    if (k === "select" || k === "on_conflict" || k === "columns") continue;
    if (k === "order") {
      const [col, dir] = v.split(".");
      order = { col, asc: dir !== "desc" };
      continue;
    }
    if (k === "limit") {
      limit = Number(v);
      continue;
    }
    if (k === "or") continue; // not modelled (treated as match-all)
    if (v.startsWith("cs.")) {
      const want = v.slice(3).replace(/^{|}$/g, "").split(",").map((x) => x.replace(/^"|"$/g, ""));
      f.push((r) => Array.isArray(r[k]) && want.every((w) => (r[k] as unknown[]).includes(w)));
      continue;
    }
    const m = v.match(/^(eq|neq|in|is|gte|lte|ilike)\.(.*)$/);
    if (!m) continue;
    const [, op, raw] = m;
    f.push((r) => {
      const x = r[k];
      if (op === "eq") return String(x) === raw;
      if (op === "neq") return String(x) !== raw;
      if (op === "is") return raw === "null" ? x === null || x === undefined : String(x) === raw;
      if (op === "in") return raw.replace(/^\(|\)$/g, "").split(",").map((s) => s.replace(/^"|"$/g, "")).includes(String(x));
      if (op === "gte") return String(x) >= raw;
      if (op === "lte") return String(x) <= raw;
      if (op === "ilike") return String(x ?? "").toLowerCase().includes(raw.replace(/%/g, "").toLowerCase());
      return true;
    });
  }
  return { f, order, limit };
}

export async function mockSupabase(page: Page, state: MockState = emptyState()) {
  const current = () => state.users.find((u) => u.id === state.session?.userId) ?? null;
  const json = (route: Route, body: unknown, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });

  await page.route("**/mock.supabase.local/**", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const method = req.method();
    const path = url.pathname;
    let body: unknown = null;
    try {
      body = req.postDataJSON();
    } catch {}
    state.requests.push({ method, path, body });
    if (method === "OPTIONS") return route.fulfill({ status: 204, headers: { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*" } });

    // ---- auth (GoTrue)
    if (path.startsWith("/auth/v1/")) {
      const b = (body ?? {}) as Row;
      if (path.endsWith("/signup") && method === "POST") {
        const email = String(b.email ?? "").toLowerCase();
        if (state.users.some((u) => u.email === email)) return json(route, { code: 422, msg: "User already registered" }, 422);
        const id = uuid(state.nextId++);
        const meta = ((b.data as Row) ?? {}) as Row;
        const u = { id, email, password: String(b.password ?? ""), meta, confirmed: false };
        state.users.push(u);
        state.tables.profiles.push({ id, email, full_name: (meta.full_name as string) ?? null, phone: null, whatsapp: null, country: null, city: null, age_range: null, language: null, current_status: (meta.current_status as string) ?? null, degree: null, university: null, graduation_year: null, linkedin_url: null, portfolio_url: null, avatar_path: null, role: "student", marketing_opt_in: Boolean(meta.marketing_opt_in), created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
        // email confirmation is required: no session yet
        return json(route, { ...userJson(u), session: null, identities: [] });
      }
      if (path.endsWith("/token") && method === "POST") {
        const grant = url.searchParams.get("grant_type");
        if (grant === "password") {
          const u = state.users.find((x) => x.email === String(b.email ?? "").toLowerCase() && x.password === b.password);
          if (!u) return json(route, { error: "invalid_grant", error_description: "Invalid login credentials" }, 400);
          if (!u.confirmed) return json(route, { error: "invalid_grant", error_description: "Email not confirmed" }, 400);
          state.session = { userId: u.id };
          return json(route, sessionJson(u));
        }
        if (grant === "refresh_token") {
          const u = state.users.find((x) => `refresh-${x.id}` === b.refresh_token);
          if (!u) return json(route, { error: "invalid_grant" }, 400);
          state.session = { userId: u.id };
          return json(route, sessionJson(u));
        }
        if (grant === "pkce") {
          const u = state.users.find((x) => `code-${x.id}` === b.auth_code) ?? state.users[0];
          if (!u) return json(route, { error: "invalid_grant" }, 400);
          u.confirmed = true;
          state.session = { userId: u.id };
          return json(route, sessionJson(u));
        }
      }
      if (path.endsWith("/otp") && method === "POST") return json(route, {}); // magic link requested
      if (path.endsWith("/recover") && method === "POST") return json(route, {}); // reset email requested
      if (path.endsWith("/verify") && method === "POST") {
        const u = state.users.find((x) => x.email === String(b.email ?? "").toLowerCase()) ?? state.users[0];
        if (!u) return json(route, { error: "invalid" }, 400);
        u.confirmed = true;
        state.session = { userId: u.id };
        return json(route, sessionJson(u));
      }
      if (path.endsWith("/user") && method === "GET") {
        const u = current();
        return u ? json(route, userJson(u)) : json(route, { msg: "not logged in" }, 401);
      }
      if (path.endsWith("/user") && method === "PUT") {
        const u = current();
        if (!u) return json(route, { msg: "not logged in" }, 401);
        if (b.password) u.password = String(b.password);
        if (b.email) u.email = String(b.email).toLowerCase();
        if (b.data) u.meta = { ...u.meta, ...(b.data as Row) };
        return json(route, userJson(u));
      }
      if (path.endsWith("/logout")) {
        state.session = null;
        return route.fulfill({ status: 204 });
      }
      return json(route, {}, 200);
    }

    // ---- storage
    if (path.startsWith("/storage/v1/object/")) {
      if (path.includes("/object/sign/") && method === "POST") return json(route, { signedURL: `/object/sign/${path.replace("/storage/v1/object/sign/", "")}?token=mock` });
      if (method === "POST" || method === "PUT") {
        const key = path.replace("/storage/v1/object/", "");
        const size = Number(req.headers()["content-length"] ?? (req.postDataBuffer()?.length ?? 0));
        if (size > 5242880) return json(route, { statusCode: "413", error: "Payload too large", message: "The object exceeded the maximum allowed size" }, 413);
        state.files[key] = size;
        return json(route, { Key: key, Id: key });
      }
      if (method === "DELETE") return json(route, []);
      return route.fulfill({ status: 200, contentType: "application/pdf", body: "%PDF-1.4 mock" });
    }

    // ---- functions
    if (path.startsWith("/functions/v1/")) return json(route, { ok: true });

    // ---- rest (PostgREST)
    if (path.startsWith("/rest/v1/")) {
      const table = path.replace("/rest/v1/", "").split("/")[0];
      const rows = (state.tables[table] ??= []);
      const { f, order, limit } = parseFilters(url.searchParams);
      const accept = req.headers()["accept"] ?? "";
      const prefer = req.headers()["prefer"] ?? "";
      const single = accept.includes("application/vnd.pgrst.object+json");
      const match = (r: Row) => f.every((fn) => fn(r));
      const me = current();
      const reply = (list: Row[]) => {
        if (single) return list[0] ? json(route, list[0]) : json(route, { code: "PGRST116", message: "0 rows" }, 406);
        return json(route, list);
      };
      if (method === "GET") {
        let list = rows.filter(match);
        if (order) list = [...list].sort((a, b) => (String(a[order!.col]) < String(b[order!.col]) ? -1 : 1) * (order!.asc ? 1 : -1));
        const total = list.length;
        const range = req.headers()["range"];
        if (range) {
          const [a, b] = range.split("-").map(Number);
          list = list.slice(a, b + 1);
        } else list = list.slice(0, limit);
        if (single) return list[0] ? json(route, list[0]) : json(route, { code: "PGRST116", message: "0 rows" }, 406);
        return route.fulfill({ status: 200, contentType: "application/json", headers: { "content-range": `0-${Math.max(0, list.length - 1)}/${total}` }, body: JSON.stringify(list) });
      }
      if (method === "POST") {
        const incoming = (Array.isArray(body) ? body : [body]) as Row[];
        const created: Row[] = [];
        for (const r of incoming) {
          const now = new Date().toISOString();
          const row: Row = { id: uuid(state.nextId++), created_at: now, updated_at: now, ...r };
          if (table === "applications") {
            if (!me) return json(route, { message: "new row violates row-level security policy" }, 401);
            row.user_id = me.id;
            row.status = row.status === "submitted" ? "submitted" : "draft";
            row.discount_status = row.status === "submitted" && row.discount_type ? "pending" : "none";
            row.submitted_at = row.status === "submitted" ? now : null;
            row.programs = row.programs ?? [];
          }
          if (prefer.includes("resolution=merge-duplicates") && row.id && rows.some((x) => x.id === row.id)) {
            Object.assign(rows.find((x) => x.id === row.id)!, r);
            created.push(rows.find((x) => x.id === row.id)!);
            continue;
          }
          rows.push(row);
          created.push(row);
        }
        if (prefer.includes("return=minimal")) return route.fulfill({ status: 201, body: "" });
        return single ? json(route, created[0], 201) : json(route, created, 201);
      }
      if (method === "PATCH") {
        const patch = (body ?? {}) as Row;
        const changed: Row[] = [];
        for (const r of rows.filter(match)) {
          if (table === "applications" && me && r.user_id === me.id) {
            const admin = state.tables.profiles.find((p) => p.id === me.id)?.role === "admin";
            if (!admin && r.status !== "draft") return json(route, { message: "a submitted application can no longer be edited" }, 403);
          }
          const before = r.status;
          Object.assign(r, patch, { updated_at: new Date().toISOString() });
          if (table === "applications" && r.status === "submitted" && before !== "submitted") {
            r.submitted_at = new Date().toISOString();
            r.discount_status = r.discount_type ? "pending" : "none";
          }
          if (table === "applications" && before !== r.status) {
            state.tables.application_events.push({ id: uuid(state.nextId++), application_id: r.id, actor_id: me?.id ?? null, type: "status_change", from_status: before, to_status: r.status, note: null, visible_to_student: true, created_at: new Date().toISOString() });
          }
          changed.push(r);
        }
        if (prefer.includes("return=minimal")) return route.fulfill({ status: 204, body: "" });
        return single ? json(route, changed[0]) : json(route, changed);
      }
      if (method === "DELETE") {
        const keep = rows.filter((r) => !match(r));
        const gone = rows.filter(match);
        state.tables[table] = keep;
        return prefer.includes("return=minimal") ? route.fulfill({ status: 204, body: "" }) : json(route, gone);
      }
    }
    return json(route, { message: `mock: unhandled ${method} ${path}` }, 404);
  });
  return state;
}

// Sign a seeded user in without the UI (sets the session the way supabase-js stores it)
export async function loginAs(page: Page, state: MockState, userId: string) {
  const u = state.users.find((x) => x.id === userId)!;
  state.session = { userId };
  const s = sessionJson(u);
  await page.addInitScript(
    ({ key, value }) => {
      try {
        localStorage.setItem("vdc-mock", "1");
        localStorage.setItem(key, JSON.stringify(value));
      } catch {}
    },
    { key: "sb-mock-auth-token", value: s },
  );
}
