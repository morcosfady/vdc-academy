"use client";

import { useId } from "react";
import type { Opt } from "@/lib/signupSchema";
import { cn } from "@/lib/utils";

// Small wrappers for the registration form. They reuse the design-system field classes (components/ds/Forms.tsx)
// so nothing looks new; they add what the floating-label Input cannot do: stored keys behind visible labels, a
// date field, a checkbox group and the role cards. Every field carries `name` so the error summary can focus it.

const box =
  "h-14 w-full rounded-[4px] border border-rule bg-transparent px-4 pt-5 text-base text-text outline-none transition-colors duration-200 hover:border-[color:var(--text-dim)] focus:border-accent aria-[invalid=true]:border-err";

function ErrorLine({ id, error }: { id: string; error?: string }) {
  if (!error) return null;
  return (
    <p id={id} role="alert" className="absolute start-1 top-full mt-0.5 text-[13px] leading-5 text-err">
      {error}
    </p>
  );
}

// A select whose value is a stored key; the options show labels. The first option is the empty "Select one".
export function OptSelect({ label, name, options, value, onChange, onBlur, error, placeholder }: { label: string; name: string; options: Opt[]; value: string; onChange: (v: string) => void; onBlur?: () => void; error?: string; placeholder: string }) {
  const id = useId();
  return (
    <div className="relative">
      <label htmlFor={id} className="pointer-events-none absolute start-4 top-2 text-xs text-dim">
        {label}
      </label>
      <select id={id} name={name} required value={value} onChange={(e) => onChange(e.target.value)} onBlur={onBlur} aria-invalid={error ? true : undefined} aria-describedby={error ? `${id}-e` : undefined} className={cn(box, "appearance-none pe-10")}>
        <option value="" className="bg-white text-[#18282b]">
          {placeholder}
        </option>
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-white text-[#18282b]">
            {o.label}
          </option>
        ))}
      </select>
      <svg aria-hidden width="12" height="8" viewBox="0 0 12 8" className="pointer-events-none absolute end-4 top-[26px] text-dim">
        <path d="M1 1l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.5" />
      </svg>
      <ErrorLine id={`${id}-e`} error={error} />
    </div>
  );
}

// Date input with the same static label as the select (a floating label would sit on top of the native mm/dd/yyyy).
export function DateField({ label, name, value, onChange, onBlur, error, max }: { label: string; name: string; value: string; onChange: (v: string) => void; onBlur?: () => void; error?: string; max?: string }) {
  const id = useId();
  return (
    <div className="relative">
      <label htmlFor={id} className="pointer-events-none absolute start-4 top-2 text-xs text-dim">
        {label}
      </label>
      <input id={id} name={name} type="date" required value={value} max={max} min="1920-01-01" onChange={(e) => onChange(e.target.value)} onBlur={onBlur} aria-invalid={error ? true : undefined} aria-describedby={error ? `${id}-e` : undefined} className={box} />
      <ErrorLine id={`${id}-e`} error={error} />
    </div>
  );
}

// A required checkbox group (at least one). One fieldset, one legend, one error.
export function CheckGroup({ legend, name, options, value, onChange, error }: { legend: string; name: string; options: Opt[]; value: string[]; onChange: (v: string[]) => void; error?: string }) {
  const id = useId();
  return (
    <fieldset aria-describedby={error ? `${id}-e` : undefined} aria-invalid={error ? true : undefined}>
      <legend className="mono mb-3">{legend} *</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((o) => {
          const on = value.includes(o.value);
          return (
            <label key={o.value} className={cn("flex min-h-12 cursor-pointer items-center gap-3 rounded-[4px] border px-4 text-[15px] transition-colors duration-200", on ? "border-accent bg-mist/40" : "border-rule hover:border-[color:var(--text-dim)]")}>
              <input type="checkbox" name={name} value={o.value} checked={on} onChange={(e) => onChange(e.target.checked ? Array.from(new Set([...value, o.value])) : value.filter((x) => x !== o.value))} className="size-4 shrink-0 accent-[var(--accent)]" />
              <span className="text-text">{o.label}</span>
            </label>
          );
        })}
      </div>
      {error && (
        <p id={`${id}-e`} role="alert" className="mt-2 text-[13px] text-err">
          {error}
        </p>
      )}
    </fieldset>
  );
}

// The two big role cards: a real radio group (arrow keys move, Space picks), drawn as paper cards.
export function RoleCards({ legend, value, onChange, cards, error }: { legend: string; value: string; onChange: (v: "student" | "recruiter") => void; cards: { value: "student" | "recruiter"; title: string; text: string; icon: React.ReactNode }[]; error?: string }) {
  const id = useId();
  return (
    <fieldset aria-describedby={error ? `${id}-e` : undefined}>
      <legend className="sr-only">{legend}</legend>
      <div className="grid gap-4" role="radiogroup" aria-label={legend} aria-required="true" aria-invalid={error ? true : undefined}>
        {cards.map((c) => {
          const on = value === c.value;
          return (
            <label key={c.value} className={cn("card flex min-h-[104px] cursor-pointer items-start gap-5 p-6 transition-colors duration-200 focus-within:border-accent", on ? "!border-accent bg-mist/40" : "hover:border-[color:var(--text-dim)]")} data-testid={`role-${c.value}`}>
              <input type="radio" name="account_type" value={c.value} checked={on} onChange={() => onChange(c.value)} className="mt-1.5 size-4 shrink-0 accent-[var(--accent)]" />
              <span aria-hidden className="grid size-11 shrink-0 place-items-center rounded-full border border-rule text-slate">
                {c.icon}
              </span>
              <span>
                <span className="block text-[1.25rem] font-semibold text-text">{c.title}</span>
                <span className="t-small mt-1 block text-muted">{c.text}</span>
              </span>
            </label>
          );
        })}
      </div>
      {error && (
        <p id={`${id}-e`} role="alert" className="mt-2 text-[13px] text-err">
          {error}
        </p>
      )}
    </fieldset>
  );
}

export const CapIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
    <path d="M2 9l10-5 10 5-10 5L2 9z" />
    <path d="M6 11v5c0 1.5 2.7 3 6 3s6-1.5 6-3v-5" />
  </svg>
);
export const BriefcaseIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
    <rect x="3" y="7" width="18" height="13" rx="2" />
    <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M3 13h18" />
  </svg>
);
