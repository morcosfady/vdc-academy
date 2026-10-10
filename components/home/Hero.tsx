"use client";

import dynamic from "next/dynamic";
import { motion } from "motion/react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { WhenVisible } from "@/components/three/WhenVisible";
import { SceneFallback } from "@/components/three/SceneFallback";
import { site } from "@/config/site";

const HeroScene = dynamic(() => import("@/components/three/HeroScene"), { ssr: false });

const headline = "Become the BIM & VDC Expert Every Project Needs.".split(" ");

export function Hero() {
  return (
    <section className="blueprint-grid relative isolate flex min-h-[calc(100svh-96px)] items-center overflow-hidden">
      <WhenVisible
        className="absolute inset-0 -z-10 opacity-60 md:inset-y-0 md:start-[35%] md:opacity-100"
        fallback={<SceneFallback />}
        label="3D model of a multi-story building assembling itself: structure, then mechanical, plumbing and cable systems, then glass facade"
      >
        {(active) => <HeroScene active={active} />}
      </WhenVisible>
      <div className="mx-auto w-full max-w-7xl px-4 py-16 md:px-6">
        <p className="mb-4 font-mono text-xs uppercase tracking-[0.2em] text-text-muted">
          A-101 · Build it digitally before you build it for real
        </p>
        <h1 className="max-w-2xl text-4xl font-bold md:text-6xl">
          {headline.map((w, i) => (
            <motion.span
              key={i}
              className="me-[0.25em] inline-block"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.08, duration: 0.5 }}
            >
              {w}
            </motion.span>
          ))}
        </h1>
        <p className="mt-6 max-w-xl text-lg text-text-muted">
          Hands-on training in Revit, Navisworks, clash detection, and virtual construction, taught by working
          professionals from Bay BIM Designs.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-4">
          <Button href="/apply" variant="glow">
            Apply Now
          </Button>
          <Button href="/programs" variant="secondary">
            Explore Programs
          </Button>
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-3 text-sm text-text-muted">
          <Badge>🎓 Fresh grad? Get up to {site.freshGradMaxDiscount}% off</Badge>
          <span>Taught by the team behind {site.parent}, {site.city}.</span>
        </div>
      </div>
      <div aria-hidden className="absolute inset-x-0 bottom-4 flex justify-center">
        <div className="h-10 w-6 rounded-full border border-border p-1">
          <div className="mx-auto h-2 w-1 animate-bounce rounded-full bg-brand-accent" />
        </div>
      </div>
    </section>
  );
}
