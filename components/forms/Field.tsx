import { cn } from "@/lib/utils";

// Form fields for the apply, lead and contact forms. Same look as components/ds/Forms.tsx (hairline border, 4px radius,
// floating label), but with stable ids (f-<name>) so react-hook-form, labels and tests can address them.
// The error is absolutely positioned so it never shifts the layout.

const control =
  "peer h-14 w-full rounded-[4px] border border-rule bg-transparent px-4 pt-5 text-base text-text outline-none transition-colors duration-200 placeholder-transparent hover:border-[color:var(--text-dim)] focus:border-accent disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-err";
const floating =
  "pointer-events-none absolute start-4 top-4 origin-left text-base text-dim transition-all duration-200 peer-focus:top-2 peer-focus:text-xs peer-[:not(:placeholder-shown)]:top-2 peer-[:not(:placeholder-shown)]:text-xs";
const fixed = "pointer-events-none absolute start-4 top-2 text-xs text-dim";
const errorText = "absolute start-1 top-full mt-0.5 text-[13px] leading-5 text-err";

export function Field({
  label,
  name,
  type = "text",
  error,
  required,
  className,
  ...rest
}: {
  label: string;
  name: string;
  type?: string;
  error?: string;
  required?: boolean;
  className?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "name" | "type">) {
  const id = `f-${name}`;
  return (
    <div className={cn("relative", className)}>
      <input
        id={id}
        name={name}
        type={type}
        required={required}
        placeholder={label}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-err` : undefined}
        className={control}
       
        {...rest}
      />
      <label htmlFor={id} className={floating}>
        {label}
        {required && " *"}
      </label>
      {error && (
        <p id={`${id}-err`} role="alert" className={errorText}>
          {error}
        </p>
      )}
    </div>
  );
}

export function SelectField({
  label,
  name,
  options,
  error,
  required,
  className,
  ...rest
}: {
  label: string;
  name: string;
  options: readonly string[];
  error?: string;
  required?: boolean;
  className?: string;
} & Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "name">) {
  const id = `f-${name}`;
  return (
    <div className={cn("relative", className)}>
      <label htmlFor={id} className={fixed}>
        {label}
        {required && " *"}
      </label>
      <select
        id={id}
        name={name}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-err` : undefined}
        className={cn(control, "appearance-none pe-10")}
       
        {...rest}
      >
        <option value="" className="bg-white text-[#0a1d23]">
          Select
        </option>
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
        <p id={`${id}-err`} role="alert" className={errorText}>
          {error}
        </p>
      )}
    </div>
  );
}

export function TextareaField({
  label,
  name,
  error,
  required,
  className,
  rows = 5,
  ...rest
}: {
  label: string;
  name: string;
  error?: string;
  required?: boolean;
  className?: string;
} & Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "name">) {
  const id = `f-${name}`;
  return (
    <div className={cn("relative", className)}>
      <textarea
        id={id}
        name={name}
        required={required}
        rows={rows}
        placeholder={label}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-err` : undefined}
        className={cn(control, "h-auto resize-y pb-3 pt-7")}
       
        {...rest}
      />
      <label htmlFor={id} className={fixed}>
        {label}
        {required && " *"}
      </label>
      {error && (
        <p id={`${id}-err`} role="alert" className={errorText}>
          {error}
        </p>
      )}
    </div>
  );
}

// Checkbox with a 44px tap target and the accent color.
export function Check({ label, className, ...rest }: { label: React.ReactNode; className?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className={cn("flex min-h-11 cursor-pointer items-start gap-3 py-2 text-[15px] text-text", className)}>
      <input type="checkbox" className="mt-1 size-4 shrink-0 accent-[var(--accent)]" {...rest} />
      <span>{label}</span>
    </label>
  );
}
