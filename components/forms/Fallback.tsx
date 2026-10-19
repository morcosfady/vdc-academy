"use client";

import { content, shown } from "@/content/site";

// The honest states every quick form shares (same wording as LeadForm and ContactForm): a thank-you,
// and what to do while submissions are not connected yet.
export type FormState = "idle" | "sending" | "done" | "fallback" | "failed";

export function FormDone({ children }: { children: React.ReactNode }) {
  return (
    <p role="status" className="text-lg text-text">
      {children}
    </p>
  );
}

export function FormFallback({ lead = "The form opens soon." }: { lead?: string }) {
  const email = shown(content.contact.email);
  return (
    <p role="status" className="text-muted">
      {lead}{" "}
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
}

export function FormFailed() {
  return (
    <p role="alert" className="text-[13px] text-err">
      We could not send that. Please try again.
    </p>
  );
}

export const Honeypot = () => <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden className="absolute -start-[9999px] h-0 w-0 opacity-0" />;

export const issuesToErrors = (issues: { path: PropertyKey[]; message: string }[]) => Object.fromEntries(issues.map((i) => [String(i.path[0]), i.message]));
