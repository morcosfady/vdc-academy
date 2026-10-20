"use client";

import { handle, sessionJson, type MockState } from "./engine";
import { demoAdminId, demoStudentId, seedDemo } from "./seed";

// Client demo mode (/demo/): the in-memory Supabase from lib/demo/engine.ts runs inside the page. supabase-js is
// given `demoFetch` instead of the network, so nothing leaves the browser, even when real keys are baked into the
// build. The state lives in localStorage so a reload keeps the sample data; "Reset demo data" reseeds it.
//
// Switches (localStorage): "vdc-demo" = "1" turns the demo on; "vdc-mock" = "1" is set too so lib/supabase.ts and
// lib/submit.ts take the mock path. The client URL is the site's own origin + "/demo-api" (no DNS, CSP 'self'),
// and signed document links resolve to a sample PDF under /demo/ so "Open" works in the admin screens.

export const DEMO_KEY = "vdc-demo";
const STATE_KEY = "vdc-demo-state";
const MOCK_KEY = "vdc-mock";
const DRAFT_KEYS = ["vdc-apply-draft", "vdc-applied"];

export function demoOn(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(DEMO_KEY) === "1";
  } catch {
    return false;
  }
}

const basePath = () => process.env.NEXT_PUBLIC_BASE_PATH ?? "";
export const demoUrl = () => `${window.location.origin}${basePath()}/demo-api`;
// supabase-js stores the session under sb-<first host label>-auth-token
export const demoTokenKey = () => `sb-${window.location.hostname.split(".")[0]}-auth-token`;

let state: MockState | null = null;

function save() {
  if (!state) return;
  try {
    localStorage.setItem(STATE_KEY, JSON.stringify({ ...state, requests: [] }));
  } catch {}
}

export function demoState(): MockState {
  if (state) return state;
  try {
    const raw = localStorage.getItem(STATE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as MockState;
      if (parsed && Array.isArray(parsed.users) && parsed.tables) state = { ...parsed, requests: [] };
    }
  } catch {}
  if (!state) {
    state = seedDemo();
    save();
  }
  return state;
}

async function bodySizeOf(body: BodyInit | null | undefined): Promise<number> {
  if (!body) return 0;
  if (typeof body === "string") return body.length;
  if (body instanceof Blob) return body.size;
  if (body instanceof ArrayBuffer) return body.byteLength;
  if (ArrayBuffer.isView(body)) return body.byteLength;
  if (body instanceof FormData) {
    let n = 0;
    body.forEach((v) => {
      n += v instanceof Blob ? v.size : String(v).length;
    });
    return n;
  }
  return 0;
}

const realFetch = typeof window !== "undefined" ? window.fetch.bind(window) : fetch;

// Drop-in for fetch: answers /demo-api/** from the engine, blocks anything that looks like Supabase, passes the rest through.
export async function demoFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url, window.location.href);
  const prefix = `${basePath()}/demo-api`;
  if (url.origin !== window.location.origin || !url.pathname.startsWith(prefix)) {
    if (/supabase\.(co|in)$/.test(url.hostname)) return new Response(JSON.stringify({ message: "demo mode: real Supabase is never called" }), { status: 403, headers: { "content-type": "application/json" } });
    return realFetch(input, init);
  }
  const method = (init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase();
  const rawHeaders = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
  const headers: Record<string, string> = {};
  rawHeaders.forEach((v, k) => (headers[k.toLowerCase()] = v));
  const rawBody = init?.body ?? null;
  let body: unknown = null;
  if (typeof rawBody === "string") {
    try {
      body = JSON.parse(rawBody);
    } catch {}
  }
  const res = handle(demoState(), { method, path: url.pathname.slice(prefix.length), search: url.searchParams, headers, body, bodySize: await bodySizeOf(rawBody) }, { autoConfirm: true, signedUrl: () => `/../../../demo/sample-document.pdf` });
  if (method !== "GET" && method !== "OPTIONS") save();
  const h = new Headers({ ...(res.headers ?? {}) });
  if (res.body !== undefined) {
    h.set("content-type", res.contentType ?? "application/json");
    return new Response(JSON.stringify(res.body), { status: res.status, headers: h });
  }
  if (res.contentType) h.set("content-type", res.contentType);
  return new Response(res.status === 204 ? null : (res.text ?? ""), { status: res.status, headers: h });
}

function setSession(userId: string | null) {
  const s = demoState();
  s.session = userId ? { userId } : null;
  save();
  try {
    if (!userId) localStorage.removeItem(demoTokenKey());
    else {
      const u = s.users.find((x) => x.id === userId);
      if (u) localStorage.setItem(demoTokenKey(), JSON.stringify(sessionJson(u)));
    }
  } catch {}
}

function clearDrafts() {
  try {
    DRAFT_KEYS.forEach((k) => localStorage.removeItem(k));
    sessionStorage.removeItem("vdc-applied");
  } catch {}
}

function go(path: string) {
  window.location.href = `${basePath()}${path}`;
}

// Tour entry points. Each one puts the browser in the right state and loads the page fresh so the auth provider
// reads the new session. Full reloads on purpose: the client is swapped, not updated.
export const demo = {
  enable() {
    try {
      localStorage.setItem(DEMO_KEY, "1");
      localStorage.setItem(MOCK_KEY, "1");
    } catch {}
    demoState();
  },
  reset() {
    state = seedDemo();
    save();
    clearDrafts();
    setSession(null);
  },
  exit() {
    try {
      localStorage.removeItem(DEMO_KEY);
      localStorage.removeItem(MOCK_KEY);
      localStorage.removeItem(STATE_KEY);
      localStorage.removeItem(demoTokenKey());
      localStorage.removeItem("sb-mock-auth-token");
    } catch {}
    clearDrafts();
    state = null;
    go("/");
  },
  asGuest(path: string) {
    demo.enable();
    clearDrafts();
    setSession(null);
    go(path);
  },
  asStudent(path: string) {
    demo.enable();
    clearDrafts();
    setSession(demoStudentId(demoState()));
    go(path);
  },
  asAdmin(path: string) {
    demo.enable();
    setSession(demoAdminId(demoState()));
    go(path);
  },
};
