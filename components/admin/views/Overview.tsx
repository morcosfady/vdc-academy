"use client";

import Link from "next/link";
import { Stat } from "@/components/ds/Sections";
import { Button } from "@/components/ui/Button";
import { adminCopy } from "@/content/copy-admin";
import { evaluations } from "@/content/copy-evaluations";
import { PIPELINE, type ApplicationStatus, type HiringStatus, type VerificationStatus } from "@/lib/db";
import { isRecruiter, isStudent, type RoleHolder } from "@/lib/roles";
import { AdminSection, AdminShell } from "../AdminShell";
import { StatSkeleton, BlockSkeleton } from "../Skeleton";
import { EmptyState, ErrorState } from "../States";
import { StatusBadge } from "../StatusBadge";
import { sb, unwrap, useLoad } from "../util";

const c = adminCopy.overview;
const rule = { borderColor: "var(--rule)" } as const;
const STATUSES: ApplicationStatus[] = [...PIPELINE, "waitlist", "rejected"];
const OPEN_HIRING: HiringStatus[] = ["new", "in_review"];

type Lite = { id: string; status: ApplicationStatus; submitted_at: string | null; created_at: string; discount_type: string | null; discount_status: string };

async function load() {
  const s = sb();
  const [apps, leads, msgs, dels, people, recruiters, hiring, awaiting] = await Promise.all([
    s.from("applications").select("id,status,submitted_at,created_at,discount_type,discount_status").neq("status", "draft").then((r) => unwrap<Lite[]>(r)),
    s.from("leads").select("id,handled").eq("handled", false).then((r) => unwrap<{ id: string }[]>(r)),
    s.from("contact_messages").select("id,handled").eq("handled", false).then((r) => unwrap<{ id: string }[]>(r)),
    s.from("account_deletion_requests").select("id,handled").eq("handled", false).then((r) => unwrap<{ id: string }[]>(r)),
    s.from("profiles").select("id,role,account_type,created_at").then((r) => unwrap<(RoleHolder & { id: string; created_at: string })[]>(r)),
    s.from("recruiter_profiles").select("id,verification_status").eq("verification_status", "pending").then((r) => unwrap<{ id: string; verification_status: VerificationStatus }[]>(r)),
    s.from("hiring_requests").select("id,status").in("status", OPEN_HIRING).then((r) => unwrap<{ id: string; status: HiringStatus }[]>(r)),
    s.from("student_evaluations").select("id,status").eq("status", "submitted").then((r) => unwrap<{ id: string }[]>(r)),
  ]);
  const weekAgo = Date.now() - 7 * 86400_000;
  const byStatus = Object.fromEntries(STATUSES.map((st) => [st, 0])) as Record<ApplicationStatus, number>;
  for (const a of apps) byStatus[a.status] = (byStatus[a.status] ?? 0) + 1;
  const total = apps.length;
  const week = apps.filter((a) => new Date(a.submitted_at ?? a.created_at).getTime() >= weekAgo).length;
  const fresh = apps.filter((a) => a.discount_type === "freshGrad").length;
  const pending = apps.filter((a) => a.discount_status === "pending").length;
  const newThisWeek = people.filter((p) => new Date(p.created_at).getTime() >= weekAgo);
  const studentsWeek = newThisWeek.filter((p) => isStudent(p)).length;
  const recruitersWeek = newThisWeek.filter((p) => isRecruiter(p)).length;
  return { studentsWeek, recruitersWeek, recruitersPending: recruiters.length, hiringOpen: hiring.length, evaluationsAwaiting: awaiting.length, total, week, fresh, freshPct: total ? Math.round((fresh / total) * 100) : 0, pending, byStatus, leads: leads.length, messages: msgs.length, deletions: dels.length };
}

