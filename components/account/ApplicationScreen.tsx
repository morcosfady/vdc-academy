"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";
import { discountStatusLabel, statusLabel, type Application, type ApplicationEvent } from "@/lib/db";
import { Tag } from "@/components/ds/Chips";
import { discounts } from "@/config/discounts";
import { SheetTag } from "@/components/ds/Devices";
import { Button } from "@/components/ui/Button";
import { account } from "@/content/copy-account";
import { AccountShell, Panel } from "./AccountShell";
import { StatusTimeline } from "./StatusTimeline";
import { Notice } from "./Notice";
import { Block } from "./Skeleton";
import { programTitles } from "./ApplicationCard";
import { fmtDate, fmtDateTime, shortId } from "./format";
import { useQueryParam } from "./useNext";

const c = account.application;
type Key = keyof typeof c.fields;

// The summary is grouped like the apply steps.
const groups: { label: string; keys: Key[] }[] = [
  { label: c.groups.contact, keys: ["full_name", "email", "phone", "whatsapp", "country", "city", "dob_or_age", "language"] },
  { label: c.groups.education, keys: ["current_status", "degree", "university", "graduation_year", "gpa"] },
  { label: c.groups.experience, keys: ["experience_years", "job_title", "company", "software_skills", "career_goal", "linkedin_url", "portfolio_url"] },
  { label: c.groups.programs, keys: ["programs", "format", "schedule", "start_pref", "has_laptop", "source"] },
  { label: c.groups.discount, keys: ["discount_type", "discount_percent", "discount_status"] },
];

// The apply flow stores the discount id ("freshGrad"); older rows may hold "fresh_grad". Both map to the label.
const norm = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "");
const discountLabel = (v: string) => Object.values(discounts).find((d) => norm(d.id) === norm(v))?.label ?? v;

function show(app: Application, k: Key): React.ReactNode {
  const v = app[k as keyof Application];
  if (v === null || v === undefined || v === "" || (Array.isArray(v) && v.length === 0)) return <span className="text-dim">{c.empty}</span>;
  if (k === "programs") return programTitles(v as string[]).join(", ");
  if (k === "software_skills") {
    const s = v as unknown;
    if (Array.isArray(s)) return s.join(", ");
    if (typeof s === "object" && s)
      return (
        Object.entries(s as Record<string, string>)
          .filter(([, lvl]) => lvl && lvl !== "None")
          .map(([name, lvl]) => `${name} (${lvl})`)
          .join(", ") || <span className="text-dim">{c.empty}</span>
      );
  }
  if (k === "discount_status") return discountStatusLabel[v as Application["discount_status"]] ?? String(v);
  if (k === "discount_type") return discountLabel(String(v));
  if (k === "discount_percent") return `${v}%`;
  if (k === "linkedin_url" || k === "portfolio_url")
    return (
      <a href={String(v)} target="_blank" rel="noopener noreferrer" className="ul-draw break-all pb-0.5 hover:text-accent-text">
        {String(v)}
      </a>
    );
  return String(v);
}

export function ApplicationScreen() {
  return (
    <AccountShell
      sheet={c.sheet}
      name={c.name}
      title={c.title}
      actions={
        <Button href="/account/" variant="link">
          {c.back}
        </Button>
      }
    >
      <Body />
    </AccountShell>
  );
}

