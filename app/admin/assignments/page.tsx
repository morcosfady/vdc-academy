import type { Metadata } from "next";
import { Assignments } from "@/components/admin/views/Assignments";

// AD-440: the team assigns students to approved instructors. Instructors see only the students assigned to them.
export const metadata: Metadata = { title: "Assignments", robots: { index: false, follow: false } };

export default function AdminAssignmentsPage() {
  return <Assignments />;
}
