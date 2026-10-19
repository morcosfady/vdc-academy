import { cn } from "@/lib/utils";

// A static, hand-drawn map of the Dallas Fort Worth area: a soft metro region, a few thin interstates, a pin on
// Fort Worth. Inline SVG in currentColor so it sits on paper or ink. No tiles, no embeds, nothing to load.
// Used on /about and /contact.
export function Map({ className, label = "Map of the Dallas Fort Worth area with a pin on Fort Worth" }: { className?: string; label?: string }) {
  const road = { fill: "none", stroke: "currentColor", strokeWidth: 1.25, vectorEffect: "non-scaling-stroke" as const };
  const thin = { ...road, strokeWidth: 1, opacity: 0.45 };
  const text = { fontFamily: "var(--font-mono), ui-monospace, monospace", fontSize: 11, letterSpacing: "0.08em", fill: "currentColor" } as const;
  // Fort Worth and Dallas sit on the same east-west line, about 30 miles apart.
  const fw = { x: 196, y: 212 };
  const dal = { x: 432, y: 200 };
  return (
    <svg viewBox="0 0 640 400" role="img" aria-label={label} className={cn("h-auto w-full text-ink", className)}>
      {/* metro region: a soft shape, paper-2 fill, hairline edge */}
      <path
        d="M72 196c0-48 46-92 108-104 54-10 110 2 168-6 58-8 118-24 176-6 44 14 72 60 70 112-2 44-28 78-66 98-46 24-104 20-156 22-52 2-104 10-154-2-52-12-96-36-124-74-16-20-22-32-22-40z"
        fill="var(--bg-2, var(--paper-2))"
        stroke="currentColor"
        strokeWidth="1"
        opacity="0.9"
        vectorEffect="non-scaling-stroke"
      />
      {/* interstates: I-30 and I-20 east-west, I-35W and I-35E north-south, the two loops */}
      <path d="M48 214 C140 206 300 210 360 206 S540 200 600 198" {...road} />
      <path d="M60 262 C180 258 320 262 420 258 S560 254 600 252" {...road} />
      <path d={`M${fw.x - 4} 60 C${fw.x} 140 ${fw.x - 6} 260 ${fw.x + 2} 350`} {...road} />
      <path d={`M${dal.x + 6} 48 C${dal.x} 130 ${dal.x + 4} 250 ${dal.x - 2} 352`} {...road} />
      <path d={`M${fw.x - 70} ${fw.y - 50} h140 v100 h-140 z`} {...thin} />
      <path d={`M${dal.x - 72} ${dal.y - 56} h150 v108 h-150 z`} {...thin} />
      {/* airport between the two cities, drawn as a runway pair */}
      <path d="M306 118 l10 56 M322 116 l10 56" {...thin} />
      <text x="300" y="104" {...text} opacity="0.6">
        DFW
      </text>
      {/* Dallas: a grid bubble, no pin */}
      <circle cx={dal.x} cy={dal.y} r="5" fill="none" stroke="currentColor" strokeWidth="1.25" vectorEffect="non-scaling-stroke" />
      <text x={dal.x + 14} y={dal.y + 4} {...text}>
        DALLAS
      </text>
      {/* Fort Worth: a blueprint pin with a ring */}
      <g style={{ color: "var(--accent)" }}>
        <circle cx={fw.x} cy={fw.y} r="14" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.5" vectorEffect="non-scaling-stroke" />
        <path d={`M${fw.x} ${fw.y - 30} c-9 0-14 7-14 14 0 10 14 24 14 24s14-14 14-24c0-7-5-14-14-14z`} fill="currentColor" />
        <circle cx={fw.x} cy={fw.y - 16} r="4.5" fill="var(--bg, var(--paper))" />
      </g>
      <text x={fw.x - 44} y={fw.y + 34} {...text} fontWeight="500">
        FORT WORTH
      </text>
      {/* scale bar and north */}
      <path d="M48 352 h80 M48 347 v10 M88 347 v10 M128 347 v10" {...road} />
      <text x="48" y="374" {...text} opacity="0.7">
        0 · 15 · 30 MI
      </text>
      <g transform="translate(588 56)">
        <circle cx="0" cy="0" r="14" fill="none" stroke="currentColor" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        <path d="M0 -10 5 7 0 4 -5 7Z" fill="currentColor" />
      </g>
    </svg>
  );
}
