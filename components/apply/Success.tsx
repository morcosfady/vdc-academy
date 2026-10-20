"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { SceneSlot } from "@/components/three/SceneSlot";
import { SheetTag } from "@/components/ds/Devices";
import { newState } from "@/lib/modelState";
import { pages } from "@/content/copy-pages";
import { applyCopy } from "@/content/copy-apply";

const c = pages.success;

// Paper. Thank you on the left with what happens next as a vertical timeline; the finished model on the right.
export function Success() {
  const state = useRef(newState({ lod: 400, sim: 1, mood: 0 }));
  const [info, setInfo] = useState<{ name: string; program: string; discount: string | null } | null>(null);

  useEffect(() => {
    try {
      setInfo(JSON.parse(sessionStorage.getItem("vdc-applied") ?? "null"));
    } catch {}
  }, []);

  return (
    <section className="theme-light pt-[72px]">
      <div className="wrap">
        <div className="grid-12 items-center gap-y-12 pb-24 pt-14 lg:pb-32 lg:pt-24">
          <div className="col-span-12 lg:col-span-6">
            <SheetTag sheet={c.sheet} name={c.name} />
            <h1 className="t-h1 mt-8 max-w-[14ch]">{c.title(info?.name)}</h1>
            {info?.program && <p className="t-lead mt-6">{c.program(info.program)}</p>}
            {info?.discount && <p className="mt-3 text-[15px] text-warm">{c.discount}</p>}

            <p className="mono mt-12">{c.nextTitle}</p>
            <ol className="mt-5 border-s" style={{ borderColor: "var(--rule)" }}>
              {c.next.map((n, i) => (
                <li key={n.t} className="relative ps-8 pb-8 last:pb-0">
                  <span aria-hidden className="absolute -start-[7px] top-1.5 size-[13px] rounded-full border bg-paper" style={{ borderColor: "var(--slate)" }} />
                  <p className="mono">{String(i + 1).padStart(2, "0")}</p>
                  <h2 className="mt-1 !text-[1.25rem]">{n.t}</h2>
                  <p className="t-small mt-1 text-dim">{n.d}</p>
                </li>
              ))}
            </ol>
            <div className="mt-12 flex flex-wrap items-center gap-x-8 gap-y-4">
              <Button href="/account/">{applyCopy.success.dashboard}</Button>
              <Button href="/" variant="link">
                {c.home}
              </Button>
            </div>
          </div>
          <div className="col-span-12 lg:col-span-6">
            <SceneSlot stateRef={state} autoRotate rotateSpeed={0.08} label={c.modelAlt} className="mx-auto aspect-square w-[80%] sm:w-[64%] lg:aspect-[5/4] lg:w-full" />
          </div>
        </div>
      </div>
    </section>
  );
}
