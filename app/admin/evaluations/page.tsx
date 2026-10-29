import type { Metadata } from "next";
import { Evaluations } from "@/components/admin/views/Evaluations";

// AD-400: moderate the evaluations recruiters wrote about students. Publish or hide; hiding needs a note.
export const metadata: Metadata = { title: "Evaluations", robots: { index: false, follow: false } };

export default function AdminEvaluationsPage() {
  return <Evaluations />;
}
