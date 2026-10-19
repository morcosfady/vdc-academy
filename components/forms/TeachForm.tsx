"use client";

import { useState } from "react";
import { z } from "zod";
import { Field, TextareaField } from "./Field";
import { Turnstile } from "./Turnstile";
import { FormDone, FormFailed, FormFallback, Honeypot, issuesToErrors, type FormState } from "./Fallback";
import { Button } from "@/components/ui/Button";
import { insertRow } from "@/lib/submit";
import { pages } from "@/content/copy-pages";

const c = pages.instructors.teach;

const schema = z.object({
  name: z.string().trim().min(2, "Please enter your name."),
  email: z.string().trim().email("Please enter a valid email."),
  linkedin: z.string().trim().url("Please paste a full URL, starting with https://").optional().or(z.literal("")),
  message: z.string().trim().min(10, "Please write a few words about what you do."),
});

// "Want to teach with us?" on /instructors. The LinkedIn URL and the message travel in `topic` on `leads`.
export function TeachForm() {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [state, setState] = useState<FormState>("idle");
  const [token, setToken] = useState("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const d = new FormData(e.currentTarget);
    if (d.get("website")) return;
    const parsed = schema.safeParse({ name: d.get("name"), email: d.get("email"), linkedin: d.get("linkedin"), message: d.get("message") });
    if (!parsed.success) {
      setErrors(issuesToErrors(parsed.error.issues));
      return;
    }
    setErrors({});
    setState("sending");
    const x = parsed.data;
    const topic = [c.topic, x.linkedin ? `LinkedIn: ${x.linkedin}` : "", `Message: ${x.message}`].filter(Boolean).join(" · ");
    const r = await insertRow("leads", { name: x.name, email: x.email, topic, turnstile_token: token || null });
    setState(r.ok ? "done" : r.reason === "disabled" ? "fallback" : "failed");
  }

  if (state === "done") return <FormDone>{c.done}</FormDone>;
  if (state === "fallback") return <FormFallback />;

  return (
    <form onSubmit={submit} noValidate className="grid gap-x-4 gap-y-7 sm:grid-cols-2">
      <Field label={c.name} name="name" required autoComplete="name" error={errors.name} />
      <Field label={c.email} name="email" type="email" required autoComplete="email" error={errors.email} />
      <Field label={c.linkedin} name="linkedin" type="url" autoComplete="url" error={errors.linkedin} className="sm:col-span-2" />
      <TextareaField label={c.message} name="message" required rows={4} error={errors.message} className="sm:col-span-2" />
      <Honeypot />
      <div className="empty:hidden sm:col-span-2">
        <Turnstile onToken={setToken} />
      </div>
      <div className="sm:col-span-2">
        <Button type="submit" disabled={state === "sending"}>
          {state === "sending" ? "Sending" : c.button}
        </Button>
      </div>
      {state === "failed" && (
        <div className="sm:col-span-2">
          <FormFailed />
        </div>
      )}
    </form>
  );
}
