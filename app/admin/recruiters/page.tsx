import type { Metadata } from "next";
import { Recruiters } from "@/components/admin/views/Recruiters";

// AD-410: recruiter verification. Pending companies first, then approved and not approved.
export const metadata: Metadata = { title: "Recruiters", robots: { index: false, follow: false } };

export default function AdminRecruitersPage() {
  return <Recruiters />;
}
