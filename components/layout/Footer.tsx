import Link from "next/link";
import { site } from "@/config/site";
import { content, hasInstructors, hasStudentWork, shown } from "@/content/site";
import { Logo } from "@/components/ui/Logo";
import { TitleBlock } from "@/components/ds/Devices";
import { ReduceMotionToggle } from "./ReduceMotionToggle";
import { ComfortToggle } from "./ComfortToggle";

const legal = [
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/accessibility", label: "Accessibility" },
];

const ruleBorder = { borderColor: "var(--rule)" } as const;

// Deepest ink footer. Four columns, then an architectural title block across the bottom.
export function Footer() {
  const email = shown(content.contact.email);
  const linkedin = shown(content.social.linkedin);
  const programs = [
    { href: "/programs", label: "All programs" },
    { href: "/learning-path", label: "Learning path" },
    { href: "/pricing", label: "Pricing" },
    { href: "/fresh-graduates", label: "Fresh graduates" },
  ];
  const academy = [
    { href: "/about", label: "About" },
    { href: "/calendar", label: "Calendar" },
    { href: "/for-companies", label: "For companies" },
    ...(hasInstructors() ? [{ href: "/instructors", label: "Instructors" }] : []),
    ...(hasStudentWork() ? [{ href: "/student-work", label: "Student work" }] : []),
  ];
  const col = "t-small space-y-3 text-muted";
  const link = "ul-draw pb-0.5 hover:text-text";

  return (
    <footer className="theme-dark !bg-ink-3 pb-28 pt-24 sm:pb-10 md:pt-32">
      <div className="wrap">
        <div className="grid gap-12 md:grid-cols-4">
          <nav aria-label="Programs">
            <p className="mono mb-5">Programs</p>
            <ul className={col}>
              {programs.map((l) => (
                <li key={l.href}>
                  <Link prefetch={false} href={l.href} className={link}>
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <nav aria-label="Academy">
            <p className="mono mb-5">Academy</p>
            <ul className={col}>
              {academy.map((l) => (
                <li key={l.href}>
                  <Link prefetch={false} href={l.href} className={link}>
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div>
            <p className="mono mb-5">Support</p>
            <ul className={col}>
              <li>
                <Link prefetch={false} href="/faq" className={link}>
                  FAQ
                </Link>
              </li>
              <li>
                <Link prefetch={false} href="/contact" className={link}>
                  Talk to an advisor
                </Link>
              </li>
              {email && (
                <li>
                  <a href={`mailto:${email}`} className={link}>
                    {email}
                  </a>
                </li>
              )}
              <li>{site.city}</li>
            </ul>
          </div>
          <div>
            <p className="mono mb-5">Bay BIM Designs</p>
            <ul className={col}>
              <li>
                <a href={site.parentUrl} className={link}>
                  baybimdesigns.com
                </a>
              </li>
              {linkedin && (
                <li>
                  <a href={linkedin} className={link}>
                    LinkedIn
                  </a>
                </li>
              )}
            </ul>
          </div>
        </div>

        <div className="mt-20 border" style={ruleBorder}>
          <div className="grid md:grid-cols-[1fr_auto]">
            <div className="flex items-center border-b p-6 md:border-b-0 md:border-e" style={ruleBorder}>
              <Logo />
            </div>
            <TitleBlock
              className="!border-0"
              rows={[
                { k: "Project", v: "VDC Academy" },
                { k: "Client", v: site.parent },
                { k: "Sheet", v: "A-999" },
                { k: "Scale", v: "1:1" },
              ]}
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-4 border-t px-6 py-5 text-[13px] text-dim" style={ruleBorder}>
            <p>© {new Date().getFullYear()} VDC Academy, a {site.parent} company</p>
            <ul className="flex flex-wrap gap-x-6 gap-y-2">
              {legal.map((l) => (
                <li key={l.href}>
                  <Link prefetch={false} href={l.href} className="ul-draw pb-0.5 hover:text-text">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
            <span className="flex flex-wrap items-center gap-6">
              <ReduceMotionToggle />
              <ComfortToggle />
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
