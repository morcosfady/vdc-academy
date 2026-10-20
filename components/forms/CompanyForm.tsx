"use client";

import { useState } from "react";
import { z } from "zod";
import { Field, SelectField, TextareaField } from "./Field";
import { Turnstile } from "./Turnstile";
import { FormDone, FormFailed, FormFallback, Honeypot, issuesToErrors, type FormState } from "./Fallback";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ds/Chips";
import { insertRow } from "@/lib/submit";
import { track } from "@/lib/analytics";
import { pages } from "@/content/copy-pages";

const c = pages.companies.form;
const topicNames = pages.companies.cover.items.map((i) => i.t);

const schema = z.object({
  company: z.string().trim().min(2, "Please enter your company name."),
  name: z.string().trim().min(2, "Please enter your name."),
  email: z.string().trim().email("Please enter a valid work email."),
  phone: z.string().trim().max(40, "That phone number looks too long.").optional().or(z.literal("")),
  size: z.string().trim().min(1, "Pick a team size."),
  message: z.string().trim().max(2000, "Please keep it under 2000 characters.").optional().or(z.literal("")),
});

// Team training request. Everything beyond name and email is joined into `topic`, the one free-text column on `leads`.
export function CompanyForm() {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [state, setState] = useState<FormState>("idle");
  const [topics, setTopics] = useState<string[]>([]);
  const [format, setFormat] = useState(c.formats[0]);
  const [token, setToken] = useState("");

  const toggle = (t: string) => setTopics((xs) => (xs.includes(t) ? xs.filter((x) => x !== t) : [...xs, t]));

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const d = new FormData(e.currentTarget);
    if (d.get("website")) return;
    const parsed = schema.safeParse({ company: d.get("company"), name: d.get("name"), email: d.get("email"), phone: d.get("phone"), size: d.get("size"), message: d.get("message") });
    if (!parsed.success) {
      setErrors(issuesToErrors(parsed.error.issues));
      return;
    }
    setErrors({});
    setState("sending");
    const x = parsed.data;
    const topic = [c.topic, `Company: ${x.company}`, x.phone ? `Phone: ${x.phone}` : "", `Team size: ${x.size}`, topics.length ? `Topics: ${topics.join(", ")}` : "", `Format: ${format}`, x.message ? `Message: ${x.message}` : ""]
      .filter(Boolean)
      .join(" · ");
    const r = await insertRow("leads", { name: x.name, email: x.email, topic, turnstile_token: token || null });
    if (r.ok) track("company_form_submitted", { size: x.size });
    setState(r.ok ? "done" : r.reason === "disabled" ? "fallback" : "failed");
  }

  if (state === "done") return <FormDone>{c.done}</FormDone>;
  if (state === "fallback") return <FormFallback />;

  return (
    <form onSubmit={submit} noValidate className="grid gap-x-4 gap-y-7 sm:grid-cols-2">
      <Field label={c.company} name="company" required autoComplete="organization" error={errors.company} className="sm:col-span-2" />
      <Field label={c.name} name="name" required autoComplete="name" error={errors.name} />
      <Field label={c.email} name="email" type="email" required autoComplete="email" error={errors.email} />
      <Field label={c.phone} name="phone" type="tel" autoComplete="tel" error={errors.phone} />
      <SelectField label={c.size} name="size" required options={c.sizes} error={errors.size} />
      <fieldset className="sm:col-span-2">
        <legend className="mono mb-3">{c.topics}</legend>
        <div className="flex flex-wrap gap-2">
          {topicNames.map((t) => (
            <Chip key={t} active={topics.includes(t)} onClick={() => toggle(t)}>
              {t}
            </Chip>
          ))}
        </div>
      </fieldset>
      <fieldset className="sm:col-span-2">
        <legend className="mono mb-3">{c.format}</legend>
        <div className="flex flex-wrap gap-2">
          {c.formats.map((f) => (
            <Chip key={f} active={format === f} onClick={() => setFormat(f)}>
              {f}
            </Chip>
          ))}
        </div>
      </fieldset>
      <TextareaField label={c.message} name="message" rows={4} error={errors.message} className="sm:col-span-2" />
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
