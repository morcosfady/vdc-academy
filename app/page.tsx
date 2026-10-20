import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { Hero } from "@/components/home/Hero";
import { pageMeta } from "@/components/seo/meta";

export const metadata: Metadata = pageMeta({ title: "BIM and VDC Training in Fort Worth, TX | VDC Academy", description: "Hands-on BIM and VDC training in Revit, Navisworks, clash detection and 4D simulation, taught by working professionals from Bay BIM Designs in Texas.", path: "/", og: "home", absoluteTitle: true });

// Rhythm: light, dark, light, dark, light, light, dark. Each section is a different composition.
// Below-the-fold sections are separate chunks: still rendered to HTML on the server, hydrated in small slices.
const Explorer = dynamic(() => import("@/components/home/Explorer").then((m) => m.Explorer));
const Why = dynamic(() => import("@/components/home/Why").then((m) => m.Why));
const Programs = dynamic(() => import("@/components/home/Programs").then((m) => m.Programs));
const Path = dynamic(() => import("@/components/home/Path").then((m) => m.Path));
const Grads = dynamic(() => import("@/components/home/Grads").then((m) => m.Grads));
const Final = dynamic(() => import("@/components/home/Final").then((m) => m.Final));

export default function Home() {
  return (
    <>
      <Hero />
      <Explorer />
      <Why />
      <Programs />
      <Path />
      <Grads />
      <Final />
    </>
  );
}
