"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";
import { evaluationStatusLabel, type StudentEvaluation, type TalentCard } from "@/lib/db";
import { contextLabel, recommendationLabel } from "@/lib/evaluationSchema";
import { evaluations } from "@/content/copy-evaluations";
import { Software, Tag } from "@/components/ds/Chips";
import { Input, Select } from "@/components/ds/Forms";
import { SheetTag } from "@/components/ds/Devices";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/account/Notice";
import { Block } from "@/components/account/Skeleton";
import { Panel } from "@/components/account/AccountShell";
import { fmtDate, shortId } from "@/components/account/format";
import { programTitle } from "./parts";

const c = evaluations.recruiter;
const rule = { borderColor: "var(--rule)" } as const;
const ANY: string = c.filters.any;

// R-200 · TALENT and "My evaluations" on the recruiter dashboard. A recruiter whose company is not verified sees a
// quiet explanation and nothing else: no query is sent, and the database would return nothing anyway.
export function RecruiterTalent({ status }: { status: "pending" | "approved" | "rejected" }) {
  if (status !== "approved") return <Locked status={status} />;
  return <Loaded />;
}

function Locked({ status }: { status: "pending" | "rejected" }) {
  return (
    <Panel id="talent" label={c.label} className="scroll-mt-24">
      <div className="card p-6 md:p-7" data-testid="talent-locked">
        <SheetTag sheet={c.sheet} name={c.name} />
        <p className="t-small mt-5 max-w-[60ch] text-muted">{c.locked[status === "rejected" ? "rejected" : "pending"]}</p>
      </div>
    </Panel>
  );
}

function Loaded() {
  const { user } = useAuth();
  const [cards, setCards] = useState<TalentCard[] | null>(null);
  const [mine, setMine] = useState<StudentEvaluation[] | null>(null);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    const sb = getSupabase();
    if (!sb || !user) return;
    setError(false);
    const [t, m] = await Promise.all([
      sb.from("talent_cards").select("*").order("display_name", { ascending: true }),
      sb.from("student_evaluations").select("*").eq("recruiter_id", user.id).order("created_at", { ascending: false }),
    ]);
    if (t.error || m.error) return setError(true);
    setCards((t.data ?? []) as TalentCard[]);
    setMine((m.data ?? []) as StudentEvaluation[]);
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  if (error)
    return (
      <Panel id="talent" label={c.label} className="scroll-mt-24">
        <Notice tone="error" action={{ label: "Try again", onClick: () => void load() }}>
          {c.loadError}
        </Notice>
      </Panel>
    );

  return (
    <>
      <Panel id="talent" label={c.label} className="scroll-mt-24">
        <TalentList cards={cards} mine={mine} />
      </Panel>
      <Panel id="evaluations" label={c.mine.label} className="mt-20 scroll-mt-24">
        <MyEvaluations cards={cards} mine={mine} />
      </Panel>
    </>
  );
}

// ---- the talent list

