import type { Metadata } from "next";
import { Dashboard } from "@/components/account/Dashboard";

export const metadata: Metadata = { title: "Dashboard", robots: { index: false } };

export default function AccountPage() {
  return <Dashboard />;
}
