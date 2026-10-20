import type { Metadata } from "next";
import { SignupScreen } from "@/components/account/SignupScreen";

export const metadata: Metadata = { title: "Sign up", description: "Create your VDC Academy student account.", robots: { index: false } };

export default function SignupPage() {
  return <SignupScreen />;
}
