import type { Metadata } from "next";
import { Users } from "@/components/admin/views/Users";

// AD-400: students, recruiters and the academy team in one table. The query string may preselect type or verification.
export const metadata: Metadata = { title: "Users", robots: { index: false, follow: false } };

export default function AdminUsersPage() {
  return <Users />;
}
