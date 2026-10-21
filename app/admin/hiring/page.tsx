import type { Metadata } from "next";
import { Hiring } from "@/components/admin/views/Hiring";

// AD-420: the hiring requests inbox, newest first, with the status changed inline.
export const metadata: Metadata = { title: "Hiring requests", robots: { index: false, follow: false } };

export default function AdminHiringPage() {
  return <Hiring />;
}
