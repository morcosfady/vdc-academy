"use client";

import { LazyMotion } from "motion/react";
import { afterInteraction } from "@/lib/interaction";

// Motion's animation features load after hydration (smaller first load). Components use `m.*`.
const features = () => afterInteraction().then(() => import("./motionFeatures")).then((mod) => mod.default);

export function MotionProvider({ children }: { children: React.ReactNode }) {
  return <LazyMotion features={features}>{children}</LazyMotion>;
}
