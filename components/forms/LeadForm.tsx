"use client";

import { useState } from "react";
import { z } from "zod";
import { Field } from "./Field";
import { Turnstile } from "./Turnstile";
import { insertRow } from "@/lib/submit";
import { content, shown } from "@/content/site";

const schema = z.object({
  name: z.string().trim().min(2, "Please enter your name."),
  email: z.string().trim().email("Please enter a valid email."),
});

// Quick interest form: "Notify me when applications open" and "Send me the price list".
export function LeadForm({ topic = "Notify me about the next cohort", button = "Notify me" }: { topic?: string; button?: string }) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [state, setState] = useState<"idle" | "sending" | "done" | "fallback" | "failed">("idle");
  const [token, setToken] = useState("");
  const email = shown(content.contact.email);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    if (data.get("website")) return; // honeypot
    const parsed = schema.safeParse({ name: data.get("name"), email: data.get("email") });
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])));
      return;
    }
    setErrors({});
    setState("sending");
    const r = await insertRow("leads", { ...parsed.data, topic, turnstile_token: token || null });
    setState(r.ok ? "done" : r.reason === "disabled" ? "fallback" : "failed");
  }

  if (state === "done") return <p role="status" className="text-lg">Thank you. We will be in touch soon. ✓</p>;
  if (state === "fallback")
    return (
      <p role="status" className="text-muted">
        Applications open soon. {email ? <>Email us at <a className="underline" href={`mailto:${email}`}>{email}</a>.</> : "Check back shortly."}
      </p>
    );

  return (
    <form onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-start">
      <Field label="Name" name="name" required autoComplete="name" error={errors.name} />
      <Field label="Email" name="email" type="email" required autoComplete="email" error={errors.email} />
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden className="absolute -start-[9999px] h-0 w-0 opacity-0" />
      <button type="submit" disabled={state === "sending"} className="h-14 rounded-[10px] bg-cta px-7 text-[15px] font-medium text-cta-text hover:bg-cta-hover disabled:opacity-60">
        {state === "sending" ? "Sending" : button}
      </button>
      <div className="sm:col-span-3"><Turnstile onToken={setToken} /></div>
      {state === "failed" && <p role="alert" className="text-sm text-[#ff8a80] sm:col-span-3">We could not send that. Please try again.</p>}
    </form>
  );
}
