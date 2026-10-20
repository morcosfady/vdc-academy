import type { Metadata } from "next";
import { Applications } from "@/components/admin/views/Applications";

// AD-200: the applications table. Filters come from the query string (status, discount, program), never search text.
export const metadata: Metadata = { title: "Applications", robots: { index: false, follow: false } };

export default function AdminApplicationsPage() {
  return <Applications />;
}
