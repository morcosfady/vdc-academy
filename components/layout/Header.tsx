"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { site } from "@/config/site";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";
import { ThemeToggle } from "./ThemeToggle";
import { MenuOverlay } from "./MenuOverlay";

// Transparent over the hero (72px), ink glass with a hairline after scrolling, hides on scroll down.
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
          "fixed inset-x-0 top-0 z-50 h-[72px] transition-[transform,background-color,border-color] duration-500",
          scrolled ? "glass-blur border-b border-border bg-bg/80" : "border-b border-transparent",
          hidden && !menu ? "-translate-y-full" : "translate-y-0",
        )}
      >
        <div className="mx-auto flex h-full max-w-[1280px] items-center justify-between gap-6 px-5 md:px-8">
          <Link prefetch={false} href="/" aria-label="VDC Academy by Bay BIM Designs, home">
            <Logo />
          </Link>
          <nav aria-label="Main" className="hidden items-center gap-9 lg:flex">
            {site.nav.map((item) => (
              <Link prefetch={false} key={item.href} href={item.href} className="text-[15px] font-medium text-text/80 transition-colors hover:text-text">
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
              className="hidden h-11 items-center gap-3 rounded-[10px] px-3 text-[15px] font-medium text-text/80 hover:text-text sm:inline-flex"
            >
              Menu <span aria-hidden className="inline-block w-5 border-t-[1.5px] border-current shadow-[0_5px_0_currentColor]" />
            </button>
            <Button href="/apply" variant="glow" className="!h-11 !px-5">
              Apply
            </Button>
          </div>
        </div>
      </header>
      <MenuOverlay open={menu} onClose={() => setMenu(false)} />
    </>
  );
}
