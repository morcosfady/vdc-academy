import type { Page, Route } from "@playwright/test";
import { emptyState, handle, seedUser, sessionJson, type MockState } from "../../lib/demo/engine";

// Playwright adapter for the in-memory Supabase in lib/demo/engine.ts. Install with `await mockSupabase(page)` then
// open any URL with `?mock=1`: lib/supabase.ts points the client at https://mock.supabase.local and page.route
// answers every request from `state`. The same engine runs in the browser for the client demo mode (/demo/).

export { emptyState, seedUser };
export type { MockState };

export async function mockSupabase(page: Page, state: MockState = emptyState()) {
  await page.route("**/mock.supabase.local/**", async (route: Route) => {
    const req = route.request();
    const url = new URL(req.url());
    let body: unknown = null;
    try {
      body = req.postDataJSON();
    } catch {}
    const headers = Object.fromEntries(Object.entries(req.headers()).map(([k, v]) => [k.toLowerCase(), v]));
    const res = handle(state, { method: req.method(), path: url.pathname, search: url.searchParams, headers, body, bodySize: req.postDataBuffer()?.length ?? 0 });
    const extra = res.headers ?? {};
    if (res.body !== undefined) return route.fulfill({ status: res.status, contentType: res.contentType ?? "application/json", headers: extra, body: JSON.stringify(res.body) });
    return route.fulfill({ status: res.status, headers: extra, ...(res.contentType ? { contentType: res.contentType } : {}), body: res.text ?? "" });
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
