"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { firstName, verificationLabel, type InstructorProfile } from "@/lib/db";
import { AVAILABILITY, FORMATS, INDUSTRY_YEARS, INSTRUCTOR_SUBJECTS, TEACHING_YEARS, labelOf } from "@/lib/signupSchema";
import { Tag } from "@/components/ds/Chips";
import { Button } from "@/components/ui/Button";
import { account } from "@/content/copy-account";
import { AccountShell, Panel } from "./AccountShell";
import { InstructorStudents } from "@/components/evaluations/InstructorStudents";
import { Notice } from "./Notice";
import { shortId } from "./format";

const i = account.instructor;

const Arrow = () => (
  <svg aria-hidden width="16" height="12" viewBox="0 0 16 12">
    <path d="M0 6h14M9 1l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);

// /account/ for instructors: the review status, the teaching profile and the students the team assigned to them.
// Instructors have no access to applications or to other people's profiles, and this screen never asks for them: the
// students come from the view my_students (see InstructorStudents).
export function InstructorDashboard() {
  const { user, profile } = useAuth();
  const name = firstName(profile?.full_name ?? (user?.user_metadata?.full_name as string | undefined));
  return (
    <AccountShell
      sheet={i.sheet}
      name={i.name}
      title={i.welcome(name)}
      lead={i.leadStudents}
      actions={
        <Button href="/account/profile/#teaching" variant="link">
          {i.teaching.edit}
        </Button>
      }
    >
      <Body />
    </AccountShell>
  );
}

function Body() {
  const { profile, instructor } = useAuth();
  return (
    <>
      <VerificationBanner instructor={instructor} />
      <div className="grid-12 mt-14 gap-y-10">
        <Panel id="teaching" label={i.teaching.label} className="col-span-12 scroll-mt-24 lg:col-span-8">
          <TeachingCard instructor={instructor} fullName={profile?.full_name ?? null} />
        </Panel>
      </div>
      <InstructorStudents className="mt-20" />
    </>
  );
}

function VerificationBanner({ instructor }: { instructor: InstructorProfile | null }) {
  const status = instructor?.verification_status ?? "pending";
  const note = instructor?.rejection_note?.trim();
  return (
    <div data-testid="verification-banner" data-status={status}>
      <Notice tone={status === "approved" ? "ok" : "info"} className={status === "rejected" ? "!border-err" : undefined}>
        <span className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="mono">{i.banner.label}</span>
          <Tag tone={status === "approved" ? "blueprint" : status === "pending" ? "brass" : "default"}>{verificationLabel[status]}</Tag>
        </span>
        <span className="mt-2 block">{i.banner[status]}</span>
        {status === "rejected" && (
          <>
            {note && (
              <span className="mt-4 block border-s-2 ps-4" style={{ borderColor: "var(--err)" }}>
                <span className="mono block">{i.banner.note}</span>
                <span className="mt-1 block" data-testid="rejection-note">
                  {note}
                </span>
              </span>
            )}
            <span className="mt-4 block text-muted">
              {i.banner.contactText}{" "}
              <Link prefetch={false} href="/contact/" className="ul-draw pb-0.5 font-medium text-text hover:text-accent-text">
                {i.banner.contact}
              </Link>
            </span>
          </>
        )}
      </Notice>
    </div>
  );
}

function TeachingCard({ instructor, fullName }: { instructor: InstructorProfile | null; fullName: string | null }) {
  const editLink = (
    <Link prefetch={false} href="/account/profile/#teaching" className="ul-draw mt-6 inline-flex items-center gap-2 pb-1 text-[15px] font-medium text-text hover:text-accent-text">
      {i.teaching.edit}
      <Arrow />
    </Link>
  );
  if (!instructor?.job_title)
    return (
      <div className="card p-6 md:p-7">
        <p className="t-small text-muted">{i.teaching.missing}</p>
        {editLink}
      </div>
    );
  const link = instructor.linkedin_url;
  const subjects = instructor.subjects ?? [];
  const t = i.teaching;
  const row = (label: string, value: React.ReactNode, wide = false) => (
    <div className={wide ? "sm:col-span-2" : undefined}>
      <dt className="mono">{label}</dt>
      <dd className="mt-1 text-[15px] text-text">{value || account.application.empty}</dd>
    </div>
  );
  return (
    <article className="card p-6 md:p-7" aria-labelledby="teaching-name" data-testid="teaching-card">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="mono !text-text">IN-{shortId(instructor.id)}</span>
        <Tag tone={instructor.verification_status === "approved" ? "blueprint" : "default"}>{verificationLabel[instructor.verification_status]}</Tag>
      </div>
      <h3 id="teaching-name" className="mt-5 !text-[1.375rem]">
        {instructor.job_title}
      </h3>
      <p className="t-small mt-1 text-muted">{[fullName, instructor.employer].filter(Boolean).join(", ")}</p>
      <dl className="mt-5 grid gap-x-8 gap-y-4 border-t pt-4 sm:grid-cols-2" style={{ borderColor: "var(--rule)" }}>
        {row(t.industryYears, labelOf(INDUSTRY_YEARS, instructor.industry_years))}
        {row(t.teachingYears, labelOf(TEACHING_YEARS, instructor.teaching_years))}
        {row(t.format, labelOf(FORMATS, instructor.teaching_format))}
        {row(t.availability, labelOf(AVAILABILITY, instructor.availability))}
        {row(
          t.subjects,
          subjects.length ? (
            <ul className="flex flex-wrap gap-2" data-testid="teaching-subjects">
              {subjects.map((s) => (
                <li key={s}>
                  <Tag>{labelOf(INSTRUCTOR_SUBJECTS, s)}</Tag>
                </li>
              ))}
            </ul>
          ) : null,
          true,
        )}
        {row(
          t.linkedin,
          link ? (
            <a href={link} target="_blank" rel="noopener noreferrer" className="ul-draw break-all pb-0.5 hover:text-accent-text">
              {link.replace(/^https?:\/\/(www\.)?/i, "").replace(/\/$/, "")}
            </a>
          ) : null,
          true,
        )}
        {row(t.bio, instructor.bio ? <span className="block whitespace-pre-line text-muted">{instructor.bio}</span> : null, true)}
      </dl>
      {editLink}
    </article>
  );
}
