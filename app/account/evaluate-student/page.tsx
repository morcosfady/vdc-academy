import type { Metadata } from "next";
import { InstructorEvaluateScreen } from "@/components/evaluations/InstructorEvaluateScreen";

// I-210: an approved instructor evaluates one of the students assigned to them (?student=<id>). Private: noindex.
export const metadata: Metadata = { title: "Evaluate a student", robots: { index: false, follow: false } };

export default function EvaluateStudentPage() {
  return <InstructorEvaluateScreen />;
}
