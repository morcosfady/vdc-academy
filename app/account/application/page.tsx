import type { Metadata } from "next";
import { ApplicationScreen } from "@/components/account/ApplicationScreen";

export const metadata: Metadata = { title: "Application", robots: { index: false } };

// Static export cannot build /account/application/[id]/ for ids that only exist at runtime, so this one page
// reads `?id=` on the client (useQueryParam in components/account/useNext.ts) and loads the row through RLS.
export default function ApplicationPage() {
  return <ApplicationScreen />;
}
