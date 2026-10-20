// Pricing plans. DRAFT prices written by the studio, owner to confirm. Set `price` to a number (USD) to show real prices everywhere. While it is null the pages
// say "Price on request" and offer the price list by email.
export type Plan = { id: string; name: string; note: string; feats: string[]; price: number | null; featured?: boolean };

const draft: Plan[] = [
  { id: "single", name: "Single course", note: "One program at your pace", feats: ["One program of your choice", "Real project files", "Certificate of completion"], price: 1200 },
  { id: "track", name: "Track bundle", note: "Several programs, one path", feats: ["Multiple programs on one floor path", "Portfolio review", "Certificate of completion"], price: 3900, featured: true },
  { id: "bootcamp", name: "VDC Bootcamp", note: "The flagship", feats: ["All core tracks", "Capstone project", "Career support: CV, interviews, LinkedIn"], price: 6900 },
];

// Plan prices follow the same switch as program prices (content/programs.ts).
import { pricesConfirmed } from "./programs";
// The studio drafts, for the owner's /content-status/ page only (never rendered as prices on public pages).
export const draftPlans: readonly Plan[] = draft;
export const plans: Plan[] = draft.map((p) => (pricesConfirmed ? p : { ...p, price: null }));

export const pricesKnown = () => plans.some((p) => p.price !== null);
