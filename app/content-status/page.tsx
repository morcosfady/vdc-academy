import type { Metadata } from "next";
import { PageHero } from "@/components/ui/PageHero";
import { Tag } from "@/components/ds/Chips";
import { Stat } from "@/components/ds/Sections";
import { confirmed, content, type Field } from "@/content/site";
import { draftDetails, programs, type Program } from "@/content/programs";
import { draftPlans, plans } from "@/content/plans";

// C-000: dev-only checklist of every owner value, read straight from the content modules. Not linked, not indexed.
export const metadata: Metadata = { title: "Content status", robots: { index: false, follow: false } };

type Status = "approved" | "draft" | "missing";
type Row = { label: string; where: string; value: string | null; status: Status; blocks?: boolean };
type Group = { id: string; title: string; note?: string; rows: Row[] };

const marks: Record<Status, { text: string; tone: "blueprint" | "brass" | "default" }> = {
  approved: { text: "✅ Approved", tone: "blueprint" },
  draft: { text: "⏳ Draft", tone: "brass" },
  missing: { text: "❌ Missing", tone: "default" },
};

const empty = (v: unknown) => v === null || v === undefined || v === "";

// A Field is approved only with a value and approved: true, the same rule the site uses to show it.
const fieldRow = (label: string, where: string, x: Field, blocks?: boolean): Row => ({
  label,
  where,
  value: empty(x.value) ? null : String(x.value),
  status: empty(x.value) ? "missing" : x.approved ? "approved" : "draft",
  blocks,
});

// A list shows on the site as soon as it has entries, so entries count as approved.
const listRow = (label: string, where: string, n: number, noun: string): Row => ({
  label,
  where,
  value: n > 0 ? `${n} ${noun}` : null,
  status: n > 0 ? "approved" : "missing",
});

const usd = (n: number) => `$${n.toLocaleString("en-US")}`;

// One DRAFT value for one program: missing when null, approved when its switch is on, draft otherwise.
const draftRow = (label: string, slug: string, key: keyof Program, on: boolean, fmt: (v: string | number) => string): Row => {
  const v = draftDetails[slug]?.[key];
  const ok = typeof v === "string" || typeof v === "number";
  return {
    label,
    where: `content/programs.ts > DRAFT["${slug}"].${key}`,
    value: ok && v !== "" ? fmt(v) : null,
    status: !ok || v === "" ? "missing" : on ? "approved" : "draft",
  };
};

const c = content.contact;

const groups: Group[] = [
  {
    id: "switches",
    title: "Commercial switches",
    note: "While a switch is off, the matching draft values stay hidden on the site.",
    rows: [
      { label: "Prices confirmed", where: "content/site.ts > confirmed.prices", value: confirmed.prices ? "On" : "Off", status: confirmed.prices ? "approved" : "draft", blocks: true },
      { label: "Schedules confirmed", where: "content/site.ts > confirmed.schedules", value: confirmed.schedules ? "On" : "Off", status: confirmed.schedules ? "approved" : "draft", blocks: true },
    ],
  },
  {
    id: "contact",
    title: "Contact",
    rows: [
      fieldRow("Email", "content/site.ts > content.contact.email", c.email, true),
      fieldRow("Phone", "content/site.ts > content.contact.phone", c.phone),
      fieldRow("WhatsApp", "content/site.ts > content.contact.whatsapp", c.whatsapp),
      fieldRow("Address", "content/site.ts > content.contact.address", c.address),
      fieldRow("Office hours", "content/site.ts > content.contact.hours", c.hours),
      fieldRow("Response time", "content/site.ts > content.contact.responseTime", c.responseTime),
      fieldRow("Booking link", "content/site.ts > content.contact.bookingUrl", c.bookingUrl),
    ],
  },
  {
    id: "site",
    title: "Site and social",
    rows: [
      fieldRow("Domain", "content/site.ts > content.domain", content.domain, true),
      fieldRow("LinkedIn", "content/site.ts > content.social.linkedin", content.social.linkedin),
      fieldRow("Next cohort", "content/site.ts > content.nextCohort", content.nextCohort),
    ],
  },
  {
    id: "people",
    title: "People and proof",
    rows: [
      ...(content.testimonials.length
        ? content.testimonials.map(
            (t, i): Row => ({ label: `Testimonial ${i + 1}`, where: `content/site.ts > content.testimonials[${i}].approved`, value: t.who, status: t.approved ? "approved" : "draft" }),
          )
        : [listRow("Testimonials", "content/site.ts > content.testimonials", 0, "quotes")]),
      listRow("Instructors", "content/site.ts > content.instructors", content.instructors.length, "profiles"),
      listRow("Student work", "content/site.ts > content.studentWork", content.studentWork.length, "projects"),
      listRow("Stats", "content/site.ts > content.stats", content.stats.length, "numbers"),
    ],
  },
  {
    id: "launch",
    title: "Outside the content files",
    note: "Tracked by hand. Update these two rows in app/content-status/page.tsx when they are done.",
    rows: [
      { label: "Legal review", where: "content/copy-pages.ts > pages.privacy, pages.terms", value: "Written by the studio, lawyer review pending", status: "draft", blocks: true },
      { label: "Logo font", where: "app/layout.tsx > logo font (Michroma stand-in)", value: null, status: "missing", blocks: true },
    ],
  },
  ...programs.map(
    (p): Group => ({
      id: p.slug,
      title: p.title,
      rows: [
        draftRow("Price", p.slug, "priceFull", confirmed.prices, (v) => usd(Number(v))),
        draftRow("Duration", p.slug, "durationWeeks", confirmed.schedules, (v) => `${v} weeks`),
        draftRow("Hours", p.slug, "hours", confirmed.schedules, (v) => `${v} hours`),
        draftRow("Format", p.slug, "format", confirmed.schedules, String),
        draftRow("Schedule", p.slug, "schedule", confirmed.schedules, String),
        draftRow("Seats", p.slug, "seats", confirmed.schedules, (v) => `${v} seats`),
        draftRow("Next cohort", p.slug, "nextCohortDate", confirmed.schedules, String),
      ],
    }),
  ),
  {
    id: "plans",
    title: "Plan prices",
    note: "Studio drafts from content/plans.ts. Public pages hide them until prices are confirmed.",
    rows: plans.map(
      (p, i): Row => ({
        label: p.name,
        where: `content/plans.ts > draft, id "${p.id}", price`,
        value: p.price !== null ? usd(p.price) : draftPlans[i]?.price != null ? usd(draftPlans[i].price as number) : null,
        status: confirmed.prices ? (p.price !== null ? "approved" : "missing") : "draft",
      }),
    ),
  },
];

