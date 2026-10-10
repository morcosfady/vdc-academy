"use client";

import { useEffect, useState } from "react";

// A slim progress rail in the right margin (6 ticks). It only appears on wide screens (1400px and up) where the
// 1280px content leaves a 60px safe zone, so it can never sit on top of text or images. Labels show on hover or focus.
export function ChapterIndicator({ items }: { items: { id: string; label: string }[] }) {
  const [active, setActive] = useState(items[0]?.id);

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setActive(e.target.id)),
      { rootMargin: "-45% 0px -45% 0px" },
    );
    items.forEach((i) => {
      const el = document.getElementById(i.id);
      if (el) io.observe(el);
    });
    return () => io.disconnect();
  }, [items]);

  return (
    <nav aria-label="Chapters" className="fixed end-2 top-1/2 z-40 hidden -translate-y-1/2 min-[1400px]:block">
      <ol className="flex flex-col items-end gap-1">
        {items.map((it, i) => {
          const on = active === it.id;
          return (
            <li key={it.id}>
              <a
                href={`#${it.id}`}
                aria-label={`Chapter ${i + 1}: ${it.label}`}
                aria-current={on ? "true" : undefined}
                className="group relative flex h-7 w-10 items-center justify-end"
              >
                <span className="pointer-events-none absolute end-12 whitespace-nowrap rounded-md border border-[#365b62] bg-[#0a1d23]/90 px-3 py-1.5 text-[13px] text-[#eaf2f7] opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                  {it.label}
                </span>
                <span
                  aria-hidden
                  className={`block h-[3px] rounded-full transition-all duration-300 ${on ? "w-8 bg-[#7db3e8]" : "w-4 bg-[#365b62] group-hover:w-6 group-hover:bg-[#7db3e8]/70"}`}
                />
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
