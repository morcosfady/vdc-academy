import type { Metadata } from "next";
import { Suspense } from "react";
import { ApplyFlow } from "@/components/apply/ApplyFlow";

export const metadata: Metadata = { title: "Apply", description: "Apply to a VDC Academy BIM and VDC program in five short steps." };

export default function ApplyPage() {
  return (
    <Suspense fallback={<div className="min-h-[80svh]" />}>
      <ApplyFlow />
    </Suspense>
  );
}
