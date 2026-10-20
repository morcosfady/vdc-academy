import type { Metadata } from "next";
import { Leads } from "@/components/admin/views/Leads";

// AD-300: leads, contact messages and account deletion requests.
export const metadata: Metadata = { title: "Leads and messages", robots: { index: false, follow: false } };

export default function AdminLeadsPage() {
  return <Leads />;
}
