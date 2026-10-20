import type { Metadata } from "next";
import { LoginScreen } from "@/components/account/LoginScreen";

export const metadata: Metadata = { title: "Log in", description: "Log in to your VDC Academy student account.", robots: { index: false } };

export default function LoginPage() {
  return <LoginScreen />;
}
