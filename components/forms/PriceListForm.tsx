"use client";

import { useState } from "react";
import { z } from "@/lib/zod";
import { Field, SelectField } from "./Field";
import { Turnstile } from "./Turnstile";
import { FormDone, FormFailed, FormFallback, Honeypot, issuesToErrors, type FormState } from "./Fallback";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ds/Chips";
import { insertRow } from "@/lib/submit";
import { track } from "@/lib/analytics";
import { programs } from "@/content/programs";
import { pages } from "@/content/copy-pages";

const c = pages.pricing.unknown.request;

const schema = z.object({
  name: z.string().trim().min(2, "Please enter your name."),
  email: z.string().trim().email("Please enter a valid email."),
  program: z.string().trim().min(1, "Pick a program, or choose not sure yet."),
});

// The main action on /pricing while prices are unknown. The row goes to `leads`; the program and status travel in `topic`
// because that table has no other text column.
export function PriceListForm() {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [state, setState] = useState<FormState>("idle");
  const [status, setStatus] = useState(c.statuses[0]);
  const [token, setToken] = useState("");
  const options = [c.anyProgram, ...programs.map((p) => p.title)];

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const d = new FormData(e.currentTarget);
    if (d.get("website")) return;
    const parsed = schema.safeParse({ name: d.get("name"), email: d.get("email"), program: d.get("program") });
    if (!parsed.success) {
      setErrors(issuesToErrors(parsed.error.issues));
      return;
    }
    setErrors({});
    setState("sending");
    const r = await insertRow("leads", {
      name: parsed.data.name,
      email: parsed.data.email,
      topic: `${c.topic} · ${parsed.data.program} · ${status}`,
      turnstile_token: token || null,
    });
    if (r.ok) track("price_list_requested");
    setState(r.ok ? "done" : r.reason === "disabled" ? "fallback" : "failed");
  }

  if (state === "done") return <FormDone>{c.done}</FormDone>;
  if (state === "fallback") return <FormFallback />;

  return (
    <form onSubmit={submit} noValidate className="grid gap-x-4 gap-y-7 sm:grid-cols-2">
      <Field label="Name" name="name" required autoComplete="name" error={errors.name} />
      <Field label="Email" name="email" type="email" required autoComplete="email" error={errors.email} />
      <SelectField label={c.program} name="program" options={options} defaultValue={c.anyProgram} error={errors.program} className="sm:col-span-2" />
      <fieldset className="sm:col-span-2">
        <legend className="mono mb-3">{c.who}</legend>
        <div className="flex flex-wrap gap-2">
          {c.statuses.map((s) => (
            <Chip key={s} active={status === s} onClick={() => setStatus(s)}>
              {s}
            </Chip>
          ))}
        </div>
      </fieldset>
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
