import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/ui/PageHero";
import { Button } from "@/components/ui/Button";
import { ContactForm } from "@/components/forms/ContactForm";
import { Map } from "@/components/ds/Map";
import { content, shown } from "@/content/site";
import { pages } from "@/content/copy-pages";
import { site } from "@/config/site";

export const metadata: Metadata = { title: "Contact", description: "Talk to a VDC Academy advisor." };

const c = pages.contact;
const rule = { borderColor: "var(--rule)" } as const;
const link = "ul-draw pb-0.5 hover:text-accent-text";

export default function ContactPage() {
  const email = shown(content.contact.email);
  const phone = shown(content.contact.phone);
  const whatsapp = shown(content.contact.whatsapp);
  const address = shown(content.contact.address);
  const hours = shown(content.contact.hours);
  const response = shown(content.contact.responseTime);
  const booking = shown(content.contact.bookingUrl);

  // Title block rows: every row is a fact the owner has approved, nothing is shown unset.
  const rows: { k: string; v: React.ReactNode }[] = [
    ...(email ? [{ k: c.block.email, v: <a href={`mailto:${email}`} className={link}>{email}</a> }] : []),
    ...(phone ? [{ k: c.block.phone, v: <a href={`tel:${phone.replace(/[^+\d]/g, "")}`} className={link}>{phone}</a> }] : []),
    ...(whatsapp ? [{ k: c.block.whatsapp, v: <a href={`https://wa.me/${whatsapp.replace(/\D/g, "")}`} className={link}>{`+${whatsapp.replace(/\D/g, "")}`}</a> }] : []),
    ...(hours ? [{ k: c.block.hours, v: hours }] : []),
    ...(response ? [{ k: c.block.response, v: response }] : []),
    { k: c.block.location, v: address ?? site.city },
    { k: c.block.coords, v: <span className="mono !text-text">{site.coords}</span> },
    {
      k: c.block.partOf,
      v: (
        <a href={site.parentUrl} className={link}>
          {site.parent}
        </a>
      ),
    },
  ];

  return (
    <>
      <PageHero sheet={c.sheet} eyebrow={c.name} title={[c.title]} subtitle={c.lead} />
      <section className="theme-light section !pt-12 lg:!pt-16">
        <div className="wrap">
          <div className="grid-12 items-start gap-y-14">
            <div className="col-span-12 lg:col-span-6">
              <ContactForm />
            </div>

            <aside className="col-span-12 lg:col-span-5 lg:col-start-8" aria-labelledby="reach">
              <p id="reach" className="mono mb-4">
                {c.panel}
              </p>
              {/* Title block: two cells per row, hairlines, mono keys */}
              <dl className="grid grid-cols-1 overflow-hidden rounded-[4px] border sm:grid-cols-2" style={rule}>
                {rows.map((r, i) => (
                  <div key={r.k} className={`border-b p-4 sm:[&:nth-last-child(2):nth-child(odd)]:border-b-0 ${i % 2 === 0 ? "sm:border-e" : ""} last:border-b-0`} style={rule}>
                    <dt className="mono">{r.k}</dt>
                    <dd className="mt-1 text-[15px] text-text">{r.v}</dd>
                  </div>
                ))}
              </dl>

              <div className="mt-6 rounded-[12px] border p-3" style={rule}>
                <Map />
                <p className="mono mt-2 px-1">{c.mapCaption}</p>
              </div>

              {booking && (
                <div className="mt-8 flex flex-col gap-3 border-t pt-6 sm:flex-row sm:items-center sm:justify-between" style={rule}>
                  <p className="text-[15px] font-medium text-text">{c.bookLead}</p>
                  <Button href={booking} variant="secondary">
                    {c.book}
                  </Button>
                </div>
              )}

              <nav aria-label={c.quick.title} className="mt-8 border-t pt-6" style={rule}>
                <p className="mono">{c.quick.title}</p>
                <ul className="mt-3 flex flex-wrap gap-x-8 gap-y-2">
                  {c.quick.items.map((q) => (
                    <li key={q.href}>
                      <Link prefetch={false} href={q.href} className="ul-draw inline-flex items-center gap-2 pb-1 text-[15px] font-medium text-text hover:text-accent-text">
                        {q.label}
                        <svg aria-hidden width="16" height="12" viewBox="0 0 16 12">
                          <path d="M0 6h14M9 1l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.5" />
                        </svg>
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            </aside>
          </div>
        </div>
      </section>
    </>
  );
}
