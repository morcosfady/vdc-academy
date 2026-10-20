import Link from "next/link";
import { profileCompleteness, type Profile } from "@/lib/db";
import { account } from "@/content/copy-account";

const c = account.dashboard.completeness;
const labels: Record<string, string> = { ...account.profile.fields, avatar_path: account.profile.avatar.label };

// Profile completeness as a dimension: the percent, one thin rule that fills, and what is still missing.
export function CompletenessMeter({ profile, className }: { profile: Profile | null; className?: string }) {
  const { percent, missing } = profileCompleteness(profile);
  return (
    <div className={className}>
      <div className="flex items-end justify-between gap-4">
        <p className="mono">{c.title}</p>
        <p className="text-[2rem] font-semibold leading-none tracking-tight text-text">
          {percent}
          <span className="text-[1rem] font-medium text-dim">%</span>
        </p>
      </div>
      <div className="mt-3 h-0.5 w-full" style={{ background: "var(--rule)" }} role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} aria-label={c.title}>
        <div className="h-full transition-[width] duration-700 ease-[cubic-bezier(.2,.7,.1,1)]" style={{ width: `${percent}%`, background: "var(--accent)" }} />
      </div>
      {missing.length > 0 ? (
        <>
          <p className="mono mt-5">{c.missing}</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {missing.map((k) => (
              <li key={k} className="rounded-[4px] border px-2.5 py-1 text-[13px] text-muted" style={{ borderColor: "var(--rule)" }}>
                {labels[k] ?? k}
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="t-small mt-5 text-muted">{c.complete}</p>
      )}
      <Link prefetch={false} href="/account/profile/" className="ul-draw mt-6 inline-flex items-center gap-2 pb-1 text-[15px] font-medium text-text hover:text-accent-text">
        {c.edit}
        <svg aria-hidden width="16" height="12" viewBox="0 0 16 12">
          <path d="M0 6h14M9 1l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </Link>
    </div>
  );
}
