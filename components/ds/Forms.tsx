"use client";

import { useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const ruleBorder = { borderColor: "var(--rule)" } as const;
const control =
  "peer h-14 w-full rounded-[4px] border bg-transparent px-4 pt-5 text-base text-text outline-none transition-colors duration-200 placeholder-transparent hover:border-[color:var(--text-dim)] focus:border-accent disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-err";
const floating =
  "pointer-events-none absolute start-4 top-4 origin-left text-base text-dim transition-all duration-200 peer-focus:top-2 peer-focus:text-xs peer-[:not(:placeholder-shown)]:top-2 peer-[:not(:placeholder-shown)]:text-xs";

// Input with a floating label. The error is absolutely positioned so it never shifts the layout.
// `reveal` (optional, for password fields) adds a show/hide toggle inside the field.
export function Input({
  label,
  error,
  className,
  reveal = false,
  type,
  ...rest
}: { label: string; error?: string; reveal?: boolean } & Omit<React.InputHTMLAttributes<HTMLInputElement>, "placeholder">) {
  const id = useId();
  const [shown, setShown] = useState(false);
  const inputType = reveal ? (shown ? "text" : "password") : type;
  return (
    <div className={cn("relative", className)}>
      <input id={id} type={inputType} placeholder={label} aria-invalid={error ? true : undefined} aria-describedby={error ? `${id}-e` : undefined} className={cn(control, reveal && "pe-14")} style={ruleBorder} {...rest} />
      <label htmlFor={id} className={floating}>
        {label}
      </label>
      {reveal && (
        <button
          type="button"
          onClick={() => setShown((s) => !s)}
          aria-pressed={shown}
          aria-label={shown ? "Hide password" : "Show password"}
          className="absolute end-1 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-[4px] text-dim transition-colors hover:text-text"
        >
          {shown ? (
            <svg aria-hidden width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M2 10s3-5.5 8-5.5S18 10 18 10s-3 5.5-8 5.5S2 10 2 10Z" />
              <circle cx="10" cy="10" r="2.5" />
              <path d="M3 17 17 3" />
            </svg>
          ) : (
            <svg aria-hidden width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M2 10s3-5.5 8-5.5S18 10 18 10s-3 5.5-8 5.5S2 10 2 10Z" />
              <circle cx="10" cy="10" r="2.5" />
            </svg>
          )}
        </button>
      )}
      {error && (
        <p id={`${id}-e`} role="alert" className="absolute start-1 top-full mt-0.5 text-[13px] leading-5 text-err">
          {error}
        </p>
      )}
    </div>
  );
}

export function Select({
  label,
  options,
  error,
  className,
  ...rest
}: { label: string; options: readonly string[]; error?: string } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  const id = useId();
  return (
    <div className={cn("relative", className)}>
      <label htmlFor={id} className="pointer-events-none absolute start-4 top-2 text-xs text-dim">
        {label}
      </label>
      <select
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-e` : undefined}
        className="h-14 w-full appearance-none rounded-[4px] border bg-transparent px-4 pt-5 text-base text-text outline-none transition-colors duration-200 hover:border-[color:var(--text-dim)] focus:border-accent disabled:opacity-50 aria-[invalid=true]:border-err"
        style={ruleBorder}
        {...rest}
      >
        {options.map((o) => (
          <option key={o} value={o} className="bg-white text-[#0a1d23]">
            {o}
          </option>
        ))}
      </select>
      <svg aria-hidden width="12" height="8" viewBox="0 0 12 8" className="pointer-events-none absolute end-4 top-[26px] text-dim">
        <path d="M1 1l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.5" />
      </svg>
      {error && (
        <p id={`${id}-e`} role="alert" className="absolute start-1 top-full mt-0.5 text-[13px] leading-5 text-err">
          {error}
        </p>
      )}
    </div>
  );
}

// File upload: a dashed drop area that is also a real button
export function FileDrop({ label, hint, className }: { label: string; hint: string; className?: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => input.current?.click()}
        className="flex min-h-28 w-full flex-col items-center justify-center gap-1 rounded-[4px] border border-dashed px-6 py-6 text-center transition-colors duration-200 hover:border-accent"
        style={ruleBorder}
      >
        <span className="text-[15px] font-medium text-text">{name || label}</span>
        <span className="mono">{hint}</span>
      </button>
      <input ref={input} type="file" className="sr-only" tabIndex={-1} onChange={(e) => setName(e.target.files?.[0]?.name ?? "")} aria-label={label} />
    </div>
  );
}
