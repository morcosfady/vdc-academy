import type { Metadata } from "next";
import { Overview } from "@/components/admin/views/Overview";

// AD-100: the admin overview. Client-side gated by RequireAuth(admin); Row Level Security is the real protection.
export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };

export default function AdminPage() {
  return <Overview />;
}