function Body() {
  const { user } = useAuth();
  const id = useQueryParam("id");
  const [app, setApp] = useState<Application | null | undefined>(undefined);
  const [events, setEvents] = useState<ApplicationEvent[]>([]);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    const sb = getSupabase();
    if (!sb || !user || id === undefined) return;
    if (!id || !/^[0-9a-f-]{36}$/i.test(id)) return setApp(null);
    setError(false);
    setApp(undefined);
    const a = await sb.from("applications").select("*").eq("id", id).eq("user_id", user.id).maybeSingle();
    if (a.error) return setError(true);
    if (!a.data) return setApp(null);
    const e = await sb.from("application_events").select("*").eq("application_id", id).eq("visible_to_student", true).order("created_at", { ascending: true });
    setEvents((e.data ?? []) as ApplicationEvent[]);
    setApp(a.data as Application);
  }, [user, id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (error)
    return (
      <Notice tone="error" action={{ label: account.dashboard.retry, onClick: () => void load() }}>
        {account.dashboard.loadError}
      </Notice>
    );

  if (app === undefined)
    return (
      <div className="grid gap-6" aria-busy="true">
        <Block className="h-28 rounded-[12px]" />
        <Block className="h-64 rounded-[12px]" />
        <Block className="h-40 rounded-[12px]" />
      </div>
    );

  if (app === null)
    return (
      <div className="max-w-[560px]">
        <SheetTag sheet={c.missing.sheet} name={c.name} />
        <h2 className="t-h2 mt-6">{c.missing.title}</h2>
        <p className="t-lead mt-4">{c.missing.text}</p>
        <div className="mt-8">
          <Button href="/account/">{c.missing.back}</Button>
        </div>
      </div>
    );

  const active = app.status !== "draft" && app.status !== "rejected";

  return (
    <div className="grid gap-16">
      <div className="flex flex-wrap items-center gap-4">
        <span className="mono !text-text">APP-{shortId(app.id)}</span>
        <Tag tone={active ? "blueprint" : "default"}>{statusLabel[app.status]}</Tag>
        {app.submitted_at && (
          <span className="mono">
            {account.dashboard.card.submitted} {fmtDate(app.submitted_at)}
          </span>
        )}
        {app.status === "draft" && (
          <Link prefetch={false} href="/apply/" className="ul-draw pb-0.5 text-[15px] font-medium text-text hover:text-accent-text">
            {account.dashboard.card.continue}
          </Link>
        )}
      </div>

      <Panel id="status" label={account.dashboard.timeline}>
        <StatusTimeline status={app.status} events={events} submittedAt={app.submitted_at} />
      </Panel>

      <div className="grid gap-14">
        {groups.map((g) => (
          <Panel key={g.label} label={g.label}>
            <dl className="grid grid-cols-1 overflow-hidden rounded-[4px] border sm:grid-cols-2 lg:grid-cols-3" style={{ borderColor: "var(--rule)" }}>
              {g.keys.map((k) => (
                <div key={k} className="border-b p-4 sm:border-e sm:[&:nth-child(2n)]:border-e-0 lg:[&:nth-child(2n)]:border-e lg:[&:nth-child(3n)]:border-e-0" style={{ borderColor: "var(--rule)" }}>
                  <dt className="mono">{c.fields[k]}</dt>
                  <dd className="mt-1 text-[15px] text-text">{show(app, k)}</dd>
                </div>
              ))}
            </dl>
          </Panel>
        ))}

        <Panel id="documents" label={c.groups.documents}>
          <Documents app={app} />
        </Panel>

        <Panel id="events" label={c.events}>
          {events.length === 0 ? (
            <p className="t-small text-muted">{c.noEvents}</p>
          ) : (
            <ol className="border-s" style={{ borderColor: "var(--rule)" }}>
              {[...events].reverse().map((e) => (
                <li key={e.id} className="relative ps-8 pb-7 last:pb-0">
                  <span aria-hidden className="absolute -start-[7px] top-1.5 size-[13px] rounded-full border bg-paper" style={{ borderColor: "var(--slate)" }} />
                  <p className="mono">{fmtDateTime(e.created_at)}</p>
                  <p className="mt-1 text-[15px] font-medium text-text">
                    {c.eventLabel[e.type]}
                    {e.type === "status_change" && e.to_status && (
                      <span className="font-normal text-muted">
                        {" "}
                        {e.from_status ? `${statusLabel[e.from_status]} to ` : ""}
                        {statusLabel[e.to_status]}
                      </span>
                    )}
                  </p>
                  {e.note && <p className="t-small mt-1 text-muted">{e.note}</p>}
                </li>
              ))}
            </ol>
          )}
        </Panel>
      </div>
    </div>
  );
}

function Documents({ app }: { app: Application }) {
  const [err, setErr] = useState("");
  const rows = [
    { label: account.documents.cv, path: app.cv_file_path },
    { label: account.documents.proof, path: app.proof_file_path },
  ];
  async function view(path: string) {
    const sb = getSupabase();
    if (!sb) return;
    const { data, error } = await sb.storage.from("documents").createSignedUrl(path, 120);
    if (error || !data?.signedUrl) return setErr(account.documents.failed);
    window.open(data.signedUrl, "_blank", "noopener");
  }
  return (
    <>
      <ul className="border-t" style={{ borderColor: "var(--rule)" }}>
        {rows.map((r) => (
          <li key={r.label} className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b py-4" style={{ borderColor: "var(--rule)" }}>
            <div>
              <p className="text-[15px] font-medium text-text">{r.label}</p>
              <p className={r.path ? "mono !text-text mt-1" : "mono mt-1"}>{r.path ? account.documents.uploaded : account.documents.missing}</p>
            </div>
            {r.path && (
              <button type="button" onClick={() => view(r.path!)} className="ul-draw pb-0.5 text-[15px] font-medium text-text hover:text-accent-text">
                {account.documents.view}
              </button>
            )}
          </li>
        ))}
      </ul>
      {err && (
        <div className="mt-4">
          <Notice tone="error" action={{ label: account.dashboard.retry, onClick: () => setErr("") }}>
            {err}
          </Notice>
        </div>
      )}
    </>
  );
}
