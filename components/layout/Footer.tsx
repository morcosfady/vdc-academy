import Link from "next/link";
import { site } from "@/config/site";

const legal = [
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/accessibility", label: "Accessibility" },
];

export function Footer() {
  return (
    <footer className="border-t border-border bg-bg-elevated pb-24 pt-14 md:pb-14">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 md:grid-cols-4 md:px-6">
        <div className="md:col-span-2">
          <p className="font-heading text-xl font-bold">VDC Academy</p>
          <p className="mt-3 max-w-md text-text-muted">
            Hands-on BIM and VDC training from the team at{" "}
            <a className="underline hover:text-text" href={site.parentUrl}>
              {site.parent}
            </a>
            , {site.city}.
          </p>
        </div>
        <nav aria-label="Footer">
          <p className="mb-3 font-mono text-xs uppercase tracking-widest text-text-muted">Explore</p>
          <ul className="space-y-2">
            {site.nav.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="text-text-muted hover:text-text">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div>
          <p className="mb-3 font-mono text-xs uppercase tracking-widest text-text-muted">Company</p>
          <ul className="space-y-2">
            <li>
              <a className="text-text-muted hover:text-text" href={site.parentUrl}>
                {site.parent}
              </a>
            </li>
            {site.linkedin && (
              <li>
                <a className="text-text-muted hover:text-text" href={site.linkedin}>
                  LinkedIn
                </a>
              </li>
            )}
            {legal.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="text-text-muted hover:text-text">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <p className="mx-auto mt-10 max-w-7xl px-4 text-sm text-text-muted md:px-6">
        © {new Date().getFullYear()} VDC Academy, a {site.parent} company
      </p>
    </footer>
  );
}
