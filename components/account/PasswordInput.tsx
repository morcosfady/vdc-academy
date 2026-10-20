"use client";

import { Input } from "@/components/ds/Forms";
import { account } from "@/content/copy-account";
import { passwordStrength } from "./format";
import { cn } from "@/lib/utils";

// Password field with the show/hide toggle (ds Input `reveal`) and an optional strength hint under it.
// The hint is hidden while an error is shown so the two never overlap.
export function PasswordInput({
  label,
  value,
  onChange,
  error,
  strength = false,
  className,
  ...rest
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  strength?: boolean;
  className?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type" | "placeholder" | "className">) {
  const level = passwordStrength(value);
  const showHint = strength && value.length > 0 && !error;
  return (
    <div className={cn("relative", className)}>
      <Input label={label} reveal value={value} onChange={(e) => onChange(e.target.value)} error={error} autoComplete={rest.autoComplete ?? "new-password"} {...rest} />
      {strength && (
        <div className="mt-2 flex items-center gap-3" aria-hidden={!showHint}>
          <div className="flex flex-1 gap-1">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="h-0.5 flex-1 transition-colors duration-300"
                style={{ background: showHint && i <= (level === "weak" ? 0 : level === "ok" ? 1 : 2) ? (level === "weak" ? "var(--err)" : "var(--accent)") : "var(--rule)" }}
              />
            ))}
          </div>
          <p role="status" aria-live="polite" className="min-h-5 text-[13px] text-dim">
            {showHint ? account.signup.strength[level] : ""}
          </p>
        </div>
      )}
    </div>
  );
}
