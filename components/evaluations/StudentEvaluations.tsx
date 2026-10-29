"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";
import type { EvaluationView } from "@/lib/db";
import { CRITERIA, averageScores } from "@/lib/evaluationSchema";
import { evaluations } from "@/content/copy-evaluations";
import { SheetTag } from "@/components/ds/Devices";
import { Notice } from "@/components/account/Notice";
import { Block } from "@/components/account/Skeleton";
import { cn } from "@/lib/utils";
import { ScoreBars, StudentEvaluationCard } from "./parts";

const c = evaluations.student;
const rule = { borderColor: "var(--rule)" } as const;

// Dashboard card S-130 · EVALUATIONS. Reads public.my_evaluations: published rows only, no private note, no recruiter.
export function StudentEvaluations({ className }: { className?: string }) {
  const { user, profile } = useAuth();
  const [list, setList] = useState<EvaluationView[] | null>(null);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    const sb = getSupabase();
    if (!sb || !user) return;
    setError(false);
    const res = await sb.from("my_evaluations").select("*").order("published_at", { ascending: false });
    if (res.error) return setError(true);
    setList((res.data ?? []) as EvaluationView[]);
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  const avg = useMemo(() => averageScores(list ?? []), [list]);
  const visible = Boolean(profile?.talent_visible);

  return (
    <section id="evaluations" aria-labelledby="evaluations-h" className={cn("scroll-mt-24", className)} data-testid="student-evaluations">
      <div className="rule-b flex flex-wrap items-center justify-between gap-x-6 gap-y-2 pb-3">
        <h2 id="evaluations-h" className="mono !text-xs !font-normal !tracking-[0.08em]">
          {c.label}
        </h2>
        <SheetTag sheet={c.sheet} name={c.name} />
      </div>
      <div className="mt-6">
        {error ? (
          <Notice tone="error" action={{ label: "Try again", onClick: () => void load() }}>
            {c.loadError}
          </Notice>
        ) : list === null ? (
          <div className="grid gap-4" aria-busy="true">
            <Block className="h-40 rounded-[12px]" />
          </div>
        ) : list.length === 0 ? (
          <Empty visible={visible} />
        ) : (
          <div className="grid-12 gap-y-8">
            <div className="card col-span-12 min-w-0 self-start p-6 lg:col-span-4" data-testid="evaluation-summary">
              <p className="mono">{c.published}</p>
              <p className="mt-2 text-[2.25rem] font-semibold leading-none tabular-nums text-text" data-testid="evaluation-count">
                {list.length}
              </p>
              <p className="sr-only">{c.count(list.length)}</p>
              <div className="mt-6 border-t pt-5" style={rule}>
                <p className="mono">{c.average}</p>
                <p className="mt-1 text-[1.5rem] font-semibold leading-none tabular-nums text-text" data-testid="evaluation-average">
                  {avg.overall.toFixed(1)}
                  <span className="text-[1rem] font-normal text-dim"> / 5</span>
                </p>
              </div>
              <div className="mt-6 border-t pt-5" style={rule}>
                <p className="mono mb-4">{c.criteria}</p>
                <ScoreBars items={CRITERIA.map((k) => ({ key: k.key, label: k.label, value: avg.byCriterion[k.key] ?? 0 }))} />
              </div>
            </div>
            <ul className="col-span-12 grid min-w-0 gap-6 lg:col-span-8" aria-label={c.list}>
              {list.map((ev) => (
                <li key={ev.id} className="min-w-0">
                  <StudentEvaluationCard ev={ev} />
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}

function Empty({ visible }: { visible: boolean }) {
  const e = visible ? c.emptyVisible : c.emptyHidden;
  return (
    <div className="card flex flex-col items-start gap-5 p-7 md:p-9" data-testid="evaluations-empty" data-visible={visible ? "on" : "off"}>
      <h3 className="t-h3">{e.title}</h3>
      <p className="t-small max-w-[60ch] text-muted">{e.text}</p>
      <Link prefetch={false} href="/account/profile/#visibility" className="ul-draw inline-flex items-center gap-2 pb-1 text-[15px] font-medium text-text hover:text-accent-text">
        {e.action}
        <svg aria-hidden width="16" height="12" viewBox="0 0 16 12">
          <path d="M0 6h14M9 1l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </Link>
      {!visible && "note" in e && <p className="mono !normal-case">{e.note}</p>}
    </div>
  );
}