const rows = groups.flatMap((g) => g.rows);
const count = (s: Status) => rows.filter((r) => r.status === s).length;
const blocking = rows.filter((r) => r.blocks && r.status !== "approved");

function Mark({ status }: { status: Status }) {
  return <Tag tone={marks[status].tone}>{marks[status].text}</Tag>;
}

// Stacked on phones, four columns from md up.
function StatusRow({ row }: { row: Row }) {
  return (
    <li className="rule-t grid grid-cols-1 gap-2 py-4 md:grid-cols-12 md:items-center md:gap-4">
      <p className="font-semibold text-text md:col-span-3">{row.label}</p>
      <p className="mono !normal-case !tracking-normal break-all md:col-span-4">{row.where}</p>
      <p className="t-small text-muted [overflow-wrap:anywhere] md:col-span-3">{row.value ?? "Not provided"}</p>
      <div className="md:col-span-2 md:justify-self-end">
        <Mark status={row.status} />
      </div>
    </li>
  );
}

export default function ContentStatus() {
  return (
    <>
      <PageHero
        eyebrow="Content status"
        sheet="C-000"
        title={["Content status"]}
        subtitle="Every owner value the site reads, with its state today. Send docs/CLIENT-INPUT.md to the client to fill the gaps."
      />
      <section className="theme-light section !pt-16 lg:!pt-20">
        <div className="wrap">
          <div className="grid max-w-2xl grid-cols-3 gap-6">
            <Stat value={count("approved")} label="✅ Approved" />
            <Stat value={count("draft")} label="⏳ Draft" />
            <Stat value={count("missing")} label="❌ Missing" />
          </div>

          <div className="mt-16 max-w-3xl">
            <h2 className="t-h4">Blocking launch</h2>
            {blocking.length ? (
              <ul className="mt-6">
                {blocking.map((r) => (
                  <li key={r.where} className="rule-t flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
                    <span className="font-semibold text-text">{r.label}</span>
                    <span className="flex flex-wrap items-center gap-3">
                      <span className="mono !normal-case !tracking-normal break-all">{r.where}</span>
                      <Mark status={r.status} />
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="t-small mt-6 text-muted">Nothing is blocking launch.</p>
            )}
          </div>

          {groups.map((g) => (
            <div key={g.id} id={g.id} className="mt-20">
              <h2 className="t-h4">{g.title}</h2>
              {g.note && <p className="t-small mt-3 text-muted">{g.note}</p>}
              <div className="mono mt-8 hidden md:grid md:grid-cols-12 md:gap-4 md:pb-3">
                <span className="md:col-span-3">Item</span>
                <span className="md:col-span-4">Where in the code</span>
                <span className="md:col-span-3">Value</span>
                <span className="md:col-span-2 md:text-right">Status</span>
              </div>
              <ul className="mt-4 md:mt-0">
                {g.rows.map((r) => (
                  <StatusRow key={r.where} row={r} />
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
