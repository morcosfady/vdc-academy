import type { Metadata } from "next";
import { PageHero } from "@/components/ui/PageHero";
import { ContactForm } from "@/components/forms/ContactForm";
import { TitleBlock } from "@/components/ds/Devices";
import { content, shown } from "@/content/site";
import { pages } from "@/content/copy-pages";
import { site } from "@/config/site";

export const metadata: Metadata = { title: "Contact", description: "Talk to a VDC Academy advisor." };

const c = pages.contact;

export default function ContactPage() {
  const email = shown(content.contact.email);
  const phone = shown(content.contact.phone);
  const address = shown(content.contact.address);
  const rows = [
    { k: c.block.project, v: site.name },
    { k: c.block.location, v: address ?? site.city },
    { k: c.block.coords, v: <span className="mono !text-text">{site.coords}</span> },
    {
      k: c.block.partOf,
      v: (
        <a href={site.parentUrl} className="ul-draw pb-0.5 hover:text-accent-text">
          {site.parent}
        </a>
      ),
    },
    ...(email
      ? [
          {
            k: c.block.email,
            v: (
              <a href={`mailto:${email}`} className="ul-draw pb-0.5 hover:text-accent-text">
                {email}
              </a>
            ),
          },
        ]
      : []),
    ...(phone ? [{ k: c.block.phone, v: phone }] : []),
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
            <aside className="col-span-12 lg:col-span-5 lg:col-start-8" aria-label={c.block.location}>
              <TitleBlock className="rounded-[4px] [&>div]:min-w-[50%] [&>div:nth-child(even)]:border-e-0 [&>div]:border-b" rows={rows} />
            </aside>
          </div>
        </div>
      </section>
    </>
  );
}
