// Stepped mark: three offset slabs, echoing the stepped building. Works from 20px up.
export function LogoMark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" aria-hidden className={className}>
      <rect x="0" y="2" width="16" height="6" fill="currentColor" />
      <rect x="6" y="11" width="16" height="6" fill="currentColor" opacity="0.75" />
      <rect x="12" y="20" width="16" height="6" fill="currentColor" opacity="0.5" />
    </svg>
  );
}

export function Logo() {
  return (
    <span className="flex items-center gap-3">
      <LogoMark className="text-accent" />
      <span className="leading-none">
        <span className="block font-display text-[15px] tracking-tight">VDC Academy</span>
        <span className="label mt-1 block whitespace-nowrap  !tracking-[0.16em]">by Bay BIM Designs</span>
      </span>
    </span>
  );
}
