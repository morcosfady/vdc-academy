import type { Metadata } from "next";
import { ProfileScreen } from "@/components/account/ProfileScreen";

export const metadata: Metadata = { title: "Profile", robots: { index: false } };

export default function ProfilePage() {
  return <ProfileScreen />;
}
