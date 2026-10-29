import type { Metadata } from "next";
import { EvaluateScreen } from "@/components/evaluations/EvaluateScreen";

// R-210: a verified recruiter writes an evaluation of one student (?student=<id>). Private: noindex.
export const metadata: Metadata = { title: "Evaluate a student", robots: { index: false, follow: false } };

export default function EvaluatePage() {
  return <EvaluateScreen />;
}
