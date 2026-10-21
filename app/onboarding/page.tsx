import type { Metadata } from "next";
import { RegisterFlow } from "@/components/account/signup/RegisterFlow";

export const metadata: Metadata = { title: "Finish your account", robots: { index: false, follow: false } };

// Signed-in users with an incomplete profile land here (Google, magic link, an interrupted sign-up, v7/v8 accounts).
export default function OnboardingPage() {
  return <RegisterFlow mode="onboarding" />;
}
