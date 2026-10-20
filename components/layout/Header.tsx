"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { site } from "@/config/site";
import { cn } from "@/lib/utils";
import { AccountMenu } from "./AccountMenu";
import { Logo } from "@/components/ui/Logo";
import { MenuOverlay } from "./MenuOverlay";

// Paper header with a hairline. The only glass on the site: it blurs once you scroll.
export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [menu, setMenu] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <header
        className={cn(
          "theme-light fixed inset-x-0 top-0 z-50 h-[72px] border-b transition-[background-color,border-color,backdrop-filter] duration-300",
          scrolled ? "glass-blur !bg-paper/85" : "border-transparent",
        )}
        style={scrolled ? { borderColor: "var(--rule)" } : undefined}
      >
        <div className="wrap flex h-full items-center justify-between gap-6">
          <Link prefetch={false} href="/" aria-label="VDC Academy by Bay BIM Designs" className="text-ink">
            <Logo />
          </Link>
          <nav aria-label="Main" className="hidden items-center gap-9 lg:flex">
            {site.nav.map((item) => (
              <Link prefetch={false} key={item.href} href={item.href} className="ul-draw pb-1 text-[15px] font-medium text-text/80 transition-colors hover:text-text">
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMenu(true)}
              aria-haspopup="dialog"
              aria-expanded={menu}
              aria-label="Menu"
              className="inline-flex h-11 min-w-11 items-center justify-center gap-3 rounded-[8px] px-2 text-[15px] font-medium text-text md:px-3 lg:hidden"
            >
              <span className="hidden md:inline">Menu</span>
              <span aria-hidden className="inline-block w-5 border-t-[1.5px] border-current shadow-[0_5px_0_currentColor]" />
            </button>
            <AccountMenu />
          </div>
        </div>
      </header>
      <MenuOverlay open={menu} onClose={() => setMenu(false)} />
    </>
  );
}
