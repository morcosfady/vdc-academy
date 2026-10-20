"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { programs } from "@/content/programs";
import { analyticsAllowed, analyticsConfig, flushAnalytics, track } from "@/lib/analytics";

const slugs = new Set(programs.map((p) => p.slug));

// Loads the provider script once, only when this build is configured and the visitor has not opted out (see
// lib/analytics.ts). The provider counts page views itself, including client-side navigations; query strings and
// hashes are left out (Umami: data-exclude-search/hash; Plausible records the path only). Renders nothing.
export function Analytics() {
  const pathname = usePathname();

  useEffect(() => {
    const cfg = analyticsConfig;
    if (!cfg || !analyticsAllowed() || document.getElementById("vdc-analytics")) return;
    const s = document.createElement("script");
    s.id = "vdc-analytics";
    s.src = cfg.script;
    s.defer = true;
    if (cfg.provider === "umami") {
      s.dataset.websiteId = cfg.id;
      s.dataset.hostUrl = new URL(cfg.script).origin; // send to the script's own origin, the one the CSP allows
      s.dataset.doNotTrack = "true";
      s.dataset.excludeSearch = "true";
      s.dataset.excludeHash = "true";
    } else {
      s.dataset.domain = cfg.id;
    }
    s.onload = flushAnalytics;
    document.head.appendChild(s);
  }, []);

  useEffect(() => {
    const slug = /^\/programs\/([^/]+)\/?$/.exec(pathname ?? "")?.[1];
    if (slug && slugs.has(slug)) track("program_viewed", { slug });
  }, [pathname]);

  return null;
}
