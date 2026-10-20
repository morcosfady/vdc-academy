// An in-memory Supabase: enough of GoTrue (auth), PostgREST (rest), Storage and Functions to run the account, apply
// and admin screens without a project. Pure: `handle(state, request)` returns a response and mutates `state`.
// Two callers share it: tests/helpers/mockSupabase.ts (Playwright answers https://mock.supabase.local through
// page.route) and lib/demo/browser.ts (the client demo mode answers in the page itself, nothing leaves the browser).
// Row Level Security is NOT modelled (supabase/tests/rls_accounts.sql covers that); the triggers that matter for
// UI flows are: profile row on sign-up, owner stamp on applications, submitted_at, status-change events.

export type Row = Record<string, unknown>;
export type MockUser = { id: string; email: string; password: string; meta: Row; confirmed: boolean };
export type MockState = {
  users: MockUser[];
  tables: Record<string, Row[]>;
  session: { userId: string } | null;
  files: Record<string, number>; // path -> size
  requests: { method: string; path: string; body: unknown }[];
  nextId: number;
};

export type MockRequest = {
  method: string;
  path: string; // pathname only
  search: URLSearchParams;
  headers: Record<string, string>; // lower-case keys
  body: unknown; // parsed JSON when the body was JSON, else null
  bodySize: number; // bytes, for uploads
};
export type MockResponse = { status: number; body?: unknown; text?: string; contentType?: string; headers?: Record<string, string> };
export type MockOptions = {
  autoConfirm?: boolean; // sign-up returns a session at once (the demo); default: "Check your email"
  signedUrl?: (bucketPath: string) => string; // what createSignedUrl returns (path appended to <url>/storage/v1)
};

export const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

export function emptyState(): MockState {
  return { users: [], tables: { profiles: [], applications: [], application_events: [], leads: [], contact_messages: [], newsletter_subscribers: [], account_deletion_requests: [] }, session: null, files: {}, requests: [], nextId: 1 };
}

const now = () => new Date().toISOString();

export function profileRow(id: string, email: string, meta: Row, role: "student" | "admin" = "student"): Row {
  return { id, email, full_name: (meta.full_name as string) ?? null, phone: null, whatsapp: null, country: null, city: null, age_range: null, language: null, current_status: (meta.current_status as string) ?? null, degree: null, university: null, graduation_year: null, linkedin_url: null, portfolio_url: null, avatar_path: null, role, marketing_opt_in: Boolean(meta.marketing_opt_in), created_at: now(), updated_at: now() };
}

export function seedUser(state: MockState, email: string, password: string, meta: Row = {}, role: "student" | "admin" = "student") {
  const id = uuid(state.nextId++);
  state.users.push({ id, email, password, meta, confirmed: true });
  state.tables.profiles.push(profileRow(id, email, meta, role));
  return id;
}

// base64url without Buffer (runs in Node and in the browser)
const b64url = (s: string) => btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

