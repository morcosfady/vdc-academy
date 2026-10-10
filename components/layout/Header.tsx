"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { site } from "@/config/site";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { ThemeToggle } from "./ThemeToggle";

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [menu, setMenu] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menu ? "hidden" : "";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenu(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menu]);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 border-b border-transparent backdrop-blur-md transition-all",
        scrolled ? "border-border bg-bg/80 py-2" : "bg-bg/40 py-4",
      )}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 md:px-6">
        <Link href="/" className="leading-tight" aria-label="VDC Academy by Bay BIM Designs, home">
          <span className="block font-heading text-lg font-bold">VDC Academy</span>
          <span className="block text-[11px] uppercase tracking-widest text-text-muted">
            by {site.parent}
          </span>
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-6 lg:flex">
          {site.nav.map((item) => (
            <Link key={item.href} href={item.href} className="text-sm text-text-muted hover:text-text">
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button href="/apply" variant="glow" className="hidden sm:inline-flex">
            Apply Now
          </Button>
          <button
            type="button"
            className="grid size-10 place-items-center rounded-btn border border-border lg:hidden"
            aria-label={menu ? "Close menu" : "Open menu"}
            aria-expanded={menu}
            onClick={() => setMenu((v) => !v)}
          >
            {menu ? <X size={20} aria-hidden /> : <Menu size={20} aria-hidden />}
          </button>
        </div>
      </div>

      {menu && (
        <nav
          aria-label="Mobile"
          className="fixed inset-x-0 top-[72px] bottom-0 z-40 overflow-y-auto bg-bg px-6 py-8 lg:hidden"
        >
          <ul className="space-y-1">
            {site.nav.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setMenu(false)}
                  className="block border-b border-border py-4 font-heading text-xl"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}
