import { cn } from "@/lib/utils";

const base =
  "peer h-14 w-full border border-border bg-transparent px-4 pt-5 text-base outline-none transition-colors placeholder-transparent focus:border-accent aria-[invalid=true]:border-[#ff6b60]";

// Floating-label input (48px+ tall). Errors are linked with aria-describedby and announced.
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
        className={base}
        {...rest}
      />
      <label
        htmlFor={id}
        className="pointer-events-none absolute start-4 top-2 text-[14px] uppercase tracking-[0.14em] text-muted transition-all peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-focus:top-2 peer-focus:text-[14px] peer-focus:uppercase peer-focus:tracking-[0.14em]"
      >
        {label}
        {required && " *"}
      </label>
      {error && (
        <p id={`${id}-err`} role="alert" className="absolute start-1 top-full mt-0.5 text-[13px] leading-5 text-[#ff8a80]">
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
  ...rest
}: {
  label: string;
  name: string;
  options: readonly string[];
  error?: string;
  required?: boolean;
} & Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "name">) {
  const id = `f-${name}`;
  return (
    <div className="relative">
      <label htmlFor={id} className="pointer-events-none absolute start-4 top-2 text-[14px] uppercase tracking-[0.14em] text-muted">
        {label}
        {required && " *"}
      </label>
      <select
        id={id}
        name={name}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-err` : undefined}
        className="h-14 w-full appearance-none border border-border bg-transparent px-4 pt-5 text-base outline-none focus:border-accent aria-[invalid=true]:border-[#ff6b60]"
        {...rest}
      >
        <option value="" className="bg-[#0a1d23] text-white">Select</option>
        {options.map((o) => (
          <option key={o} value={o} className="bg-[#0a1d23] text-white">
            {o}
          </option>
        ))}
      </select>
      <span aria-hidden className="pointer-events-none absolute end-4 top-5 text-muted">▾</span>
      {error && (
        <p id={`${id}-err`} role="alert" className="absolute start-1 top-full mt-0.5 text-[13px] leading-5 text-[#ff8a80]">
          {error}
        </p>
      )}
    </div>
  );
}
