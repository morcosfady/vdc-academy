import type { Metadata } from "next";
import { Success } from "@/components/apply/Success";

export const metadata: Metadata = { title: "Application received", robots: { index: false } };

export default function SuccessPage() {
  return <Success />;
}
