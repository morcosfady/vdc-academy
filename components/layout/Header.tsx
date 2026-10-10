"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { site } from "@/config/site";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";
import { ThemeToggle } from "./ThemeToggle";
import { MenuOverlay } from "./MenuOverlay";

// Transparent over the hero, glass after scrolling, hides on scroll down and returns on scroll up.
export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [menu, setMenu] = useState(false);

  useEffect(() => {
    let last = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 40);
      if (Math.abs(y - last) > 6) {
        setHidden(y > last && y > 240);
        last = y;
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-50 transition-[transform,background-color,backdrop-filter] duration-500",
          scrolled ? "glass border-x-0 border-t-0 py-3" : "py-6",
          hidden && !menu ? "-translate-y-full" : "translate-y-0",
        )}
      >
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-6 px-5 md:px-10">
          <Link href="/" aria-label="VDC Academy by Bay BIM Designs, home">
            <Logo />
          </Link>
          <nav aria-label="Main" className="hidden items-center gap-9 lg:flex">
            {site.nav.map((item) => (
              <Link key={item.href} href={item.href} className="label !text-[11px] transition-colors hover:!text-text">
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <button
              type="button"
              onClick={() => setMenu(true)}
              aria-haspopup="dialog"
              aria-expanded={menu}
              className="label hidden !text-[11px] hover:!text-text sm:inline-flex sm:items-center sm:gap-3 sm:px-2 sm:py-3"
            >
              Menu <span aria-hidden className="inline-block w-6 border-t border-current shadow-[0_5px_0_currentColor]" />
            </button>
            <Button href="/apply" variant="glow" className="!px-5 !py-3">
              Apply
            </Button>
          </div>
        </div>
      </header>
      <MenuOverlay open={menu} onClose={() => setMenu(false)} />
    </>
  );
}
