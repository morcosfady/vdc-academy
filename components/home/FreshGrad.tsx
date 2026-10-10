"use client";

import Link from "next/link";
import { Counter } from "@/components/ui/Counter";
import { confetti } from "@/lib/confetti";
import { site } from "@/config/site";

export function FreshGrad() {
  return (
    <section className="px-4 py-12 md:px-6">
      <div className="mx-auto grid max-w-7xl items-center gap-8 overflow-hidden rounded-card bg-gradient-to-br from-brand-primary to-[#0a1d23] p-8 text-white md:grid-cols-2 md:p-14">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-white/70">G-701 · FRESH GRADUATES</p>
          <h2 className="mt-3 text-3xl font-bold md:text-4xl">🎓 Just graduated? This is your launchpad.</h2>
          <ul className="mt-6 space-y-2 text-white/85">
            <li>Biggest discount of any group, up to {site.freshGradMaxDiscount}% off</li>
            <li>Eligible if you graduated within the last 24 months</li>
            <li>Upload your graduation certificate or transcript to verify</li>
          </ul>
          <Link
            href="/fresh-graduates"
            onMouseEnter={(e) => confetti(e.currentTarget)}
            onClick={(e) => confetti(e.currentTarget)}
            className="mt-8 inline-flex rounded-btn bg-white px-6 py-3 font-heading text-sm font-bold uppercase tracking-wide text-[#365b62] hover:bg-brand-warm"
          >
            See the fresh grad offer
          </Link>
        </div>
        <div className="text-center" aria-hidden>
          <div className="font-heading text-8xl font-bold text-brand-warm md:text-9xl">
            <Counter to={site.freshGradMaxDiscount} suffix="%" />
          </div>
          <p className="mt-2 text-white/80">off, up to</p>
        </div>
      </div>
    </section>
  );
}
