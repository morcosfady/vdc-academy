import Link from "next/link";
import { site } from "@/config/site";
import { content, hasInstructors, hasStudentWork, shown } from "@/content/site";
import { ReduceMotionToggle } from "./ReduceMotionToggle";

const legal = [
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/accessibility", label: "Accessibility" },
];

export function Footer() {
  const linkedin = shown(content.social.linkedin);
  const email = shown(content.contact.email);
  const explore = [
    ...site.menu.filter((m) => m.href !== "/contact"),
    ...(hasInstructors() ? [{ href: "/instructors", label: "Instructors" }] : []),
    ...(hasStudentWork() ? [{ href: "/student-work", label: "Student Work" }] : []),
  ];

  return (
    <footer className="theme-dark relative overflow-hidden bg-[#000e12] border-t border-border pb-10 pt-24 md:pt-36">
      <div className="mx-auto max-w-[1280px] px-5 md:px-8">
        <p className="display-lg max-w-4xl">Build it digitally before you build it for real.</p>
        <div className="mt-16 grid gap-10 md:grid-cols-4">
          <div>
            <p className="label mb-4">Explore</p>
            <ul className="space-y-2">
              {explore.map((l) => (
                <li key={l.href}><Link prefetch={false} href={l.href} className="text-muted hover:text-text">{l.label}</Link></li>
              ))}
            </ul>
          </div>
          <div>
            <p className="label mb-4">Contact</p>
            <ul className="space-y-2 text-muted">
              <li>{site.city}</li>
              {email && <li><a href={`mailto:${email}`} className="hover:text-text">{email}</a></li>}
              <li><Link prefetch={false} href="/contact" className="hover:text-text">Talk to an advisor</Link></li>
            </ul>
          </div>
          <div>
            <p className="label mb-4">Bay BIM Designs</p>
            <ul className="space-y-2 text-muted">
              <li><a href={site.parentUrl} className="hover:text-text">baybimdesigns.com</a></li>
              {linkedin && <li><a href={linkedin} className="hover:text-text">LinkedIn</a></li>}
            </ul>
          </div>
          <div>
            <p className="label mb-4">Legal</p>
            <ul className="space-y-2">
              {legal.map((l) => (
                <li key={l.href}><Link prefetch={false} href={l.href} className="text-muted hover:text-text">{l.label}</Link></li>
              ))}
            </ul>
          </div>
        </div>
        <div className="mt-16 flex flex-wrap items-center justify-between gap-4 text-sm text-muted">
          <p>© {new Date().getFullYear()} VDC Academy, a {site.parent} company</p>
          <ReduceMotionToggle />
        </div>
      </div>
      <p aria-hidden className="pointer-events-none mt-10 select-none whitespace-nowrap text-center font-display text-[16.5vw] leading-none tracking-tighter text-text/[0.05]">
        VDC ACADEMY
      </p>
    </footer>
  );
}
