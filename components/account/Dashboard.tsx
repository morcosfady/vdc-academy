"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";
import { firstName, type Application, type ApplicationEvent } from "@/lib/db";
import { Button } from "@/components/ui/Button";
import { account } from "@/content/copy-account";
import { AccountShell, Panel } from "./AccountShell";
import { ApplicationCard } from "./ApplicationCard";
import { StatusTimeline } from "./StatusTimeline";
import { DocumentsPanel } from "./DocumentsPanel";
import { CompletenessMeter } from "./CompletenessMeter";
import { NextSteps } from "./NextSteps";
import { Recommended } from "./Recommended";
import { EmptyModel } from "./EmptyModel";
import { Notice } from "./Notice";
import { Block } from "./Skeleton";
import { RecruiterDashboard } from "./RecruiterDashboard";
import { UpcomingCard } from "@/components/calendar/UpcomingCard";
import { StudentEvaluations } from "@/components/evaluations/StudentEvaluations";

const c = account.dashboard;

// /account/ by role: recruiters get their own sheet (R-100); students (and the team) keep the student dashboard.
export function Dashboard() {
  const { isRecruiter } = useAuth();
  return isRecruiter ? <RecruiterDashboard /> : <StudentDashboard />;
}

function StudentDashboard() {
  const { user, profile } = useAuth();
  const name = firstName(profile?.full_name ?? (user?.user_metadata?.full_name as string | undefined));
  return (
    <AccountShell
      sheet={c.sheet}
      name={c.name}
      title={c.welcome(name)}
      lead={c.lead}
      actions={
        <Button href="/account/profile/" variant="link">
          {c.completeness.edit}
        </Button>
      }
    >
      <Body />
    </AccountShell>
  );
}

// Rendered only once the session is known (inside RequireAuth), so `user` is set.
function Body() {
  const { user, profile, isStudent } = useAuth();
  const [apps, setApps] = useState<Application[] | null>(null);
  const [events, setEvents] = useState<ApplicationEvent[]>([]);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    const sb = getSupabase();
    if (!sb || !user) return;
    setError(false);
    setApps(null);
    const a = await sb.from("applications").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    if (a.error) return setError(true);
    const list = (a.data ?? []) as Application[];
    if (list.length) {
      const e = await sb
        .from("application_events")
        .select("*")
        .in("application_id", list.map((x) => x.id))
        .eq("visible_to_student", true)
        .order("created_at", { ascending: true });
      if (!e.error) setEvents((e.data ?? []) as ApplicationEvent[]);
    }
    setApps(list);
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  if (error)
    return (
      <Notice tone="error" action={{ label: c.retry, onClick: () => void load() }}>
        {c.loadError}
      </Notice>
    );

  if (apps === null)
    return (
      <div className="grid-12 gap-y-6" aria-busy="true">
        <Block className="col-span-12 h-56 rounded-[12px] lg:col-span-8" />
        <Block className="col-span-12 h-56 rounded-[12px] lg:col-span-4" />
        <Block className="col-span-12 h-32 rounded-[12px]" />
      </div>
    );

  const latest = apps[0] ?? null;
  const status = profile?.current_status ?? null;

  if (!latest)
    return (
      <>
        <div className="grid-12 gap-y-10">
          <div className="col-span-12 lg:col-span-7">
            <div className="card flex flex-col items-start gap-6 p-7 md:flex-row md:items-center md:gap-10 md:p-9">
              <EmptyModel className="w-full max-w-[280px] shrink-0" />
              <div>
                <p className="mono">{c.applications}</p>
                <h2 className="t-h3 mt-3">{c.empty.title}</h2>
                <p className="t-small mt-3 text-muted">{c.empty.text}</p>
                <div className="mt-7">
                  <Button href="/apply/">{c.empty.start}</Button>
                </div>
              </div>
            </div>
          </div>
          <aside className="col-span-12 grid gap-6 lg:col-span-4 lg:col-start-9">
            <NextSteps apps={apps} profile={profile} className="card p-6" />
            <CompletenessMeter profile={profile} className="card p-6" />
            <UpcomingCard className="card p-6" />
          </aside>
        </div>
        {isStudent && <StudentEvaluations className="mt-20" />}
        <Panel label={c.recommended} className="mt-20">
          <Recommended status={status} />
        </Panel>
      </>
    );

  return (
    <>
      <div className="grid-12 gap-y-10">
        <Panel id="applications" label={c.applications} className="col-span-12 lg:col-span-8">
          <ul className="grid gap-6">
            {apps.map((a) => (
              <li key={a.id}>
                <ApplicationCard app={a} />
              </li>
            ))}
          </ul>
        </Panel>
        <aside className="col-span-12 grid gap-6 self-start lg:col-span-4">
          <NextSteps apps={apps} profile={profile} className="card p-6" />
          <CompletenessMeter profile={profile} className="card p-6" />
            <UpcomingCard className="card p-6" />
        </aside>
      </div>

      <Panel id="status" label={c.timeline} className="mt-20">
        <StatusTimeline status={latest.status} events={events.filter((e) => e.application_id === latest.id)} submittedAt={latest.submitted_at} />
      </Panel>

      <div className="grid-12 mt-20 gap-y-10">
        <Panel id="documents" label={c.documents} className="col-span-12 lg:col-span-8">
          <DocumentsPanel app={latest} userId={user!.id} onChange={(a) => setApps((list) => (list ?? []).map((x) => (x.id === a.id ? a : x)))} />
        </Panel>
      </div>

      {isStudent && <StudentEvaluations className="mt-20" />}

      <Panel label={c.recommended} className="mt-20">
        <Recommended status={status} />
      </Panel>
    </>
  );
}
