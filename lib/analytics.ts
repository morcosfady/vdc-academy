import type { CurrentStatus } from "./db";

// Cookieless, events-only analytics (Umami or Plausible), off unless the build has the NEXT_PUBLIC_ANALYTICS_* vars.
// See docs/ANALYTICS.md. `track` never throws and never sends personal data: every event has a fixed list of props,
// each checked by type and shape, and anything else is dropped. No emails, names, phones or free text, ever.
// Nothing is sent with Do Not Track on, in the client demo (/demo/) or with the test mock on.

const PROVIDER = process.env.NEXT_PUBLIC_ANALYTICS_PROVIDER;
const SCRIPT = process.env.NEXT_PUBLIC_ANALYTICS_SCRIPT;
const WEBSITE_ID = process.env.NEXT_PUBLIC_ANALYTICS_WEBSITE_ID;
const DOMAIN = process.env.NEXT_PUBLIC_ANALYTICS_DOMAIN;

export type AnalyticsProvider = "umami" | "plausible";

// Build-time: what the Analytics component injects, or null when analytics is off in this build.
export const analyticsConfig: { provider: AnalyticsProvider; script: string; id: string } | null =
  PROVIDER === "umami" && SCRIPT && WEBSITE_ID
    ? { provider: "umami", script: SCRIPT, id: WEBSITE_ID }
    : PROVIDER === "plausible" && SCRIPT && DOMAIN
      ? { provider: "plausible", script: SCRIPT, id: DOMAIN }
      : null;

type Discount = "freshGrad" | "student" | "none";

export type AnalyticsEvents = {
  apply_started: Record<string, never>;
  apply_step_completed: { step: number };
  apply_submitted: { programs_count: number; discount: Discount };
  signup_completed: { status: CurrentStatus | null; account_type?: "student" | "recruiter" | "team" };
  price_list_requested: Record<string, never>;
  fresh_grad_quiz_completed: { qualified: boolean };
  company_form_submitted: { size?: string };
  program_viewed: { slug: string };
};
export type AnalyticsEvent = keyof AnalyticsEvents;
type Props = Record<string, string | number | boolean>;
type Rule = (v: unknown) => string | number | boolean | undefined;

const int = (min: number, max: number): Rule => (v) => (typeof v === "number" && Number.isInteger(v) && v >= min && v <= max ? v : undefined);
const oneOf = (...xs: string[]): Rule => (v) => (typeof v === "string" && xs.includes(v) ? v : undefined);
const bool: Rule = (v) => (typeof v === "boolean" ? v : undefined);
const pattern = (re: RegExp): Rule => (v) => (typeof v === "string" && re.test(v) ? v : undefined);

// The whitelist. A prop not listed here never leaves the page.
const rules: Record<AnalyticsEvent, Record<string, Rule>> = {
  apply_started: {},
  apply_step_completed: { step: int(1, 5) },
  apply_submitted: { programs_count: int(0, 50), discount: oneOf("freshGrad", "student", "none") },
  signup_completed: { status: oneOf("fresh_grad", "student", "professional", "career_changer", "other"), account_type: oneOf("student", "recruiter", "team") },
  price_list_requested: {},
  fresh_grad_quiz_completed: { qualified: bool },
  company_form_submitted: { size: pattern(/^[0-9A-Za-z ]{1,24}$/) }, // a team size bucket like "6 to 10"
  program_viewed: { slug: pattern(/^[a-z0-9-]{1,80}$/) },
};

function clean(event: AnalyticsEvent, props: object | undefined): Props {
  const out: Props = {};
  const r = rules[event];
  for (const [k, v] of Object.entries(props ?? {})) {
    const ok = Object.prototype.hasOwnProperty.call(r, k) ? r[k](v) : undefined;
    if (ok !== undefined) out[k] = ok;
  }
  return out;
}

const flag = (key: string) => {
  try {
    return localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
};

// Runtime: configured, and not opted out, not the demo, not the mock (same switches as lib/supabase.ts).
export function analyticsAllowed(): boolean {
  if (!analyticsConfig || typeof window === "undefined") return false;
  try {
    if (navigator.doNotTrack === "1") return false;
    if (new URLSearchParams(window.location.search).get("mock") === "1") return false;
  } catch {
    return false;
  }
  return !flag("vdc-demo") && !flag("vdc-mock");
}

// Debug: with localStorage["vdc-track-debug"] = "1" the last 50 cleaned events are kept here and on
// window.__vdcEvents, whether or not anything is sent (tests and the mock use it; no provider is needed).
export type TrackEntry = { event: AnalyticsEvent; props: Props };
export const trackLog: TrackEntry[] = [];

declare global {
  interface Window {
    umami?: { track: (name: string, data?: Props) => void };
    plausible?: (name: string, options?: { props?: Props }) => void;
    __vdcEvents?: TrackEntry[];
  }
}

// Events fired before the provider script has loaded wait here; the Analytics component flushes them on load.
const pending: TrackEntry[] = [];

function send(e: TrackEntry): boolean {
  if (analyticsConfig?.provider === "umami" && window.umami) {
    window.umami.track(e.event, e.props);
    return true;
  }
  if (analyticsConfig?.provider === "plausible" && window.plausible) {
    window.plausible(e.event, { props: e.props });
    return true;
  }
  return false;
}

export function flushAnalytics() {
  try {
    while (pending.length && send(pending[0])) pending.shift();
  } catch {}
}

export function track<E extends AnalyticsEvent>(event: E, props?: AnalyticsEvents[E]) {
  try {
    if (typeof window === "undefined") return;
    const e: TrackEntry = { event, props: clean(event, props) };
    if (flag("vdc-track-debug")) {
      trackLog.push(e);
      if (trackLog.length > 50) trackLog.shift();
      window.__vdcEvents = trackLog;
    }
    if (!analyticsAllowed()) return;
    if (!send(e) && pending.length < 20) pending.push(e);
  } catch {}
}

// Once per page load (a full load, not a client-side navigation).
const fired = new Set<AnalyticsEvent>();
export function trackOnce<E extends AnalyticsEvent>(event: E, props?: AnalyticsEvents[E]) {
  if (fired.has(event)) return;
  fired.add(event);
  track(event, props);
}