export function Overview() {
  const q = useLoad(load, []);
  const d = q.data;
  return (
    <AdminShell sheet={c.sheet} name={c.name} title={c.title} lead={c.lead}>
      {q.error ? (
        <ErrorState text={q.error} onRetry={q.reload} />
      ) : (
        <>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {q.loading || !d ? (
              <>
                <StatSkeleton />
                <StatSkeleton />
                <StatSkeleton />
                <StatSkeleton />
              </>
            ) : (
              <>
                <StatCard testId="stat-total" value={d.total} label={c.stats.total} href="/admin/applications/" />
                <StatCard testId="stat-week" value={d.week} label={c.stats.week} href="/admin/applications/?status=submitted" />
                <StatCard testId="stat-fresh" value={`${d.freshPct}%`} label={c.stats.fresh} />
                <StatCard testId="stat-pending" value={d.pending} label={c.stats.pending} href="/admin/applications/?discount=pending" />
              </>
            )}
          </div>

          <p className="mono mt-10">{c.people}</p>
          <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {q.loading || !d ? (
              <>
                <StatSkeleton />
                <StatSkeleton />
                <StatSkeleton />
                <StatSkeleton />
              </>
            ) : (
              <>
                <StatCard testId="stat-students-week" value={d.studentsWeek} label={c.peopleStats.students} href="/admin/users/?type=student" />
                <StatCard testId="stat-recruiters-week" value={d.recruitersWeek} label={c.peopleStats.recruiters} href="/admin/users/?type=recruiter" />
                <StatCard testId="stat-recruiters-pending" value={d.recruitersPending} label={c.peopleStats.pending} href="/admin/recruiters/" />
                <StatCard testId="stat-hiring-open" value={d.hiringOpen} label={c.peopleStats.hiring} href="/admin/hiring/" />
              </>
            )}
          </div>

          <p className="mono mt-10">{evaluations.overview.label}</p>
          <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {q.loading || !d ? <StatSkeleton /> : <StatCard testId="stat-evaluations-awaiting" value={d.evaluationsAwaiting} label={evaluations.overview.awaiting} href="/admin/evaluations/?status=submitted" />}
          </div>

          <div className="mt-14 grid gap-12 lg:grid-cols-12 lg:gap-8">
            <AdminSection index="01" title={c.byStatus} hint={c.byStatusHint} className="lg:col-span-7">
              {q.loading || !d ? (
                <BlockSkeleton lines={6} />
              ) : d.total === 0 ? (
                <EmptyState title={c.empty.title} text={c.empty.text} />
              ) : (
                <table className="w-full text-[15px]" data-testid="by-status">
                  <tbody>
                    {STATUSES.map((st) => {
                      const n = d.byStatus[st] ?? 0;
                      const pct = d.total ? Math.round((n / d.total) * 100) : 0;
                      return (
                        <tr key={st} className="border-b last:border-b-0" style={rule}>
                          <td className="py-3 pe-4">
                            <Link prefetch={false} href={`/admin/applications/?status=${st}`} className="hover:text-accent-text">
                              <StatusBadge status={st} />
                            </Link>
                          </td>
                          <td className="hidden w-full py-3 sm:table-cell">
                            <span aria-hidden className="block h-px w-full" style={{ background: "var(--rule)" }}>
                              <span className="block h-px bg-accent" style={{ width: `${pct}%` }} />
                            </span>
                          </td>
                          <td className="mono py-3 ps-4 text-end !text-text tabular-nums" data-status={st}>
                            {n}
                          </td>
                          <td className="mono w-14 py-3 ps-3 text-end">{pct}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </AdminSection>

            <AdminSection index="02" title={c.inbox} hint={c.inboxHint} className="lg:col-span-5">
              {q.loading || !d ? (
                <BlockSkeleton lines={3} />
              ) : (
                <>
                  <dl className="divide-y" style={{ borderColor: "var(--rule)" }}>
                    {[
                      { k: c.inboxRows.leads, v: d.leads, href: "/admin/leads/?tab=leads" },
                      { k: c.inboxRows.messages, v: d.messages, href: "/admin/leads/?tab=messages" },
                      { k: c.inboxRows.deletions, v: d.deletions, href: "/admin/leads/?tab=deletions" },
                    ].map((r) => (
                      <div key={r.k} className="flex items-center justify-between gap-4 border-b py-3 last:border-b-0" style={rule}>
                        <dt>
                          <Link prefetch={false} href={r.href} className="ul-draw pb-0.5 text-text hover:text-accent-text">
                            {r.k}
                          </Link>
                        </dt>
                        <dd className="text-[1.5rem] font-semibold leading-none tracking-tight tabular-nums" style={{ color: r.v > 0 ? "var(--warm)" : "var(--text-dim)" }}>
                          {r.v}
                        </dd>
                      </div>
                    ))}
                  </dl>
                  <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:flex-wrap">
                    <Button href="/admin/applications/?discount=pending" variant="secondary">
                      {c.links.pending}
                    </Button>
                    <Button href="/admin/leads/" variant="link">
                      {c.links.leads}
                    </Button>
                  </div>
                </>
              )}
            </AdminSection>
          </div>
        </>
      )}
    </AdminShell>
  );
}

function StatCard({ value, label, href, testId }: { value: React.ReactNode; label: string; href?: string; testId: string }) {
  const inner = <Stat value={<span data-testid={testId}>{value}</span>} label={label} />;
  if (!href) return <div className="card p-6">{inner}</div>;
  return (
    <Link prefetch={false} href={href} className="card block p-6 transition-[border-color] hover:border-accent">
      {inner}
    </Link>
  );
}
