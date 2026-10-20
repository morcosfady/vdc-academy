import type { Metadata } from "next";
import { ResetPasswordScreen } from "@/components/account/ResetPasswordScreen";

export const metadata: Metadata = { title: "New password", robots: { index: false } };

export default function ResetPasswordPage() {
  return <ResetPasswordScreen />;
}
