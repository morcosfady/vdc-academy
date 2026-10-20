"use client";

import { useState } from "react";
import { z } from "@/lib/zod";
import { Field, TextareaField } from "./Field";
import { Turnstile } from "./Turnstile";
import { Button } from "@/components/ui/Button";
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

  if (state === "done")
    return (
      <p role="status" className="text-lg text-text">
        Thank you. We will reply soon.
      </p>
    );
  if (state === "fallback")
    return (
      <p role="status" className="text-muted">
        The form opens soon.{" "}
        {email ? (
          <>
            Email us at{" "}
            <a className="underline underline-offset-4" href={`mailto:${email}`}>
              {email}
            </a>
            .
          </>
        ) : (
          "Please check back shortly."
        )}
      </p>
    );

  return (
    <form onSubmit={submit} noValidate className="space-y-7">
      <Field label="Name" name="name" required autoComplete="name" error={errors.name} />
      <Field label="Email" name="email" type="email" required autoComplete="email" error={errors.email} />
      <TextareaField label="Message" name="message" required error={errors.message} />
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden className="absolute -start-[9999px] h-0 w-0 opacity-0" />
      <Turnstile onToken={setToken} />
      <Button type="submit" disabled={state === "sending"}>
        {state === "sending" ? "Sending" : "Send message"}
      </Button>
      {state === "failed" && (
        <p role="alert" className="text-[13px] text-err">
          We could not send that. Please try again.
        </p>
      )}
    </form>
  );
}
