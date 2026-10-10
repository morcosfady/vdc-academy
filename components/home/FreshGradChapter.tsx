"use client";

import { useRef, useState } from "react";
import { photos } from "@/assets/images";
import { BlueprintLayer } from "@/components/ui/BlueprintLayer";
import { Photo } from "@/components/ui/Photo";
import { SweepOnce } from "@/components/ui/SweepOnce";
import { Button } from "@/components/ui/Button";
import { CountUp } from "@/components/ui/CountUp";
import { Slab } from "@/components/ui/Slab";
import { confetti } from "@/lib/confetti";
import { discounts, freshGradMonths } from "@/config/discounts";
import { cn } from "@/lib/utils";

const degrees = ["Architecture", "Civil engineering", "Mechanical engineering", "Electrical engineering", "Construction management", "Other engineering", "Something else"];

// Graduation is treated as the end of June of the graduation year.
function monthsSince(year: number) {
  const now = new Date();
  return (now.getFullYear() - year) * 12 + (now.getMonth() - 5);
}

export function QualifyQuiz({ id = "quiz" }: { id?: string }) {
  const dlg = useRef<HTMLDialogElement>(null);
  const year = new Date().getFullYear();
  const [gradYear, setGradYear] = useState<number | "">("");
  const [degree, setDegree] = useState("");
  const [result, setResult] = useState<null | boolean>(null);
  const btn = useRef<HTMLButtonElement>(null);

  const qualifies = gradYear !== "" && monthsSince(gradYear) <= freshGradMonths && monthsSince(gradYear) >= -12;

  function check(e: React.FormEvent) {
    e.preventDefault();
    setResult(qualifies);
    if (qualifies && btn.current) confetti(btn.current);
  }
  function close() {
    dlg.current?.close();
    setResult(null);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => dlg.current?.showModal()}
        className="inline-flex h-[52px] items-center justify-center rounded-[10px] bg-cta px-7 text-[15px] font-medium text-cta-text shadow-[0_8px_26px_-10px_var(--glow)] transition-[box-shadow,background-color] hover:bg-cta-hover hover:shadow-[0_12px_38px_-6px_var(--glow)]"
      >
        Check if I qualify
      </button>
      <dialog
        ref={dlg}
        id={id}
        aria-labelledby={`${id}-title`}
        onClose={() => setResult(null)}
        className="glass m-auto w-[min(92vw,520px)] bg-solid p-0 text-text backdrop:bg-black/70 backdrop:backdrop-blur-sm"
      >
        <div className="p-7 md:p-9">
          <div className="mb-6 flex items-start justify-between gap-4">
            <h2 id={`${id}-title`} className="display-md !text-2xl">Do you qualify?</h2>
            <button type="button" onClick={close} aria-label="Close" className="meta hover:!text-text">Close</button>
          </div>

          {result === null ? (
            <form onSubmit={check} className="space-y-5">
              <label className="block text-sm">
                <span className="meta mb-2 block">When did you graduate?</span>
                <select required value={gradYear} onChange={(e) => setGradYear(e.target.value ? Number(e.target.value) : "")} className="h-12 w-full border border-border bg-bg px-3">
                  <option value="">Select a year</option>
                  {Array.from({ length: 8 }, (_, i) => year + 1 - i).map((y) => (
                    <option key={y} value={y}>{y}{y > year ? " (expected)" : ""}</option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                <span className="meta mb-2 block">Your degree</span>
                <select required value={degree} onChange={(e) => setDegree(e.target.value)} className="h-12 w-full border border-border bg-bg px-3">
                  <option value="">Select a degree</option>
                  {degrees.map((d) => <option key={d}>{d}</option>)}
                </select>
              </label>
              <button ref={btn} type="submit" className="h-[52px] w-full rounded-[10px] bg-cta px-6 text-[15px] font-medium text-cta-text hover:bg-cta-hover">
                See my result
              </button>
            </form>
          ) : (
            <div aria-live="polite">
              {result ? (
                <>
                  <p className="text-5xl font-semibold text-warm">{discounts.freshGrad.percent}%</p>
                  <p className="mt-4 text-lg">You qualify for the fresh graduate discount, pending verification.</p>
                  <p className="mt-2 text-sm text-muted">Upload your graduation certificate or transcript with your application.</p>
                  <Button href="/apply?status=freshGrad" variant="glow" className="mt-6 w-full">Apply with my discount</Button>
                </>
              ) : (
                <>
                  <p className="text-lg">Your graduation date is outside the {freshGradMonths}-month window.</p>
                  <p className="mt-2 text-sm text-muted">You may still qualify for the student discount or the early bird price. Apply and we will check.</p>
                  <Button href="/apply" variant="glow" className="mt-6 w-full">Apply anyway</Button>
                </>
              )}
              <button type="button" onClick={() => setResult(null)} className={cn("meta mt-5 hover:!text-text")}>Check again</button>
            </div>
          )}
        </div>
      </dialog>
    </>
  );
}

export function FreshGradChapter() {
  return (
    <section id="ch-5" aria-labelledby="grad-title" className="theme-light band-both relative overflow-hidden py-52">
      <BlueprintLayer className="drift pointer-events-none absolute inset-0 h-full w-full text-[#1f5c99] opacity-[0.06]" />
      <SweepOnce />
      <div className="relative z-10 mx-auto grid max-w-[1280px] items-center gap-12 px-5 md:px-8 lg:grid-cols-12">
        <div className="lg:col-span-6">
          <p className="label mb-6">05 · Fresh graduates</p>
          <p className="font-semibold leading-[0.9] tracking-tighter text-text" style={{ fontFamily: "var(--font-head), sans-serif", fontSize: "clamp(5.5rem, 13vw, 11rem)" }}>
            <CountUp to={discounts.freshGrad.percent} suffix="%" />
          </p>
          <Slab><div className="draw-x mt-2 h-1 w-40 bg-warm" aria-hidden /></Slab>
          <p className="meta mt-4">off, our biggest discount</p>
          <Slab className="mt-10">
            <h2 id="grad-title" className="display-md max-w-[18ch]">Just graduated? Your first job starts here.</h2>
            <ul className="mt-8 grid gap-4 text-muted sm:grid-cols-3">
              <li className="border-t border-border pt-4"><span className="label mb-2 block !text-text">Who</span>Graduated in the last {freshGradMonths} months</li>
              <li className="border-t border-border pt-4"><span className="label mb-2 block !text-text">Upload</span>Your certificate or transcript</li>
              <li className="border-t border-border pt-4"><span className="label mb-2 block !text-text">Get</span>The biggest discount and career support</li>
            </ul>
            <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4">
              <QualifyQuiz />
              <Button href="/fresh-graduates" variant="link">See the offer <span aria-hidden>→</span></Button>
            </div>
          </Slab>
        </div>
        <Slab index={1} className="lg:col-span-6">
          <figure className="relative overflow-hidden rounded-2xl shadow-[0_30px_70px_-30px_rgba(10,29,35,0.55)]">
            <Photo photo={photos.crane} alt="Steel frame of a building under construction with tower cranes" className="aspect-[14/11]" />
            <figcaption className="absolute bottom-5 start-5 rounded-lg bg-[#0a1d23]/85 px-4 py-2.5 text-sm text-[#eaf2f7]">
              Your first model could be on a site like this.
            </figcaption>
          </figure>
        </Slab>
      </div>
    </section>
  );
}