export function tokenFor(userId: string) {
  // supabase-js only decodes the payload; a fake three-part token is enough
  const payload = b64url(JSON.stringify({ sub: userId, role: "authenticated", exp: Math.floor(Date.now() / 1000) + 3600, aud: "authenticated" }));
  return `mock.${payload}.sig`;
}
export function userJson(u: MockUser) {
  return { id: u.id, aud: "authenticated", role: "authenticated", email: u.email, email_confirmed_at: u.confirmed ? now() : null, user_metadata: u.meta, app_metadata: { provider: "email" }, created_at: now() };
}
export function sessionJson(u: MockUser) {
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

const json = (body: unknown, status = 200, headers?: Record<string, string>): MockResponse => ({ status, body, contentType: "application/json", headers });

export function handle(state: MockState, req: MockRequest, opts: MockOptions = {}): MockResponse {
  const { method, path, search: sp, headers, body } = req;
  const current = () => state.users.find((u) => u.id === state.session?.userId) ?? null;
  state.requests.push({ method, path, body });
  if (method === "OPTIONS") return { status: 204, headers: { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*" } };

  // ---- auth (GoTrue)
  if (path.startsWith("/auth/v1/")) {
    const b = (body ?? {}) as Row;
    if (path.endsWith("/signup") && method === "POST") {
      const email = String(b.email ?? "").toLowerCase();
      if (state.users.some((u) => u.email === email)) return json({ code: 422, msg: "User already registered" }, 422);
      const id = uuid(state.nextId++);
      const meta = ((b.data as Row) ?? {}) as Row;
      const u: MockUser = { id, email, password: String(b.password ?? ""), meta, confirmed: Boolean(opts.autoConfirm) };
      state.users.push(u);
      state.tables.profiles.push(profileRow(id, email, meta));
      if (opts.autoConfirm) {
        state.session = { userId: id };
        return json({ ...sessionJson(u), ...userJson(u), identities: [] });
      }
      // email confirmation is required: no session yet
      return json({ ...userJson(u), session: null, identities: [] });
    }
    if (path.endsWith("/token") && method === "POST") {
      const grant = sp.get("grant_type");
      if (grant === "password") {
        const u = state.users.find((x) => x.email === String(b.email ?? "").toLowerCase() && x.password === b.password);
        if (!u) return json({ error: "invalid_grant", error_description: "Invalid login credentials" }, 400);
        if (!u.confirmed) return json({ error: "invalid_grant", error_description: "Email not confirmed" }, 400);
        state.session = { userId: u.id };
        return json(sessionJson(u));
      }
      if (grant === "refresh_token") {
        const u = state.users.find((x) => `refresh-${x.id}` === b.refresh_token);
        if (!u) return json({ error: "invalid_grant" }, 400);
        state.session = { userId: u.id };
        return json(sessionJson(u));
      }
      if (grant === "pkce") {
        const u = state.users.find((x) => `code-${x.id}` === b.auth_code) ?? state.users[0];
        if (!u) return json({ error: "invalid_grant" }, 400);
        u.confirmed = true;
        state.session = { userId: u.id };
        return json(sessionJson(u));
      }
    }
    if (path.endsWith("/otp") && method === "POST") return json({}); // magic link requested
    if (path.endsWith("/recover") && method === "POST") return json({}); // reset email requested
    if (path.endsWith("/verify") && method === "POST") {
      const u = state.users.find((x) => x.email === String(b.email ?? "").toLowerCase()) ?? state.users[0];
      if (!u) return json({ error: "invalid" }, 400);
      u.confirmed = true;
      state.session = { userId: u.id };
      return json(sessionJson(u));
    }
    if (path.endsWith("/user") && method === "GET") {
      // the bearer token names the user (the demo keeps several sessions in one browser profile)
      const auth = headers["authorization"] ?? "";
      const m = auth.match(/^Bearer mock\.([^.]+)\./);
      if (m) {
        try {
          const sub = String(JSON.parse(atob(m[1].replace(/-/g, "+").replace(/_/g, "/"))).sub);
          const byToken = state.users.find((x) => x.id === sub);
          if (byToken) {
            state.session = { userId: byToken.id };
            return json(userJson(byToken));
          }
        } catch {}
      }
      const u = current();
      return u ? json(userJson(u)) : json({ msg: "not logged in" }, 401);
    }
    if (path.endsWith("/user") && method === "PUT") {
      const u = current();
      if (!u) return json({ msg: "not logged in" }, 401);
      if (b.password) u.password = String(b.password);
      if (b.email) u.email = String(b.email).toLowerCase();
      if (b.data) u.meta = { ...u.meta, ...(b.data as Row) };
      return json(userJson(u));
    }
    if (path.endsWith("/logout")) {
      state.session = null;
      return { status: 204 };
    }
    return json({}, 200);
  }

  // ---- storage
  if (path.startsWith("/storage/v1/object/")) {
    if (path.includes("/object/sign/") && method === "POST") {
      const bucketPath = path.replace("/storage/v1/object/sign/", "");
      return json({ signedURL: opts.signedUrl ? opts.signedUrl(bucketPath) : `/object/sign/${bucketPath}?token=mock` });
    }
    if (method === "POST" || method === "PUT") {
      const key = path.replace("/storage/v1/object/", "");
      const size = Number(headers["content-length"] ?? req.bodySize ?? 0);
      if (size > 5242880) return json({ statusCode: "413", error: "Payload too large", message: "The object exceeded the maximum allowed size" }, 413);
      state.files[key] = size;
      return json({ Key: key, Id: key });
    }
    if (method === "DELETE") return json([]);
    return { status: 200, contentType: "application/pdf", text: "%PDF-1.4 mock" };
  }

  // ---- functions
  if (path.startsWith("/functions/v1/")) return json({ ok: true });

  // ---- rest (PostgREST)
  if (path.startsWith("/rest/v1/")) {
    const table = path.replace("/rest/v1/", "").split("/")[0];
    const rows = (state.tables[table] ??= []);
    const { f, order, limit } = parseFilters(sp);
    const accept = headers["accept"] ?? "";
    const prefer = headers["prefer"] ?? "";
    const single = accept.includes("application/vnd.pgrst.object+json");
    const match = (r: Row) => f.every((fn) => fn(r));
    const me = current();
    if (method === "GET") {
      let list = rows.filter(match);
      if (order) list = [...list].sort((a, b) => (String(a[order!.col]) < String(b[order!.col]) ? -1 : 1) * (order!.asc ? 1 : -1));
      const total = list.length;
      const range = headers["range"];
      if (range) {
        const [a, b] = range.split("-").map(Number);
        list = list.slice(a, b + 1);
      } else list = list.slice(0, limit);
      if (single) return list[0] ? json(list[0]) : json({ code: "PGRST116", message: "0 rows" }, 406);
      return json(list, 200, { "content-range": `0-${Math.max(0, list.length - 1)}/${total}` });
    }
    if (method === "POST") {
      const incoming = (Array.isArray(body) ? body : [body]) as Row[];
      const created: Row[] = [];
      for (const r of incoming) {
        const at = now();
        const row: Row = { id: uuid(state.nextId++), created_at: at, updated_at: at, ...r };
        if (table === "applications") {
          if (!me) return json({ message: "new row violates row-level security policy" }, 401);
          row.user_id = me.id;
          row.status = row.status === "submitted" ? "submitted" : "draft";
          row.discount_status = row.status === "submitted" && row.discount_type ? "pending" : "none";
          row.submitted_at = row.status === "submitted" ? at : null;
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
      if (prefer.includes("return=minimal")) return { status: 201, text: "" };
      return single ? json(created[0], 201) : json(created, 201);
    }
    if (method === "PATCH") {
      const patch = (body ?? {}) as Row;
      const changed: Row[] = [];
      for (const r of rows.filter(match)) {
        if (table === "applications" && me && r.user_id === me.id) {
          const admin = state.tables.profiles.find((p) => p.id === me.id)?.role === "admin";
          if (!admin && r.status !== "draft") return json({ message: "a submitted application can no longer be edited" }, 403);
        }
        const before = r.status;
        Object.assign(r, patch, { updated_at: now() });
        if (table === "applications" && r.status === "submitted" && before !== "submitted") {
          r.submitted_at = now();
          r.discount_status = r.discount_type ? "pending" : "none";
        }
        if (table === "applications" && before !== r.status) {
          state.tables.application_events.push({ id: uuid(state.nextId++), application_id: r.id, actor_id: me?.id ?? null, type: "status_change", from_status: before, to_status: r.status, note: null, visible_to_student: true, created_at: now() });
        }
        changed.push(r);
      }
      if (prefer.includes("return=minimal")) return { status: 204, text: "" };
      return single ? json(changed[0]) : json(changed);
    }
    if (method === "DELETE") {
      const keep = rows.filter((r) => !match(r));
      const gone = rows.filter(match);
      state.tables[table] = keep;
      return prefer.includes("return=minimal") ? { status: 204, text: "" } : json(gone);
    }
  }
  return json({ message: `mock: unhandled ${method} ${path}` }, 404);
}
