import type { Metadata } from "next";
import { Instructors } from "@/components/admin/views/Instructors";

// AD-430: instructor verification. Pending teaching profiles first, then approved and not approved.
export const metadata: Metadata = { title: "Instructors", robots: { index: false, follow: false } };

export default function AdminInstructorsPage() {
  return <Instructors />;
}
