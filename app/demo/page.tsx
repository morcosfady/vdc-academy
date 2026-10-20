import type { Metadata } from "next";
import { DemoTour } from "@/components/demo/DemoTour";

export const metadata: Metadata = { title: "Client demo", description: "A guided tour of VDC Academy accounts, applications and the admin area on sample data.", robots: { index: false, follow: false } };

export default function DemoPage() {
  return <DemoTour />;
}
