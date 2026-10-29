import type { Metadata } from "next";
import { PageHero } from "@/components/ui/PageHero";
import { CalendarView } from "@/components/calendar/CalendarView";
import { JsonLd, breadcrumbLd } from "@/components/seo/JsonLd";
import { pageMeta } from "@/components/seo/meta";
import { CALENDAR_IS_SAMPLE } from "@/content/calendar";
import { calendarCopy as c } from "@/content/copy-calendar";
import { eventLd, loadEvents, upcoming } from "@/lib/calendar";

// While the dates are a sample the page is noindex, so search engines never list them.
export const metadata: Metadata = pageMeta({
  title: c.metaTitle,
  description: c.metaDescription,
  path: "/calendar/",
  og: "home",
  robots: CALENDAR_IS_SAMPLE ? { index: false, follow: true } : undefined,
});

export default async function CalendarPage() {
  // Event structured data for the next five dated events, only once real dates are published. Deadlines are not
  // events in the schema.org sense, so they are left out.
  const next = CALENDAR_IS_SAMPLE ? [] : upcoming((await loadEvents()).filter((e) => e.type !== "deadline"), Date.now(), 5);
  return (
    <>
      <JsonLd data={breadcrumbLd([{ name: "Calendar", path: "/calendar/" }])} />
      {next.map((e) => (
        <JsonLd key={e.id} data={eventLd(e)} />
      ))}
      <PageHero sheet={c.sheet} eyebrow={c.name} title={[c.title]} subtitle={c.lead} />
      <section className="theme-light section !pt-10 lg:!pt-14">
        <div className="wrap">
          <CalendarView />
        </div>
      </section>
    </>
  );
}
