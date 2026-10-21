import { type ApplicationStatus, type DiscountStatus, type HiringStatus, type VerificationStatus, discountStatusLabel, hiringStatusLabel, statusLabel, verificationLabel } from "@/lib/db";
import { cn } from "@/lib/utils";

// Status and discount badges in the Tag voice: mono, 4px radius. Blueprint for verified or moving forward,
// brass for anything waiting on someone, ink fill for enrolled, danger red text only for a rejection (--err: the clash red is under 4.5:1 on paper).
type Tone = "outline" | "blueprint" | "brass" | "ink" | "clash";

const toneStyle: Record<Tone, React.CSSProperties> = {
  outline: { border: "1px solid var(--rule)", color: "var(--text-dim)" },
  blueprint: { background: "var(--mist)", color: "#1c4a96" },
  brass: { background: "rgba(184,146,90,0.16)", color: "var(--warm)" },
  ink: { background: "var(--ink)", color: "#eef3f6" },
  clash: { border: "1px solid var(--rule)", color: "var(--err)" },
};

const statusTone: Record<ApplicationStatus, Tone> = {
  draft: "outline",
  submitted: "blueprint",
  under_review: "brass",
  interview: "brass",
  accepted: "blueprint",
  enrolled: "ink",
  waitlist: "outline",
  rejected: "clash",
};

const discountTone: Record<DiscountStatus, Tone> = { none: "outline", pending: "brass", verified: "blueprint", rejected: "clash" };
const verificationTone: Record<VerificationStatus, Tone> = { pending: "brass", approved: "blueprint", rejected: "clash" };
const hiringTone: Record<HiringStatus, Tone> = { new: "blueprint", in_review: "brass", matched: "ink", closed: "outline" };

function Badge({ tone, children, className }: { tone: Tone; children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("mono inline-flex h-6 items-center whitespace-nowrap rounded-[4px] px-2", className)} style={toneStyle[tone]}>
      {children}
    </span>
  );
}

export function StatusBadge({ status, className }: { status: ApplicationStatus | string; className?: string }) {
  const s = status as ApplicationStatus;
  return (
    <Badge tone={statusTone[s] ?? "outline"} className={className}>
      {statusLabel[s] ?? status}
    </Badge>
  );
}

export function DiscountBadge({ status, className }: { status: DiscountStatus | string; className?: string }) {
  const s = status as DiscountStatus;
  return (
    <Badge tone={discountTone[s] ?? "outline"} className={className}>
      {discountStatusLabel[s] ?? status}
    </Badge>
  );
}

export function HandledBadge({ handled, openLabel, handledLabel, className }: { handled: boolean; openLabel: string; handledLabel: string; className?: string }) {
  return (
    <Badge tone={handled ? "outline" : "brass"} className={className}>
      {handled ? handledLabel : openLabel}
    </Badge>
  );
}

export function VerificationBadge({ status, className }: { status: VerificationStatus | string; className?: string }) {
  const s = status as VerificationStatus;
  return (
    <Badge tone={verificationTone[s] ?? "outline"} className={className}>
      {verificationLabel[s] ?? status}
    </Badge>
  );
}

export function HiringBadge({ status, className }: { status: HiringStatus | string; className?: string }) {
  const s = status as HiringStatus;
  return (
    <Badge tone={hiringTone[s] ?? "outline"} className={className}>
      {hiringStatusLabel[s] ?? status}
    </Badge>
  );
}

// A neutral outline label, for the academy team marker in the users table.
export function PlainBadge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <Badge tone="outline" className={className}>
      {children}
    </Badge>
  );
}
