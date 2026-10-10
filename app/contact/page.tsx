import type { Metadata } from "next";
import { PageHero } from "@/components/ui/PageHero";
import { ContactForm } from "@/components/forms/ContactForm";
import { content, shown } from "@/content/site";
import { site } from "@/config/site";

export const metadata: Metadata = { title: "Contact", description: "Talk to a VDC Academy advisor." };

export default function ContactPage() {
  const email = shown(content.contact.email);
  const phone = shown(content.contact.phone);
  const address = shown(content.contact.address);
  return (
    <>
      <PageHero eyebrow="Contact" title={["Talk to an advisor."]} subtitle="Questions about programs, discounts or fit? Send a message." />
      <section className="mx-auto grid max-w-[1280px] gap-16 px-5 pb-32 md:px-10 lg:grid-cols-12">
        <div className="lg:col-span-7"><ContactForm /></div>
        <aside className="lg:col-span-4 lg:col-start-9">
          <p className="label mb-4">Where</p>
          <p>{address ?? site.city}</p>
          {(email || phone) && (
            <>
              <p className="label mb-4 mt-10">Direct</p>
              {email && <p><a href={`mailto:${email}`} className="underline underline-offset-4">{email}</a></p>}
              {phone && <p>{phone}</p>}
            </>
          )}
          <p className="label mb-4 mt-10">Part of</p>
          <p><a href={site.parentUrl} className="underline underline-offset-4">{site.parent}</a></p>
        </aside>
      </section>
    </>
  );
}
