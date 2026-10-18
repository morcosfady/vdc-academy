"use client";

import { useEffect, useRef } from "react";
import { copy } from "@/content/copy";
import { loadGsap } from "@/lib/gsap";
import { afterInteraction } from "@/lib/interaction";
import { SectionHeader } from "@/components/ds/Sections";
import { Button } from "@/components/ui/Button";
import { Slab } from "@/components/ui/Slab";
import { useReduceMotion } from "@/hooks/useReduceMotion";

// S5. Paper. A building section drawn left (foundation) to right (roof): five floors, five job titles.
// The lines draw themselves as the section scrolls through the viewport (--draw 0..1), floor by floor.
const W = 1320;
const COL = W / 5;
const GROUND = 372;
const STEP = 62;
const SLAB = 10;

function stage(i: number) {
  const x0 = i * COL + 24;
  const x1 = (i + 1) * COL - 24;
  const top = GROUND - (i + 1) * STEP; // top of this stage's slab
  const below = i === 0 ? GROUND : GROUND - i * STEP; // where the columns land
  return { x0, x1, top, below };
}

export function Path() {
  const c = copy.path;
  const section = useRef<HTMLElement>(null);
  const reduce = useReduceMotion();

  useEffect(() => {
    const el = section.current;
    if (!el) return;
    if (reduce) {
      el.style.setProperty("--draw", "1");
      return;
    }
    el.style.setProperty("--draw", "0");
    let kill = () => {};
    let cancelled = false;
    afterInteraction(6000).then(loadGsap).then(({ ScrollTrigger }) => {
      if (cancelled) return;
      const st = ScrollTrigger.create({
        trigger: el.querySelector("svg") ?? el,
        start: "top 88%",
        end: "bottom 60%",
        scrub: 0.4,
        onUpdate: (self) => el.style.setProperty("--draw", String(self.progress)),
      });
      kill = () => st.kill();
    });
    // Safety: never leave the drawing blank
    const t = window.setTimeout(() => {
      if (Number(el.style.getPropertyValue("--draw")) < 1 && el.getBoundingClientRect().top < window.innerHeight) el.style.setProperty("--draw", "1");
    }, 6000);
    return () => {
      cancelled = true;
      kill();
      window.clearTimeout(t);
    };
  }, [reduce]);

  const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 1.25, vectorEffect: "non-scaling-stroke" as const };
  const draw = (i: number) => ({ "--f": i } as React.CSSProperties);

  return (
    <section ref={section} id="path" aria-labelledby="path-title" className="theme-light section path">
      <div className="wrap">
        <Slab>
          <SectionHeader sheet={c.sheet} name={c.name} title={<span id="path-title">{c.title}</span>} lead={c.lead} />
        </Slab>

        {/* Desktop: the section drawing, labels aligned under each stage */}
        <div className="mt-16 hidden lg:block">
          <svg viewBox={`0 0 ${W} 400`} className="h-auto w-full text-ink" role="img" aria-label="Section drawing of a five storey stepped building, one floor per stage of the learning path">
            {/* ground line and foundation hatch */}
            <path d={`M0 ${GROUND} H${W}`} {...stroke} pathLength={1} className="pl" style={draw(0)} />
            {Array.from({ length: 12 }, (_, k) => (
              <path key={k} d={`M${26 + k * 20} ${GROUND + 14} l10 -12`} {...stroke} pathLength={1} className="pl" style={draw(0)} opacity={0.5} />
            ))}
            {c.floors.map((_, i) => {
              const s = stage(i);
              const right = W - 24;
              return (
                <g key={i} className="pl" style={draw(i)}>
                  {/* slab: runs from this stage to the right edge, so the floors step up like terraces */}
                  <path d={`M${s.x0} ${s.top} H${right} v${SLAB} H${s.x0} z`} {...stroke} pathLength={1} />
                  {/* columns at the stage edge and the far right, down to the floor below */}
                  <path d={`M${s.x0 + 28} ${s.top + SLAB} V${s.below}`} {...stroke} pathLength={1} />
                  <path d={`M${right - 28} ${s.top + SLAB} V${s.below}`} {...stroke} pathLength={1} />
                  {/* glass line and mullions on the terrace edge */}
                  <path d={`M${s.x0 + 6} ${s.top + SLAB} V${s.below - 2}`} {...stroke} pathLength={1} opacity={0.45} />
                  {/* floor-to-floor dimension on the first stage */}
                  {i === 0 && (
                    <>
                      <path d={`M${s.x0 - 14} ${s.top} V${s.below}`} {...stroke} pathLength={1} opacity={0.5} />
                      <path d={`M${s.x0 - 20} ${s.top} h12 M${s.x0 - 20} ${s.below} h12`} {...stroke} pathLength={1} opacity={0.5} />
                    </>
                  )}
                  {/* roof plant on the last stage */}
                  {i === c.floors.length - 1 && (
                    <>
                      <path d={`M${s.x0 + 70} ${s.top} v-24 h60 v24`} {...stroke} pathLength={1} />
                      <path d={`M${right - 120} ${s.top} v-14 h44 v14`} {...stroke} pathLength={1} />
                    </>
                  )}
                  {/* stage number in a grid bubble above the terrace */}
                  <circle cx={s.x0 + 28} cy={s.top - 24} r={13} {...stroke} pathLength={1} />
                  <text x={s.x0 + 28} y={s.top - 20} textAnchor="middle" fontSize="11" fontFamily="var(--font-mono)" fill="currentColor" className="pl-text">
                    {c.floors[i].n}
                  </text>
                </g>
              );
            })}
          </svg>
          <ol className="mt-4 grid grid-cols-5 gap-6">
            {c.floors.map((f, i) => (
              <li key={f.title} className="pl-label border-t pt-5" style={{ ...draw(i), borderColor: "var(--rule)" }}>
                <h3 className="!text-[1.25rem]">{f.title}</h3>
                <p className="mt-2 text-[15px] font-medium text-accent-text">{f.role}</p>
                <ul className="mt-3 space-y-1">
                  {f.skills.map((s) => (
                    <li key={s} className="t-small text-dim">
                      {s}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        </div>

        {/* Phones and tablets: vertical stack with a thin left rule */}
        <ol className="mt-12 border-s lg:hidden" style={{ borderColor: "var(--rule)" }}>
          {c.floors.map((f, i) => (
            <li key={f.title} className="relative ps-7 pb-10 last:pb-0">
              <span aria-hidden className="absolute -start-[7px] top-1.5 size-[13px] rounded-full border bg-paper" style={{ borderColor: "var(--slate)" }} />
              <p className="mono">{f.n}</p>
              <h3 className="mt-1 !text-[1.25rem]">{f.title}</h3>
              <p className="mt-1 text-[15px] font-medium text-accent-text">{f.role}</p>
              <p className="t-small mt-2 text-dim">{f.skills.join(" · ")}</p>
              {i < c.floors.length - 1 && <span className="sr-only">then</span>}
            </li>
          ))}
        </ol>

        <div className="mt-14">
          <Button href="/learning-path" variant="link">
            {c.cta}
          </Button>
        </div>
      </div>
    </section>
  );
}
