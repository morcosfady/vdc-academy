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
  message: z.string().trim().min(10, "Please write a few words so we can help."),
});

export function ContactForm() {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [state, setState] = useState<"idle" | "sending" | "done" | "fallback" | "failed">("idle");
  const [token, setToken] = useState("");
  const email = shown(content.contact.email);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const d = new FormData(e.currentTarget);
    if (d.get("website")) return;
    const parsed = schema.safeParse({ name: d.get("name"), email: d.get("email"), message: d.get("message") });
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])));
      return;
    }
    setErrors({});
    setState("sending");
    const r = await insertRow("contact_messages", { ...parsed.data, turnstile_token: token || null });
    setState(r.ok ? "done" : r.reason === "disabled" ? "fallback" : "failed");
  }

  if (state === "done") return <p role="status" className="text-lg">Thank you. We will reply soon. ✓</p>;
  if (state === "fallback")
    return (
      <p role="status" className="text-muted">
        The form opens soon. {email ? <>Email us at <a className="underline" href={`mailto:${email}`}>{email}</a>.</> : "Please check back shortly."}
      </p>
    );

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <Field label="Name" name="name" required autoComplete="name" error={errors.name} />
      <Field label="Email" name="email" type="email" required autoComplete="email" error={errors.email} />
      <div className="relative">
        <textarea
          id="f-message"
          name="message"
          required
          rows={5}
          placeholder="Message"
          aria-invalid={errors.message ? true : undefined}
          aria-describedby={errors.message ? "f-message-err" : undefined}
          className="peer w-full border border-border bg-transparent px-4 pb-3 pt-7 text-base outline-none placeholder-transparent focus:border-accent aria-[invalid=true]:border-[#ff6b60]"
        />
        <label htmlFor="f-message" className="pointer-events-none absolute start-4 top-2 text-[10px] uppercase tracking-[0.14em] text-muted">Message *</label>
        {errors.message && <p id="f-message-err" role="alert" className="mt-1.5 text-sm text-[#ff8a80]">{errors.message}</p>}
      </div>
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden className="absolute -start-[9999px] h-0 w-0 opacity-0" />
      <Turnstile onToken={setToken} />
      <button type="submit" disabled={state === "sending"} className="bg-cta px-8 py-4 text-[13px] font-medium uppercase tracking-[0.14em] text-cta-text disabled:opacity-60">
        {state === "sending" ? "Sending" : "Send message"}
      </button>
      {state === "failed" && <p role="alert" className="text-sm text-[#ff8a80]">We could not send that. Please try again.</p>}
    </form>
  );
}
