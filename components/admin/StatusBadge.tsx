import { type ApplicationStatus, type DiscountStatus, discountStatusLabel, statusLabel } from "@/lib/db";
import { cn } from "@/lib/utils";

// Status and discount badges in the Tag voice: mono, 4px radius. Blueprint for verified or moving forward,
// brass for anything waiting on someone, ink fill for enrolled, clash red text only for a rejection.
type Tone = "outline" | "blueprint" | "brass" | "ink" | "clash";

const toneStyle: Record<Tone, React.CSSProperties> = {
  outline: { border: "1px solid var(--rule)", color: "var(--text-dim)" },
  blueprint: { background: "var(--mist)", color: "#1c4a96" },
  brass: { background: "rgba(184,146,90,0.16)", color: "var(--warm)" },
  ink: { background: "var(--ink)", color: "#eef3f6" },
  clash: { border: "1px solid var(--rule)", color: "var(--clash)" },
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
