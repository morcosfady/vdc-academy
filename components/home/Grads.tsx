"use client";

import { useState } from "react";
import { media } from "@/content/media";
import { copy } from "@/content/copy";
import { discounts, freshGradMonths } from "@/config/discounts";
import { Photo } from "@/components/ui/Photo";
import { Button } from "@/components/ui/Button";
import { Slab } from "@/components/ui/Slab";
import { Modal } from "@/components/ds/Overlays";
import { Select } from "@/components/ds/Forms";
import { track } from "@/lib/analytics";

const degrees = ["Architecture", "Civil engineering", "Mechanical engineering", "Electrical engineering", "Construction management", "Other engineering", "Something else"];

// Graduation is treated as the end of June of the graduation year.
function monthsSince(year: number) {
  const now = new Date();
  return (now.getFullYear() - year) * 12 + (now.getMonth() - 5);
}

// Two-question quiz in a modal. Used on the home page and on /fresh-graduates.
export function QualifyQuiz({ className }: { className?: string }) {
  const q = copy.grads.quiz;
  const year = new Date().getFullYear();
  const [open, setOpen] = useState(false);
  const [gradYear, setGradYear] = useState("");
  const [degree, setDegree] = useState("");
  const [result, setResult] = useState<null | boolean>(null);
  const years = Array.from({ length: 8 }, (_, i) => String(year + 1 - i));

  function check(e: React.FormEvent) {
    e.preventDefault();
    const y = Number(gradYear);
    const qualified = Boolean(y) && monthsSince(y) <= freshGradMonths && monthsSince(y) >= -12;
    setResult(qualified);
    track("fresh_grad_quiz_completed", { qualified });
  }
  function close() {
    setOpen(false);
    setResult(null);
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} className={className}>
        {copy.grads.primary}
      </Button>
      <Modal open={open} onClose={close} title={q.title}>
        {result === null ? (
          <form onSubmit={check} className="space-y-6">
            <Select label={q.year} options={["", ...years]} value={gradYear} onChange={(e) => setGradYear(e.target.value)} required />
            <Select label={q.degree} options={["", ...degrees]} value={degree} onChange={(e) => setDegree(e.target.value)} required />
            <Button type="submit" className="w-full">
              {q.submit}
            </Button>
          </form>
        ) : (
          <div aria-live="polite">
            {result ? (
              <>
                <p className="text-[3.5rem] font-semibold leading-none tracking-tight text-ink">{discounts.freshGrad.percent}%</p>
                <p className="mt-5 text-lg text-ink">{q.yes}</p>
                <p className="t-small mt-2">{q.yesNote}</p>
                <Button href="/apply?status=freshGrad" className="mt-7 w-full">
                  {q.applyYes}
                </Button>
              </>
            ) : (
              <>
                <p className="text-lg text-ink">{q.no(freshGradMonths)}</p>
                <p className="t-small mt-2">{q.noNote}</p>
                <Button href="/apply" className="mt-7 w-full">
                  {q.applyNo}
                </Button>
              </>
            )}
            <button type="button" onClick={() => setResult(null)} className="mono mt-6 hover:!text-ink">
              {q.again}
            </button>
          </div>
        )}
      </Modal>
    </>
  );
}

// S6. A paper-2 panel inside the paper page. Copy on the left, a portrait on the right.
export function Grads() {
  const c = copy.grads;
  const pct = discounts.freshGrad.percent;
  return (
    <section id="fresh-grads" aria-labelledby="grads-title" className="theme-light section !pt-0">
      <div className="wrap">
        <Slab>
          <div className="grid overflow-hidden rounded-[12px] bg-paper-2 lg:grid-cols-2">
            <div className="flex flex-col justify-center p-7 sm:p-10 lg:p-14 xl:p-20">
              <p className="mono">{c.tag}</p>
              <p className="mt-8 text-[clamp(4.5rem,3rem+6vw,8.5rem)] font-semibold leading-none tracking-[-0.04em] text-ink">
                <span data-discount>{pct}%</span>
              </p>
              <span aria-hidden className="draw-x mt-3 block h-[3px] w-24 bg-brass" />
              <h2 id="grads-title" className="mt-8 !text-[clamp(1.5rem,1.1rem+1.4vw,2rem)]">
                {c.title}
              </h2>
              <dl className="mt-8 max-w-md">
                {c.lines.map((l) => (
                  <div key={l.k} className="grid grid-cols-[88px_1fr] gap-4 border-t py-3" style={{ borderColor: "var(--rule)" }}>
                    <dt className="mono pt-1">{l.k}</dt>
                    <dd className="text-[15px] text-muted">{l.v}</dd>
                  </div>
                ))}
              </dl>
              <div className="mt-9 flex flex-col gap-5 sm:flex-row sm:items-center">
                <QualifyQuiz />
                <Button href="/fresh-graduates" variant="link">
                  {c.secondary}
                </Button>
              </div>
            </div>
            <figure className="img-wipe relative aspect-[4/5] max-h-[70svh] w-full lg:aspect-auto lg:max-h-none lg:min-h-[640px]">
              <Photo photo={media.grad.photo} alt={media.grad.alt} className="absolute inset-0 parallax-y" />
            </figure>
          </div>
        </Slab>
      </div>
    </section>
  );
}
