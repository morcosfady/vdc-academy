"use client";

import { useEffect, useState } from "react";
import { SheetTag } from "@/components/ds/Devices";
import { Tag } from "@/components/ds/Chips";
import { Button } from "@/components/ui/Button";
import { demo, demoOn } from "@/lib/demo/browser";
import { DEMO_ADMIN_EMAIL, DEMO_APP_ID, DEMO_PASSWORD, DEMO_RECRUITER_EMAIL, DEMO_STUDENT_EMAIL, DEMO_SUPER_EMAIL } from "@/lib/demo/seed";

const rule = { borderColor: "var(--rule)" } as const;

// /demo/: a five-card guided tour for presenting the full product before the backend is live. Each card puts the
// browser in the right state (guest, sample student, sample admin) and opens the page. Sample people are fictional.
const cards = [
  {
    n: "01",
    title: "Register as a student",
    text: "The role question first, then the account, every required detail, a review with Edit links and the consents. Use Fill sample data to move fast.",
    hint: "Sign-ups confirm instantly in the demo. The real site sends a confirmation email first.",
    action: "Register as a student",
    go: () => demo.asGuest("/signup/?as=student"),
  },
  {
    n: "02",
    title: "Register as a recruiter",
    text: "Work email, company details, roles they hire for and the authorisation checkbox. The account starts pending verification.",
    hint: "Fill sample data fills a fictional company.",
    action: "Register as a recruiter",
    go: () => demo.asGuest("/signup/?as=recruiter"),
  },
  {
    n: "03",
    title: "Apply as a new student",
    text: "The apply gate asks for an account first, then the five application steps and the success sheet.",
    hint: "Logged out. Create an account from the gate or log in.",
    action: "Open the apply gate",
    go: () => demo.asGuest("/apply/"),
  },
  {
    n: "04",
    title: "Student dashboard",
    text: "Sample Student 01 has a submitted application: the timeline sits at Under review and the fresh graduate discount is pending a check.",
    hint: `Logged in as ${DEMO_STUDENT_EMAIL}.`,
    action: "Open the dashboard",
    go: () => demo.asStudent("/account/"),
  },
  {
    n: "05",
    title: "Profile page",
    text: "Contact details, education and the account settings a student keeps up to date. Edits stay in this browser.",
    hint: `Logged in as ${DEMO_STUDENT_EMAIL}.`,
    action: "Open the profile",
    go: () => demo.asStudent("/account/profile/"),
  },
  {
    n: "06",
    title: "Recruiter dashboard",
    text: "Sample Company A is pending verification: the banner, the company card, a hiring request form and the talent section, which opens after verification.",
    hint: `Logged in as ${DEMO_RECRUITER_EMAIL}.`,
    action: "Open the recruiter dashboard",
    go: () => demo.asRecruiter("/account/"),
  },
  {
    n: "07",
    title: "Admin overview and applications",
    text: "Sixteen sample applications across every status and most programs. Filters, search, paging, CSV export and the inbox.",
    hint: `Logged in as ${DEMO_ADMIN_EMAIL}.`,
    action: "Open the admin",
    go: () => demo.asAdmin("/admin/"),
    second: { label: "Applications table", go: () => demo.asAdmin("/admin/applications/") },
  },
  {
    n: "08",
    title: "Admin application detail",
    text: "Verify the discount, change the status, add a note. Then open card 04 again: the student's timeline shows the change.",
    hint: "Sample Student 01's application.",
    action: "Open the application",
    go: () => demo.asAdmin(`/admin/application/?id=${DEMO_APP_ID}`),
  },
  {
    n: "09",
    title: "Super admin: users and recruiters",
    text: "The owner's view with the Super admin badge. Approve Sample Company A, then open card 06: the banner says Approved.",
    hint: `Logged in as ${DEMO_SUPER_EMAIL}. Same screens as an admin for now.`,
    action: "Open as super admin",
    go: () => demo.asSuperAdmin("/admin/recruiters/"),
    second: { label: "Users table", go: () => demo.asSuperAdmin("/admin/users/") },
  },
  {
    n: "10",
    title: "Recruiter evaluates a student",
    text: "Sample Company B is verified. The talent list shows only students who opted in, with no email or phone. Open one, score six criteria, write strengths and send it for review.",
    hint: "Logged in as recruiter02@example.com.",
    action: "Open the talent list",
    go: () => demo.asVerifiedRecruiter("/account/#talent"),
    second: { label: "Unverified view", go: () => demo.asRecruiter("/account/#talent") },
  },
  {
    n: "11",
    title: "Student sees an evaluation",
    text: "Sample Student A opted in and has three published evaluations: scores as thin lines, strengths, what to work on. The private note never appears. Switch visibility off on the profile and the student leaves the talent list.",
    hint: "Logged in as studenta@example.com.",
    action: "Open the dashboard card",
    go: () => demo.asTalentStudent("/account/#evaluations"),
    second: { label: "Visibility switch", go: () => demo.asTalentStudent("/account/profile/#visibility") },
  },
  {
    n: "12",
    title: "Admin moderates evaluations",
    text: "Four evaluations wait for review. Open one, read it with the private note, then publish it or hide it with a required note. Then open card 11 or 10 to see the result.",
    hint: `Logged in as ${DEMO_ADMIN_EMAIL}.`,
    action: "Open the review queue",
    go: () => demo.asAdmin("/admin/evaluations/?status=submitted"),
    second: { label: "All evaluations", go: () => demo.asAdmin("/admin/evaluations/") },
  },
];

