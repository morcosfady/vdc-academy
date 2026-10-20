import { cn } from "@/lib/utils";
import { NoScriptNote } from "@/components/ui/NoScript";

// Paper skeleton blocks while the session or the rows load. Paper-2 tone, a slow pulse, no spinners.
export function Block({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return <div aria-hidden className={cn("animate-pulse rounded-[4px] bg-paper-2", className)} style={style} />;
}

// A whole account page: header lines and three cards.
export function AccountSkeleton({ label = "Loading your account" }: { label?: string }) {
  return (
    <section className="theme-light pt-[72px]" aria-busy="true" aria-label={label}>
      <div className="wrap">
        <div className="rule-b pb-10 pt-12 lg:pb-14 lg:pt-20">
          <Block className="h-3 w-40" />
          <Block className="mt-8 h-12 w-[min(100%,420px)]" />
          <Block className="mt-5 h-5 w-[min(100%,520px)]" />
          <NoScriptNote />
        </div>
        <div className="grid-12 gap-y-6 pb-24 pt-10 lg:pt-14">
          <Block className="col-span-12 h-48 rounded-[12px] lg:col-span-8" />
          <Block className="col-span-12 h-48 rounded-[12px] lg:col-span-4" />
          <Block className="col-span-12 h-40 rounded-[12px] lg:col-span-6" />
          <Block className="col-span-12 h-40 rounded-[12px] lg:col-span-6" />
        </div>
      </div>
    </section>
  );
}

// A form column while an auth link is being finished.
export function FormSkeleton() {
  return (
    <div aria-busy="true" className="max-w-[480px]">
      <NoScriptNote className="!mt-0 mb-8" />
      <Block className="h-3 w-32" />
      <Block className="mt-8 h-12 w-72" />
      <Block className="mt-5 h-5 w-full" />
      <Block className="mt-10 h-14 w-full" />
      <Block className="mt-4 h-14 w-full" />
      <Block className="mt-6 h-[52px] w-40 rounded-[8px]" />
    </div>
  );
}
