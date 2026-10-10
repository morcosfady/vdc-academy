"use client";

import { useEffect, useRef } from "react";
import { turnstileSiteKey } from "@/lib/submit";

declare global {
  interface Window {
    turnstile?: { render: (el: HTMLElement, o: { sitekey: string; callback: (t: string) => void }) => void };
  }
}

// Cloudflare Turnstile. Renders nothing when no site key is configured. The token is verified server side
// by the Supabase Edge Function that sends the emails.
export function Turnstile({ onToken }: { onToken: (t: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!turnstileSiteKey || !ref.current) return;
    const el = ref.current;
    const render = () => window.turnstile?.render(el, { sitekey: turnstileSiteKey as string, callback: onToken });
    if (window.turnstile) return render();
    const s = document.createElement("script");
    s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    s.async = true;
    s.onload = render;
    document.head.appendChild(s);
  }, [onToken]);
  return turnstileSiteKey ? <div ref={ref} /> : null;
}
