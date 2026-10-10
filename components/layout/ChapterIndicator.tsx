"use client";

import { useEffect, useState } from "react";

// Elevator-style floor numbers on the right edge. Items are { id, label }, ids match section ids.
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
    <nav aria-label="Chapters" className="fixed end-4 top-1/2 z-40 hidden -translate-y-1/2 xl:block">
      <ol className="glass-blur space-y-3 rounded-full border border-[#365b62] bg-[#0a1d23]/75 px-4 py-5">
        {items.map((it, i) => (
          <li key={it.id}>
            <a
              href={`#${it.id}`}
              aria-label={`Chapter ${i + 1}: ${it.label}`}
              aria-current={active === it.id ? "true" : undefined}
              className={`label flex items-center justify-end gap-3 !text-[10px] transition-colors ${active === it.id ? "!text-[#7db3e8]" : "!text-[#a9bcc4] hover:!text-[#f2f7fb]"}`}
            >
              <span className={`transition-opacity ${active === it.id ? "opacity-100" : "opacity-0"}`}>{it.label}</span>
              <span>{String(i + 1).padStart(2, "0")}</span>
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
