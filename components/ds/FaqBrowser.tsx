"use client";

import { useMemo, useState } from "react";
import { Accordion, Tabs } from "./Controls";
import { Input } from "./Forms";
import { Button } from "@/components/ui/Button";
import { faqCategories, faqs, type FaqCategory } from "@/content/faqs";
import { pages } from "@/content/copy-pages";

const c = pages.faq;
const rule = { borderColor: "var(--rule)" } as const;

// Category tabs, a live search box and the drawing-index accordion. Search matches question and answer, any case.
export function FaqBrowser({ className }: { className?: string }) {
  const [cat, setCat] = useState<FaqCategory | "all">("all");
  const [q, setQ] = useState("");

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return faqs.filter((f) => (cat === "all" || f.category === cat) && (!needle || f.q.toLowerCase().includes(needle) || f.a.toLowerCase().includes(needle)));
  }, [cat, q]);

  return (
    <div className={className}>
      <Tabs tabs={faqCategories} value={cat} onChange={(id) => setCat(id as FaqCategory | "all")} label={c.tabs} />
      <div className="mt-8 grid gap-x-6 gap-y-3 sm:grid-cols-[minmax(0,420px)_1fr] sm:items-center">
        <Input label={c.search} type="search" value={q} onChange={(e) => setQ(e.target.value)} autoComplete="off" />
        <p className="mono sm:text-end" aria-live="polite">
          {c.count(results.length, faqs.length)}
        </p>
      </div>

      {results.length > 0 ? (
        <Accordion key={`${cat}:${q.trim().toLowerCase()}`} className="mt-10" items={results.map((f) => ({ q: f.q, a: <p className="max-w-[60ch]">{f.a}</p> }))} />
      ) : (
        <div className="mt-10 border-y py-12 text-center" style={rule} role="status">
          <p className="mono">E-000</p>
          <h3 className="mt-3 !text-[1.25rem]">{c.empty.title}</h3>
          <p className="t-small mx-auto mt-2 max-w-sm text-dim">{c.empty.text}</p>
          <button type="button" onClick={() => setQ("")} className="ul-draw mt-6 pb-0.5 text-[15px] font-medium text-text hover:text-accent-text">
            {c.empty.clear}
          </button>
        </div>
      )}

      <div className="mt-16 flex flex-col gap-4 border-t pt-8 sm:flex-row sm:items-center sm:justify-between" style={rule}>
        <p className="text-[1.125rem] font-medium text-text">{c.still.title}</p>
        <Button href="/contact" variant="link">
          {c.still.button}
        </Button>
      </div>
    </div>
  );
}
