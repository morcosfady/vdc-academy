// Small formatting helpers for the account screens.
export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

// File extension for a storage path: letters and digits only, at most five.
export const extOf = (file: File) => file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5) || "bin";

export const shortId = (id: string) => id.replace(/-/g, "").slice(0, 8).toUpperCase();

// Password strength for the hint under the field: weak under 8, strong at 10+ with a digit or a symbol.
export function passwordStrength(pw: string): "weak" | "ok" | "strong" {
  if (pw.length < 8) return "weak";
  const mixed = /\d/.test(pw) && /[^A-Za-z0-9]/.test(pw);
  if (pw.length >= 12 || (pw.length >= 10 && mixed)) return "strong";
  return "ok";
}
