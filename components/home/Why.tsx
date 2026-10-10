"use client";

import { useRef } from "react";
import { motion, useInView, useScroll, useTransform } from "motion/react";
import { Slab } from "@/components/ui/Slab";
import { Badge } from "@/components/ui/Badge";
import { useReduceMotion } from "@/hooks/useReduceMotion";

const benefits = ["Live training", "Real project files", "Job-ready tools", "Portfolio", "Career support", "Certificate"];
const software = ["Revit", "Navisworks", "AutoCAD", "Autodesk Construction Cloud", "Dynamo", "Enscape", "Bluebeam", "Primavera P6"];

// Visual 1: a blueprint that draws itself
function Blueprint() {
  const ref = useRef<SVGSVGElement>(null);
  const inView = useInView(ref, { once: true, margin: "-15%" });
  const reduce = useReduceMotion();
  const draw = (delay: number) => ({
    initial: { pathLength: reduce ? 1 : 0 },
    animate: { pathLength: inView || reduce ? 1 : 0 },
    transition: { duration: 1.8, delay, ease: [0.16, 1, 0.3, 1] as const },
  });
  return (
    <svg ref={ref} viewBox="0 0 320 220" className="h-full w-full" fill="none" stroke="var(--accent)" strokeWidth="1.2" aria-hidden>
      <motion.rect x="20" y="20" width="280" height="180" {...draw(0)} />
      <motion.path d="M20 90 H150 V20 M150 90 V200 M150 130 H300" {...draw(0.3)} />
      <motion.path d="M60 20 v8 M100 20 v8 M200 20 v8 M240 20 v8 M20 60 h8 M20 130 h8 M20 170 h8" {...draw(0.6)} />
      <motion.circle cx="85" cy="150" r="22" {...draw(0.8)} />
      <motion.path d="M210 60 h60 v40 h-60 z" stroke="#ffbc7d" {...draw(1)} />
      <motion.path d="M20 212 H300 M20 208 v8 M300 208 v8" stroke="var(--text-muted)" {...draw(1.2)} />
    </svg>
  );
}

// Visual 2: three layers moving at different speeds while you scroll past
function ParallaxStack() {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReduceMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y1 = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [50, -50]);
  const y2 = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [110, -110]);
  const y3 = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [20, -20]);
  const layer = "absolute glass h-3/5 w-3/5";
  return (
    <div ref={ref} className="relative h-full w-full" aria-hidden>
      <motion.div style={{ y: y3 }} className={`${layer} start-0 top-[8%]`}><div className="blueprint-lines h-full w-full" /></motion.div>
      <motion.div style={{ y: y1 }} className={`${layer} start-[22%] top-[22%]`}><div className="blueprint-lines h-full w-full opacity-70" /></motion.div>
      <motion.div style={{ y: y2 }} className={`${layer} start-[40%] top-[36%] border-accent`}><div className="blueprint-lines h-full w-full opacity-50" /></motion.div>
    </div>
  );
}

// Visual 3: portfolio cards that fan out
function Fan() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-20%" });
  const reduce = useReduceMotion();
  const open = inView || reduce;
  return (
    <div ref={ref} className="relative h-full w-full" aria-hidden>
      {[-14, 0, 14].map((rot, i) => (
        <motion.div
          key={rot}
          className="glass absolute inset-x-[18%] top-[10%] h-[78%] origin-bottom p-4"
          initial={{ rotate: 0 }}
          animate={{ rotate: open ? rot : 0, x: open ? rot * 4 : 0 }}
          transition={{ duration: 1.1, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="blueprint-lines h-3/5 w-full" />
          <div className="mt-3 h-2 w-3/4 bg-text/30" />
          <div className="mt-2 h-2 w-1/2 bg-text/15" />
        </motion.div>
      ))}
    </div>
  );
}

const statements = [
  { n: "01", text: "Taught by people who coordinate real projects.", visual: <Blueprint /> },
  { n: "02", text: "Practice on real-world project files.", visual: <ParallaxStack /> },
  { n: "03", text: "Leave with a portfolio, not just a certificate.", visual: <Fan /> },
];

export function Why() {
  return (
    <section id="ch-3" aria-labelledby="why-title" className="relative py-24 md:py-36">
      <div className="mx-auto max-w-[1600px] px-5 md:px-10">
        <p className="label mb-5">03 · Why VDC Academy</p>
        <h2 id="why-title" className="sr-only">Why VDC Academy</h2>
        <ul className="space-y-24 md:space-y-40">
          {statements.map((s, i) => (
            <li key={s.n} className={`grid items-center gap-8 md:grid-cols-2 md:gap-16 ${i % 2 ? "md:[&>*:first-child]:order-2" : ""}`}>
              <Slab>
                <p className="label mb-4">{s.n}</p>
                <p className="display-md max-w-[16ch]">{s.text}</p>
              </Slab>
              <Slab index={1} className="relative z-10 aspect-[4/3] w-full">
                {s.visual}
              </Slab>
            </li>
          ))}
        </ul>

        <Slab className="mt-28 md:mt-40">
          <ul className="grid grid-cols-2 gap-px border border-border bg-border sm:grid-cols-3 lg:grid-cols-6">
            {benefits.map((b, i) => (
              <li key={b} className="bg-bg p-5">
                <span className="label !text-accent-text">{String(i + 1).padStart(2, "0")}</span>
                <p className="mt-2 text-sm">{b}</p>
              </li>
            ))}
          </ul>
        </Slab>

        <Slab className="mt-16">
          <p className="label mb-4">Software you will use</p>
          <ul className="flex flex-wrap gap-2">
            {software.map((s) => (
              <li key={s}>
                <Badge className="px-4 py-2 transition-shadow hover:border-accent hover:shadow-[0_0_20px_var(--glow)]">{s}</Badge>
              </li>
            ))}
          </ul>
        </Slab>
      </div>
    </section>
  );
}
