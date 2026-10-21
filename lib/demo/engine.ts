// An in-memory Supabase: enough of GoTrue (auth), PostgREST (rest), Storage and Functions to run the account,
// apply, recruiter and admin screens without a project. Pure: `handle(state, request)` returns a response and
// mutates `state`. Two callers share it: tests/helpers/mockSupabase.ts (Playwright answers
// https://mock.supabase.local through page.route) and lib/demo/browser.ts (the client demo answers in the page).
//
// It mirrors supabase/migrations/0005_roles_registration.sql so the demo and the tests behave like the database:
// - sign-up metadata becomes the profile (and the recruiter row); onboarding_complete only when profileComplete()
// - role grants (state.roleGrants) apply only to confirmed emails; the role never comes from the browser
// - row visibility: own rows or admin; recruiters never see applications or student profiles; only students apply
// - guards: no self-promotion, account type set once, admin roles only by a super admin, verification and hiring
//   status columns written by the team only, onboarding_complete refused while a required field is missing
// Storage paths and Edge Functions are not policed here (the SQL tests cover them).

import { profileComplete } from "../signupSchema";

export type Row = Record<string, unknown>;
export type MockUser = { id: string; email: string; password: string; meta: Row; confirmed: boolean };
export type MockState = {
  users: MockUser[];
  tables: Record<string, Row[]>;
  session: { userId: string } | null;
  files: Record<string, number>; // path -> size
  requests: { method: string; path: string; body: unknown }[];
  nextId: number;
  roleGrants?: { email: string; role: "admin" | "super_admin" }[];
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

const TABLES = ["profiles", "recruiter_profiles", "hiring_requests", "applications", "application_events", "leads", "contact_messages", "newsletter_subscribers", "account_deletion_requests"];

export function emptyState(): MockState {
  return { users: [], tables: Object.fromEntries(TABLES.map((t) => [t, []])), session: null, files: {}, requests: [], nextId: 1, roleGrants: [] };
}

const now = () => new Date().toISOString();
const ADMIN_ROLES = ["admin", "super_admin"];
const isAdminRole = (r: unknown) => ADMIN_ROLES.includes(String(r));

const PROFILE_DEFAULTS: Row = {
  full_name: null, phone: null, whatsapp: null, country: null, city: null, age_range: null, language: null, current_status: null, degree: null, university: null,
  graduation_year: null, linkedin_url: null, portfolio_url: null, avatar_path: null, marketing_opt_in: false,
  account_type: null, onboarding_complete: false, date_of_birth: null, degree_field: null, degree_level: null, experience_years: null, revit_level: null,
  career_goal: null, preferred_format: null, heard_from: null, consent_terms_at: null, consent_contact_at: null,
};
const STUDENT_KEYS = ["full_name", "phone", "whatsapp", "country", "city", "date_of_birth", "current_status", "degree_field", "degree_level", "university", "graduation_year", "experience_years", "revit_level", "career_goal", "preferred_format", "heard_from"];
const RECRUITER_PROFILE_KEYS = ["full_name", "phone", "country", "city", "heard_from"];
const RECRUITER_KEYS = ["job_title", "company_name", "company_website", "company_type", "company_size", "linkedin_url", "hiring_roles", "expected_hires", "authorised_confirmed"];

export function profileRow(id: string, email: string, meta: Row, role: string = "student"): Row {
  const at = now();
  return { ...PROFILE_DEFAULTS, id, email, full_name: (meta.full_name as string) ?? null, current_status: (meta.current_status as string) ?? null, role, marketing_opt_in: Boolean(meta.marketing_opt_in), created_at: at, updated_at: at };
}

export function recruiterRow(id: string, fields: Row = {}): Row {
  const at = now();
  return { id, job_title: null, company_name: null, company_website: null, company_type: null, company_size: null, linkedin_url: null, hiring_roles: [], expected_hires: null, authorised_confirmed: false, verification_status: "pending", verified_by: null, verified_at: null, rejection_note: null, created_at: at, updated_at: at, ...fields };
}

// Fictional values that make a seeded profile really complete (only for fields the seed did not set).
function completeDefaults(role: string): Row {
  const at = now();
  if (role === "admin" || role === "super_admin") return { phone: "+1 555 010 0099" };
  const person = { phone: "+1 555 010 0000", country: "USA", city: "Fort Worth", heard_from: "linkedin", consent_terms_at: at, consent_contact_at: at };
  if (role === "recruiter") return person;
  return { ...person, whatsapp: "+1 555 010 0000", date_of_birth: "2000-01-01", current_status: "professional", degree_field: "architecture", degree_level: "bachelor", university: "Sample University", graduation_year: 2018, experience_years: "1-3", revit_level: "beginner", career_goal: "bim_coordinator", preferred_format: "online" };
}
const RECRUITER_DEFAULTS: Row = { job_title: "Talent lead", company_name: "Sample Company", company_website: "https://example.com", company_type: "general_contractor", company_size: "51-200", linkedin_url: "https://www.linkedin.com/in/sample-recruiter", hiring_roles: ["bim_coordinator"], expected_hires: "2-5", authorised_confirmed: true };

// Trusted seed (like the SQL editor): a confirmed user with a finished profile unless `onboarding: false`.
// A finished profile gets fictional values for any required field the seed leaves empty.
export function seedUser(state: MockState, email: string, password: string, meta: Row = {}, role: "student" | "recruiter" | "admin" | "super_admin" = "student", opts: { onboarding?: boolean; profile?: Row; recruiter?: Row } = {}) {
  const id = uuid(state.nextId++);
  state.users.push({ id, email, password, meta, confirmed: true });
  const accountType = role === "recruiter" ? "recruiter" : role === "student" ? "student" : (opts.profile?.account_type as string | undefined) ?? null;
  const done = opts.onboarding ?? true;
  const base: Row = { ...profileRow(id, email, meta, role), account_type: accountType };
  const filled = done ? Object.fromEntries(Object.entries(completeDefaults(role)).filter(([k]) => base[k] === null || base[k] === undefined)) : {};
  state.tables.profiles.push({ ...base, ...filled, onboarding_complete: done, ...(opts.profile ?? {}) });
  if (role === "recruiter" || opts.recruiter) state.tables.recruiter_profiles.push(recruiterRow(id, { ...(done ? RECRUITER_DEFAULTS : {}), ...(opts.recruiter ?? {}) }));
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

function subOf(headers: Record<string, string>): string | null | undefined {
  const auth = headers["authorization"];
  if (auth === undefined) return undefined; // no header at all (a direct test fetch)
  const m = auth.match(/^Bearer mock\.([^.]+)\./);
  if (!m) return null; // the anon key
  try {
    return String(JSON.parse(atob(m[1].replace(/-/g, "+").replace(/_/g, "/"))).sub);
  } catch {
    return null;
  }
}

// ---- the database triggers, in JavaScript

const pick = (meta: Row, keys: string[]) => Object.fromEntries(keys.filter((k) => meta[k] !== undefined && meta[k] !== "" && meta[k] !== null).map((k) => [k, typeof meta[k] === "string" ? String(meta[k]).trim() : meta[k]]));

// handle_new_user: whitelisted metadata into the profile (and recruiter row); a "role" in the metadata is ignored.
function createProfileFromMeta(state: MockState, u: MockUser) {
  const meta = u.meta ?? {};
  const t = meta.account_type === "student" || meta.account_type === "recruiter" ? (meta.account_type as string) : null;
  const at = now();
  const fields = t === "recruiter" ? pick(meta, RECRUITER_PROFILE_KEYS) : t === "student" ? pick(meta, STUDENT_KEYS) : pick(meta, ["full_name", "phone"]);
  if (fields.graduation_year !== undefined) fields.graduation_year = Number(fields.graduation_year) || null;
  const profile: Row = {
    ...profileRow(u.id, u.email, meta, t ?? "student"),
    ...fields,
    account_type: t,
    consent_terms_at: meta.consent_terms === true ? at : null,
    consent_contact_at: meta.consent_contact === true ? at : null,
  };
  state.tables.profiles.push(profile);
  let recruiter: Row | null = null;
  if (t === "recruiter") {
    const r = pick(meta, RECRUITER_KEYS);
    if (Array.isArray(r.hiring_roles)) r.hiring_roles = (r.hiring_roles as unknown[]).map(String).filter((x) => ["bim_modeler", "bim_coordinator", "vdc_engineer", "bim_manager", "revit_drafter", "other"].includes(x));
    r.authorised_confirmed = meta.authorised_confirmed === true;
    recruiter = recruiterRow(u.id, r);
    state.tables.recruiter_profiles.push(recruiter);
  }
  profile.onboarding_complete = profileComplete(profile, recruiter);
}

// apply_role_grant: confirmed emails only, case-insensitive.
function applyGrants(state: MockState) {
  for (const g of state.roleGrants ?? []) {
    const u = state.users.find((x) => x.email.toLowerCase() === g.email.toLowerCase());
    if (!u || !u.confirmed) continue;
    const p = state.tables.profiles.find((x) => x.id === u.id);
    if (!p || p.role === g.role) continue;
    p.role = g.role;
    if (!p.onboarding_complete && profileComplete(p, null)) p.onboarding_complete = true;
  }
}

type Who = { id: string | null; profile: Row | null; admin: boolean; superAdmin: boolean };
const deny = (message: string, status = 403) => ({ status, body: { code: "42501", message }, contentType: "application/json" });

// Row visibility (the SELECT policies).
function visible(state: MockState, table: string, r: Row, who: Who): boolean {
  if (who.admin) return true;
  switch (table) {
    case "profiles":
    case "recruiter_profiles":
      return r.id === who.id;
    case "hiring_requests":
      return r.recruiter_id === who.id;
    case "applications":
      return r.user_id === who.id;
    case "application_events": {
      const app = state.tables.applications.find((a) => a.id === r.application_id);
      return Boolean(r.visible_to_student) && app?.user_id === who.id;
    }
    case "account_deletion_requests":
      return r.user_id === who.id;
    case "leads":
    case "contact_messages":
    case "newsletter_subscribers":
      return false;
    default:
      return true;
  }
}

// profiles_guard on a merged row (before = the stored row or null for an insert).
function guardProfile(state: MockState, before: Row | null, next: Row, who: Who): string | null {
  const trusted = who.id === null && !who.profile; // only direct test writes come without a caller
  if (!trusted && !who.admin) {
    if (!before) next.role = next.account_type === "recruiter" ? "recruiter" : "student";
    else {
      if (next.role !== before.role) return "only an admin can change a role";
      if (before.account_type && next.account_type !== before.account_type) return "the account type is chosen once at sign-up";
    }
  }
  if (!trusted && who.admin && before && next.role !== before.role && (isAdminRole(next.role) || isAdminRole(before.role)) && !who.superAdmin) return "only a super admin can grant or remove admin roles";
  if (!trusted) {
    if (next.consent_terms_at && next.consent_terms_at !== before?.consent_terms_at) next.consent_terms_at = now();
    if (next.consent_contact_at && next.consent_contact_at !== before?.consent_contact_at) next.consent_contact_at = now();
  }
  if (!isAdminRole(next.role) && (next.account_type === "student" || next.account_type === "recruiter")) next.role = next.account_type;
  if (next.onboarding_complete === true && !profileComplete(next, state.tables.recruiter_profiles.find((x) => x.id === next.id) ?? null)) return "onboarding_complete needs every required field (profile_complete)";
  return null;
}

function guardRecruiter(state: MockState, before: Row | null, next: Row, who: Who): string | null {
  if (who.admin) {
    if (before && next.verification_status !== before.verification_status) {
      next.verified_by = who.id;
      next.verified_at = now();
      if (next.verification_status === "approved") next.rejection_note = null;
    }
    return null;
  }
  if (!before) {
    const p = state.tables.profiles.find((x) => x.id === next.id);
    if (p?.account_type !== "recruiter") return "only recruiter accounts have a company profile";
    Object.assign(next, { verification_status: "pending", verified_by: null, verified_at: null, rejection_note: null });
  } else {
    for (const k of ["id", "verification_status", "verified_by", "verified_at", "rejection_note"]) next[k] = before[k];
  }
  return null;
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
  for (const t of TABLES) state.tables[t] ??= [];
  state.roleGrants ??= [];
  applyGrants(state);
  const current = () => state.users.find((u) => u.id === state.session?.userId) ?? null;
  state.requests.push({ method, path, body });
  if (method === "OPTIONS") return { status: 204, headers: { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*" } };

  // ---- auth (GoTrue)
  if (path.startsWith("/auth/v1/")) {
    const b = (body ?? {}) as Row;
    if (path.endsWith("/signup") && method === "POST") {
      const email = String(b.email ?? "").trim().toLowerCase();
      if (state.users.some((u) => u.email === email)) return json({ code: 422, msg: "User already registered" }, 422);
      const id = uuid(state.nextId++);
      const meta = ((b.data as Row) ?? {}) as Row;
      const u: MockUser = { id, email, password: String(b.password ?? ""), meta, confirmed: Boolean(opts.autoConfirm) };
      state.users.push(u);
      createProfileFromMeta(state, u);
      applyGrants(state);
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
        const u = state.users.find((x) => x.email === String(b.email ?? "").trim().toLowerCase() && x.password === b.password);
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
        applyGrants(state);
        state.session = { userId: u.id };
        return json(sessionJson(u));
      }
    }
    if (path.endsWith("/otp") && method === "POST") return json({}); // magic link requested
    if (path.endsWith("/recover") && method === "POST") return json({}); // reset email requested
    if (path.endsWith("/resend") && method === "POST") return json({}); // confirmation sent again
    if (path.endsWith("/verify") && method === "POST") {
      const u = state.users.find((x) => x.email === String(b.email ?? "").toLowerCase()) ?? state.users[0];
      if (!u) return json({ error: "invalid" }, 400);
      u.confirmed = true;
      applyGrants(state);
      state.session = { userId: u.id };
      return json(sessionJson(u));
    }
    if (path.endsWith("/user") && method === "GET") {
      // the bearer token names the user (the demo keeps several sessions in one browser profile)
      const sub = subOf(headers);
      const byToken = sub ? state.users.find((x) => x.id === sub) : null;
      if (byToken) {
        state.session = { userId: byToken.id };
        return json(userJson(byToken));
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
    const sub = subOf(headers);
    const callerId = sub === undefined ? (state.session?.userId ?? null) : sub;
    const me = callerId ? state.users.find((u) => u.id === callerId) ?? null : null;
    const myProfile = me ? state.tables.profiles.find((p) => p.id === me.id) ?? null : null;
    const who: Who = { id: me?.id ?? null, profile: myProfile, admin: isAdminRole(myProfile?.role), superAdmin: myProfile?.role === "super_admin" };
    // a direct write from a test with no Authorization header is trusted, like the SQL editor
    const trustedWrite = sub === undefined && !me;

    if (table === "role_grants") return json(who.superAdmin ? (state.roleGrants ?? []).map((g) => ({ ...g })) : []);
    const rows = (state.tables[table] ??= []);
    const { f, order, limit } = parseFilters(sp);
    const accept = headers["accept"] ?? "";
    const prefer = headers["prefer"] ?? "";
    const single = accept.includes("application/vnd.pgrst.object+json");
    const match = (r: Row) => f.every((fn) => fn(r)) && (trustedWrite || visible(state, table, r, who));

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
      const upsert = prefer.includes("resolution=merge-duplicates");
      for (const r of incoming) {
        const at = now();
        const existing = upsert && r.id ? rows.find((x) => x.id === r.id) : undefined;
        if (existing) {
          if (!trustedWrite && !visible(state, table, existing, who)) return deny("new row violates row-level security policy");
          const merged = { ...existing, ...r, updated_at: at };
          const err = table === "profiles" ? guardProfile(state, existing, merged, who) : table === "recruiter_profiles" ? guardRecruiter(state, existing, merged, who) : null;
          if (err) return deny(err, 400);
          Object.assign(existing, merged);
          created.push(existing);
          continue;
        }
        const row: Row = { id: uuid(state.nextId++), created_at: at, updated_at: at, ...r };
        if (!trustedWrite) {
          if (table === "applications") {
            if (!me) return deny("new row violates row-level security policy", 401);
            if (!who.admin && myProfile?.account_type !== "student") return deny("new row violates row-level security policy");
          }
          if (table === "profiles") {
            if (!me || (row.id !== me.id && !who.admin)) return deny("new row violates row-level security policy");
            Object.assign(row, { ...PROFILE_DEFAULTS, ...row });
            const err = guardProfile(state, null, row, who);
            if (err) return deny(err, 400);
          }
          if (table === "recruiter_profiles") {
            if (!me || (row.id !== me.id && !who.admin)) return deny("new row violates row-level security policy");
            Object.assign(row, { ...recruiterRow(String(row.id)), ...row });
            const err = guardRecruiter(state, null, row, who);
            if (err) return deny(err, 400);
          }
          if (table === "hiring_requests") {
            if (!me || (!who.admin && myProfile?.account_type !== "recruiter")) return deny("new row violates row-level security policy");
            if (!who.admin) Object.assign(row, { recruiter_id: me.id, status: "new" });
            row.status ??= "new";
            row.notes ??= "";
          }
          if (table === "account_deletion_requests" && (!me || row.user_id !== me.id)) return deny("new row violates row-level security policy");
          if (table === "application_events" && !who.admin) return deny("new row violates row-level security policy");
        }
        if (table === "applications") {
          row.user_id = who.admin && r.user_id ? r.user_id : (me?.id ?? r.user_id);
          row.status = row.status === "submitted" ? "submitted" : "draft";
          row.discount_status = row.status === "submitted" && row.discount_type ? "pending" : "none";
          row.submitted_at = row.status === "submitted" ? at : null;
          row.programs = row.programs ?? [];
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
        if (!trustedWrite) {
          if (table === "applications" && !who.admin && r.status !== "draft") return deny("a submitted application can no longer be edited");
          if (table === "hiring_requests" && !who.admin) continue; // update policy: the team only
          if (["leads", "contact_messages", "application_events", "account_deletion_requests"].includes(table) && !who.admin) continue;
        }
        const before = { ...r };
        const next: Row = { ...r, ...patch, updated_at: now() };
        if (!trustedWrite) {
          const err = table === "profiles" ? guardProfile(state, before, next, who) : table === "recruiter_profiles" ? guardRecruiter(state, before, next, who) : null;
          if (err) return deny(err, 400);
        } else if (table === "profiles" && !isAdminRole(next.role) && (next.account_type === "student" || next.account_type === "recruiter")) next.role = next.account_type;
        Object.assign(r, next);
        if (table === "applications" && r.status === "submitted" && before.status !== "submitted") {
          r.submitted_at = now();
          r.discount_status = r.discount_type ? "pending" : "none";
        }
        if (table === "applications" && before.status !== r.status) {
          state.tables.application_events.push({ id: uuid(state.nextId++), application_id: r.id, actor_id: me?.id ?? null, type: "status_change", from_status: before.status, to_status: r.status, note: null, visible_to_student: true, created_at: now() });
        }
        changed.push(r);
      }
      if (prefer.includes("return=minimal")) return { status: 204, text: "" };
      return single ? (changed[0] ? json(changed[0]) : json({ code: "PGRST116", message: "0 rows" }, 406)) : json(changed);
    }

    if (method === "DELETE") {
      const deletable = (r: Row) => trustedWrite || who.admin || (table === "applications" && r.user_id === who.id && r.status === "draft");
      const gone = rows.filter((r) => match(r) && deletable(r));
      state.tables[table] = rows.filter((r) => !gone.includes(r));
      return prefer.includes("return=minimal") ? { status: 204, text: "" } : json(gone);
    }
  }
  return json({ message: `mock: unhandled ${method} ${path}` }, 404);
}
