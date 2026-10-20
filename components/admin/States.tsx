import { adminCopy } from "@/content/copy-admin";
import { cn } from "@/lib/utils";

const rule = { borderColor: "var(--rule)" } as const;

// An empty drawing sheet: border, title block, three faint hairlines. Drawn in currentColor.
function EmptySheet() {
  return (
    <svg aria-hidden width="120" height="84" viewBox="0 0 120 84" className="text-dim">
      <rect x="0.5" y="0.5" width="119" height="83" fill="none" stroke="currentColor" strokeWidth="1" />
      <rect x="6.5" y="6.5" width="107" height="71" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.5" />
      <path d="M78 77.5v-14h35" fill="none" stroke="currentColor" strokeWidth="1" />
      <path d="M82 68h20M82 72h12" stroke="currentColor" strokeWidth="1" opacity="0.6" />
      <path d="M20 26h52M20 36h40M20 46h46" stroke="currentColor" strokeWidth="1" opacity="0.35" strokeDasharray="2 3" />
    </svg>
  );
}

// A sheet with a clash marker: the calm error.
function ErrorSheet() {
  return (
    <svg aria-hidden width="120" height="84" viewBox="0 0 120 84" className="text-dim">
      <rect x="0.5" y="0.5" width="119" height="83" fill="none" stroke="currentColor" strokeWidth="1" />
      <path d="M20 30h50M20 42h36M20 54h44" stroke="currentColor" strokeWidth="1" opacity="0.35" strokeDasharray="2 3" />
      <g style={{ color: "var(--clash)" }}>
        <circle cx="88" cy="38" r="11" fill="none" stroke="currentColor" strokeWidth="1.25" />
        <path d="M83 33l10 10M93 33l-10 10" stroke="currentColor" strokeWidth="1.25" />
      </g>
    </svg>
  );
}

export function EmptyState({ title, text, action, className }: { title: string; text: string; action?: React.ReactNode; className?: string }) {
  return (
    <div role="status" className={cn("flex flex-col items-center border-y px-6 py-14 text-center", className)} style={rule}>
      <EmptySheet />
      <h3 className="mt-6 !text-[1.25rem]">{title}</h3>
      <p className="t-small mx-auto mt-2 max-w-sm text-dim">{text}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function ErrorState({ text, onRetry, className }: { text?: string; onRetry: () => void; className?: string }) {
  const c = adminCopy.common;
  return (
    <div role="alert" className={cn("flex flex-col items-center border-y px-6 py-14 text-center", className)} style={rule}>
      <ErrorSheet />
      <h3 className="mt-6 !text-[1.25rem]">{c.errorTitle}</h3>
      <p className="t-small mx-auto mt-2 max-w-sm text-dim">{c.errorText}</p>
      {text && <p className="mono mt-3 max-w-md break-words">{text}</p>}
      <button type="button" onClick={onRetry} className="ul-draw mt-6 pb-0.5 text-[15px] font-medium text-text hover:text-accent-text">
        {c.retry}
      </button>
    </div>
  );
}
