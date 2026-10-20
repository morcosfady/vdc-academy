import { cn } from "@/lib/utils";

// Paper skeletons: paper-2 blocks that breathe while a query runs. Always aria-busy on the wrapper.
export function Skeleton({ className }: { className?: string }) {
  return <span aria-hidden className={cn("block animate-pulse rounded-[4px]", className)} style={{ background: "var(--bg-2)" }} />;
}

export function StatSkeleton() {
  return (
    <div className="card p-6">
      <Skeleton className="h-10 w-20" />
      <Skeleton className="mt-4 h-3 w-32" />
    </div>
  );
}

export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div aria-busy="true" className="card overflow-hidden">
      <div className="flex gap-6 border-b px-5 py-4" style={{ borderColor: "var(--rule)" }}>
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3 w-32" />
        <Skeleton className="hidden h-3 w-20 md:block" />
        <Skeleton className="hidden h-3 w-16 md:block" />
      </div>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-6 border-b px-5 py-5 last:border-b-0" style={{ borderColor: "var(--rule)" }}>
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-4 w-44" />
          <Skeleton className="hidden h-4 w-24 md:block" />
          <Skeleton className="hidden h-5 w-20 md:block" />
        </div>
      ))}
    </div>
  );
}

export function BlockSkeleton({ lines = 4, className }: { lines?: number; className?: string }) {
  return (
    <div aria-busy="true" className={cn("card p-6", className)}>
      <Skeleton className="h-3 w-24" />
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} className={cn("mt-4 h-4", i % 2 ? "w-3/4" : "w-full")} />
      ))}
    </div>
  );
}

// Whole-screen skeleton shown while RequireAuth checks the session.
export function ShellSkeleton() {
  return (
    <section className="theme-light pt-[72px]" aria-busy="true" aria-label="Loading">
      <div className="wrap">
        <div className="rule-b pb-8 pt-10 lg:pb-10 lg:pt-14">
          <Skeleton className="h-3 w-40" />
          <Skeleton className="mt-7 h-10 w-72" />
        </div>
        <div className="flex gap-7 border-b py-4" style={{ borderColor: "var(--rule)" }}>
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-3 w-16" />
        </div>
        <div className="grid gap-5 py-10 sm:grid-cols-2 lg:grid-cols-4">
          <StatSkeleton />
          <StatSkeleton />
          <StatSkeleton />
          <StatSkeleton />
        </div>
      </div>
    </section>
  );
}