export function DemoTour() {
  const [on, setOn] = useState<boolean | null>(null);
  useEffect(() => setOn(demoOn()), []);

  return (
    <section className="theme-light pt-[72px]">
      <div className="wrap">
        <header className="rule-b grid gap-y-8 pb-10 pt-12 lg:grid-cols-12 lg:pb-14 lg:pt-20">
          <div className="lg:col-span-7">
            <SheetTag sheet="D-000" name="Client demo" />
            <h1 className="t-h1 mt-8 max-w-[16ch]">The full experience, before the backend is live.</h1>
            <p className="t-lead mt-6 max-w-[52ch]">
              Twelve short scenes: a student and a recruiter register, a student applies and follows their status, verified recruiters evaluate students who chose to be seen, and the academy team reviews it all. Everything here runs on sample data inside this browser. Nothing is saved, nothing is sent, no real account is touched.
            </p>
          </div>
          <div className="lg:col-span-4 lg:col-start-9">
            <dl className="border-t text-[15px]" style={rule}>
              {[
                ["Student", DEMO_STUDENT_EMAIL],
                ["Recruiter", DEMO_RECRUITER_EMAIL],
                ["Admin", DEMO_ADMIN_EMAIL],
                ["Super admin", DEMO_SUPER_EMAIL],
                ["Password", DEMO_PASSWORD],
                ["Data", "24 applications, 6 recruiters, 3 hiring requests, 8 students (5 visible), 9 evaluations"],
              ].map(([k, v]) => (
                <div key={k} className="grid grid-cols-[88px_1fr] gap-4 border-b py-3" style={rule}>
                  <dt className="mono pt-1">{k}</dt>
                  <dd className="text-muted">{v}</dd>
                </div>
              ))}
            </dl>
            <p className="t-small mt-4 text-dim">Sample people only. The cards below log you in; the password is for the log-in screen if you want to show it.</p>
          </div>
        </header>

        <div className="flex flex-wrap items-center gap-x-8 gap-y-4 pt-8" data-testid="demo-state">
          {on === null ? null : on ? (
            <>
              <Tag tone="brass">Demo is on</Tag>
              <button type="button" onClick={() => demo.reset()} className="mono ul-draw min-h-11 hover:!text-text" data-testid="demo-reset">
                Reset demo data
              </button>
              <button type="button" onClick={() => demo.exit()} className="mono ul-draw min-h-11 hover:!text-text">
                Exit demo
              </button>
            </>
          ) : (
            <>
              <Tag>Demo is off</Tag>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  demo.enable();
                  demo.reset();
                  window.location.reload();
                }}
                data-testid="demo-start"
              >
                Turn demo mode on
              </Button>
              <p className="t-small text-dim">Or open any card: it turns the demo on by itself.</p>
            </>
          )}
        </div>

        <ol className="grid gap-6 pb-24 pt-10 md:grid-cols-2 lg:pb-32 xl:grid-cols-3">
          {cards.map((c) => (
            <li key={c.n} className="card flex flex-col p-7" data-testid="demo-card">
              <p className="mono !text-accent-text">{c.n}</p>
              <h2 className="mt-4 !text-[1.35rem]">{c.title}</h2>
              <p className="t-small mt-3 text-muted">{c.text}</p>
              <p className="mono mt-4 !normal-case !tracking-normal text-dim">{c.hint}</p>
              <div className="mt-auto flex flex-wrap items-center gap-x-6 gap-y-3 pt-7">
                <Button type="button" onClick={c.go} className="!h-11 !px-5">
                  {c.action}
                </Button>
                {c.second && (
                  <button type="button" onClick={c.second.go} className="mono ul-draw min-h-11 hover:!text-text">
                    {c.second.label}
                  </button>
                )}
              </div>
            </li>
          ))}
        </ol>

        <div className="rule-t grid gap-8 pb-24 pt-10 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <p className="mono">How to present it in five minutes</p>
            <ol className="mt-5 grid gap-3 text-[15px] text-muted">
              {[
                "Start on the home page with the demo off: the drawing-set design, the model, the programs.",
                "Cards 01 and 02: register a student and a recruiter. Fill sample data, show the review and the consents.",
                "Card 04: the student dashboard. Point at the timeline, the pending discount, the documents panel.",
                "Card 06: the recruiter dashboard, pending verification, then send a hiring request.",
                "Card 09: approve the company as super admin, then card 06 again: Approved. Finish with Reset demo data, then Exit demo.",
              ].map((s, i) => (
                <li key={s} className="grid grid-cols-[2.5rem_1fr] gap-x-2 border-t py-3" style={rule}>
                  <span className="mono pt-0.5 !text-accent-text">{String(i + 1).padStart(2, "0")}</span>
                  <span>{s}</span>
                </li>
              ))}
            </ol>
          </div>
          <div className="lg:col-span-4 lg:col-start-9">
            <p className="mono">What the demo does not do</p>
            <ul className="t-small mt-5 grid gap-3 text-dim">
              <li>No emails are sent, so the confirmation and status emails are described, not shown.</li>
              <li>Documents open a sample PDF instead of the uploaded file.</li>
              <li>Data stays in this browser. Another device starts from the same seed.</li>
              <li>Search engines are told to skip this page.</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
