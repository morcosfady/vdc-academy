import type { Metadata } from "next";
import { ApplicationDetail } from "@/components/admin/views/ApplicationDetail";

// AD-210: one application. The static export has no dynamic segments, so the id comes from `?id=`.
export const metadata: Metadata = { title: "Application", robots: { index: false, follow: false } };

export default function AdminApplicationPage() {
  return <ApplicationDetail />;
}