function TalentList({ cards, mine }: { cards: TalentCard[] | null; mine: StudentEvaluation[] | null }) {
  const [q, setQ] = useState("");
  const [program, setProgram] = useState(ANY);
  const [year, setYear] = useState(ANY);
  const [skill, setSkill] = useState(ANY);

  const options = useMemo(() => {
    const list = cards ?? [];
    return {
      programs: [...new Set(list.flatMap((x) => x.programs))].map((s) => ({ slug: s, title: programTitle(s) })).sort((a, b) => a.title.localeCompare(b.title)),
      years: [...new Set(list.map((x) => x.graduation_year).filter((y): y is number => Boolean(y)))].sort((a, b) => b - a),
      skills: [...new Set(list.flatMap((x) => x.software))].sort((a, b) => a.localeCompare(b)),
    };
  }, [cards]);

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (cards ?? []).filter((x) => {
      if (program !== ANY && !x.programs.some((s) => programTitle(s) === program)) return false;
      if (year !== ANY && String(x.graduation_year ?? "") !== year) return false;
      if (skill !== ANY && !x.software.includes(skill)) return false;
      if (!needle) return true;
      const hay = [x.display_name, x.city, x.country, ...x.software, ...x.programs.map(programTitle)].join(" ").toLowerCase();
      return hay.includes(needle);
    });
  }, [cards, q, program, year, skill]);

  const dirty = q !== "" || program !== ANY || year !== ANY || skill !== ANY;
  const reset = () => {
    setQ("");
    setProgram(ANY);
    setYear(ANY);
    setSkill(ANY);
  };

  if (cards === null || mine === null)
    return (
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3" aria-busy="true">
        <Block className="h-60 rounded-[12px]" />
        <Block className="h-60 rounded-[12px]" />
        <Block className="hidden h-60 rounded-[12px] xl:block" />
      </div>
    );

  return (
    <div data-testid="talent-section">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <SheetTag sheet={c.sheet} name={c.name} />
        <p className="mono" aria-live="polite" data-testid="talent-count">
          {c.count(shown.length, cards.length)}
        </p>
      </div>
      <h3 className="t-h3 mt-5">{c.title}</h3>
      <p className="t-small mt-2 max-w-[62ch] text-muted">{c.lead}</p>

      {cards.length > 0 && (
        <div className="mt-8 grid gap-x-5 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
          <Input label={c.search} type="search" value={q} onChange={(e) => setQ(e.target.value)} autoComplete="off" name="talent-search" className="sm:col-span-2 lg:col-span-1" />
          <Select label={c.filters.program} name="filter-program" options={[ANY, ...options.programs.map((p) => p.title)]} value={program} onChange={(e) => setProgram(e.target.value)} />
          <Select label={c.filters.year} name="filter-year" options={[ANY, ...options.years.map(String)]} value={year} onChange={(e) => setYear(e.target.value)} />
          <Select label={c.filters.skill} name="filter-skill" options={[ANY, ...options.skills]} value={skill} onChange={(e) => setSkill(e.target.value)} />
        </div>
      )}
      {dirty && (
        <button type="button" onClick={reset} className="ul-draw mt-5 pb-0.5 text-[15px] font-medium text-text hover:text-accent-text">
          {c.filters.reset}
        </button>
      )}

      <div className="mt-8">
        {cards.length === 0 ? (
          <Empty title={c.empty.title} text={c.empty.text} />
        ) : shown.length === 0 ? (
          <Empty title={c.emptyFiltered.title} text={c.emptyFiltered.text} />
        ) : (
          <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3" aria-label={c.label}>
            {shown.map((card) => (
              <li key={card.student_id} className="flex min-w-0">
                <TalentCardView card={card} mine={(mine ?? []).filter((e) => e.student_id === card.student_id)} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Empty({ title, text }: { title: string; text: string }) {
  return (
    <div role="status" className="flex flex-col items-center border-y px-6 py-12 text-center" style={rule}>
      <h3 className="!text-[1.25rem]">{title}</h3>
      <p className="t-small mx-auto mt-2 max-w-sm text-dim">{text}</p>
    </div>
  );
}

const safeHref = (u: string | null) => (u && /^https?:\/\//i.test(u) ? u : null);

// What a verified recruiter may know about a student, and nothing else: no email, no phone, no photo, no documents.
function TalentCardView({ card, mine }: { card: TalentCard; mine: StudentEvaluation[] }) {
  const k = c.card;
  const place = [card.city, card.country].filter(Boolean).join(", ");
  const href = `/account/evaluate/?student=${card.student_id}`;
  const linkedin = safeHref(card.linkedin_url);
  const portfolio = safeHref(card.portfolio_url);
  return (
    <article className="card flex w-full flex-col p-6" aria-labelledby={`tc-${card.student_id}`} data-testid="talent-card" data-student={card.student_id}>
      <div className="flex items-center justify-between gap-3">
        <span className="mono !text-text">ST-{shortId(card.student_id)}</span>
        {mine.length > 0 && <Tag tone="blueprint">{k.evaluated(mine.length)}</Tag>}
      </div>
      <h4 id={`tc-${card.student_id}`} className="mt-4 !text-[1.375rem] !font-semibold !tracking-normal">
        {card.display_name}
      </h4>
      {place && <p className="t-small mt-1 text-muted">{place}</p>}
      <dl className="mt-5 grid gap-4 border-t pt-4" style={rule}>
        <div>
          <dt className="mono">{k.programs}</dt>
          <dd className="mt-1 text-[15px] text-text">{card.programs.length ? card.programs.map(programTitle).join(", ") : <span className="text-dim">{k.noPrograms}</span>}</dd>
        </div>
        {card.graduation_year && (
          <div>
            <dt className="mono">{k.graduated}</dt>
            <dd className="mt-1 text-[15px] text-text">{card.graduation_year}</dd>
          </div>
        )}
        {card.software.length > 0 && (
          <div>
            <dt className="mono">{k.skills}</dt>
            <dd className="mt-2 flex flex-wrap gap-2">
              {card.software.map((s) => (
                <Software key={s}>{s}</Software>
              ))}
            </dd>
          </div>
        )}
      </dl>
      {(linkedin || portfolio) && (
        <p className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-[15px]">
          {linkedin && (
            <a href={linkedin} target="_blank" rel="noopener noreferrer" className="ul-draw pb-0.5 font-medium text-text hover:text-accent-text">
              {k.linkedin}
            </a>
          )}
          {portfolio && (
            <a href={portfolio} target="_blank" rel="noopener noreferrer" className="ul-draw pb-0.5 font-medium text-text hover:text-accent-text">
              {k.portfolio}
            </a>
          )}
        </p>
      )}
      <div className="mt-auto flex flex-wrap items-center gap-x-6 gap-y-3 pt-6">
        <Button href={href} variant={mine.length ? "secondary" : "primary"} className="!h-12 !px-5">
          {mine.length ? k.edit : k.evaluate}
          <span className="sr-only"> {card.display_name}</span>
        </Button>
      </div>
    </article>
  );
}

// ---- my evaluations

function MyEvaluations({ cards, mine }: { cards: TalentCard[] | null; mine: StudentEvaluation[] | null }) {
  const m = c.mine;
  if (cards === null || mine === null)
    return (
      <div className="grid gap-3" aria-busy="true">
        <Block className="h-20" />
        <Block className="h-20" />
      </div>
    );
  if (mine.length === 0) return <p className="t-small text-muted">{m.empty}</p>;
  const names = new Map(cards.map((x) => [x.student_id, x.display_name]));
  return (
    <ul className="border-t" style={rule} data-testid="my-evaluations">
      {mine.map((e) => (
        <li key={e.id} className="grid gap-2 border-b py-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-start md:gap-x-8" style={rule} data-testid="my-evaluation" data-status={e.status}>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <p className="text-[1.0625rem] font-medium text-text">{names.get(e.student_id) ?? m.unknownStudent}</p>
              <Tag tone={e.status === "published" ? "blueprint" : e.status === "submitted" ? "brass" : "default"}>
                <span data-testid="evaluation-status">{evaluationStatusLabel[e.status]}</span>
              </Tag>
            </div>
            <p className="t-small mt-1 text-muted">
              {[contextLabel(e.context), recommendationLabel(e.recommendation), `${m.date} ${fmtDate(e.created_at)}`].join(" · ")}
            </p>
            <p className="t-small mt-2 text-dim">{m.statusNote[e.status]}</p>
            {e.status === "hidden" && e.moderation_note && (
              <p className="mt-3 border-s-2 ps-4 text-[15px] text-text" style={{ borderColor: "var(--rule)" }}>
                <span className="mono block">{m.teamNote}</span>
                {e.moderation_note}
              </p>
            )}
          </div>
          <Link
            prefetch={false}
            href={`/account/evaluate/?student=${e.student_id}&context=${e.context}`}
            className="ul-draw inline-flex min-h-11 items-center self-start pb-0.5 text-[15px] font-medium text-text hover:text-accent-text"
          >
            {e.status === "submitted" ? m.edit : m.view}
          </Link>
        </li>
      ))}
    </ul>
  );
}
