import { cn } from "@/lib/utils";

// Empty state drawing: one floor plate of the study model, drawn as thin lines on paper. Decorative.
export function EmptyModel({ className }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 320 200" className={cn("text-slate", className)} fill="none" stroke="currentColor" strokeWidth="1" strokeLinejoin="round" strokeLinecap="round">
      {/* ground grid */}
      <g opacity="0.35">
        <path d="M40 150 L160 190 L280 150 L160 110 Z" />
        <path d="M70 140 L190 180 M100 130 L220 170 M130 120 L250 160" />
        <path d="M130 120 L40 150 M160 110 L70 140 M190 120 L100 130 M220 130 L130 120 M250 140 L160 110" opacity="0" />
        <path d="M100 130 L190 160 M130 120 L220 150 M160 110 L250 140 M70 140 L160 170" opacity="0.6" />
      </g>
      {/* slab */}
      <path d="M60 128 L160 162 L260 128 L160 94 Z" />
      <path d="M60 128 L60 134 L160 168 L260 134 L260 128 M160 162 L160 168" />
      {/* columns */}
      <path d="M90 118 V82 M130 131 V95 M190 131 V95 M230 118 V82 M160 144 V108" />
      <path d="M90 82 L160 108 L230 82 M130 95 L160 108 M190 95 L160 108" strokeDasharray="3 4" opacity="0.7" />
      {/* a few walls rising */}
      <path d="M100 121 L100 100 L140 114 L140 134" opacity="0.8" />
      <path d="M180 134 L180 112 L222 98 L222 118" opacity="0.8" />
      {/* grid bubbles */}
      <g fontFamily="var(--font-mono), ui-monospace, monospace" fontSize="9" letterSpacing="0.08em">
        <circle cx="90" cy="52" r="9" />
        <text x="90" y="55" textAnchor="middle" fill="currentColor" stroke="none">A</text>
        <circle cx="160" cy="36" r="9" />
        <text x="160" y="39" textAnchor="middle" fill="currentColor" stroke="none">B</text>
        <circle cx="230" cy="52" r="9" />
        <text x="230" y="55" textAnchor="middle" fill="currentColor" stroke="none">C</text>
        <path d="M90 61 V82 M160 45 V108 M230 61 V82" strokeDasharray="2 4" opacity="0.6" />
      </g>
      {/* dimension string */}
      <path d="M60 178 H160 M60 174 V182 M160 174 V182" opacity="0.6" />
      <text x="110" y="192" textAnchor="middle" fill="currentColor" stroke="none" fontFamily="var(--font-mono), ui-monospace, monospace" fontSize="8" letterSpacing="0.08em">LEVEL 01</text>
    </svg>
  );
}
