import type { Metadata } from "next";
import { AuthCallback } from "@/components/account/AuthCallback";

export const metadata: Metadata = { title: "Signing you in", robots: { index: false } };

export default function AuthCallbackPage() {
  return <AuthCallback />;
}
