// Without JavaScript, a client screen that waits for the session (apply, log in, account, admin) would show only its
// paper skeleton. This line says why. Forms everywhere get the same message from the <noscript> style in app/layout.tsx.
export const NOSCRIPT_TEXT = "This part of the site needs JavaScript. Turn it on in your browser, then reload the page.";

export function NoScriptNote({ className = "" }: { className?: string }) {
  return (
    <noscript>
      <p className={`nojs-note t-small mt-6 max-w-[480px] rounded-[8px] border px-5 py-4 text-muted ${className}`} style={{ borderColor: "var(--rule)" }}>
        {NOSCRIPT_TEXT}
      </p>
    </noscript>
  );
}
