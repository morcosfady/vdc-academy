// First-touch UTM capture. Stored in localStorage (wrapped, it can be blocked) and attached to applications.
const KEY = "vdc-utm";

export function captureUtm() {
  try {
    if (localStorage.getItem(KEY)) return;
    const p = new URLSearchParams(window.location.search);
    const utm = { source: p.get("utm_source"), medium: p.get("utm_medium"), campaign: p.get("utm_campaign") };
    if (utm.source || utm.medium || utm.campaign) localStorage.setItem(KEY, JSON.stringify(utm));
  } catch {}
}

export function readUtm(): { source: string | null; medium: string | null; campaign: string | null } {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "null") ?? { source: null, medium: null, campaign: null };
  } catch {
    return { source: null, medium: null, campaign: null };
  }
}
