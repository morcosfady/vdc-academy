// Static stepped building drawn in SVG. It is the first thing painted (LCP), the fallback without WebGL,
// and the reduced-motion image. Colors follow the theme.
export function SteppedPoster({ className }: { className?: string }) {
  const floors = [
    { x: 0, w: 220 },
    { x: 34, w: 190 },
    { x: -24, w: 200 },
    { x: 30, w: 176 },
    { x: -18, w: 150 },
    { x: 10, w: 118 },
  ];
  return (
    <svg viewBox="0 0 400 420" className={className} aria-hidden preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="pg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--accent)" stopOpacity="0.28" />
          <stop offset="1" stopColor="var(--accent)" stopOpacity="0.04" />
        </linearGradient>
      </defs>
      {floors.map((f, i) => {
        const y = 340 - i * 52;
        const cx = 200 + f.x;
        const hw = f.w / 2;
        return (
          <g key={i} stroke="var(--accent)" strokeWidth="1.4" fill="url(#pg)">
            <path d={`M${cx - hw} ${y} l${hw} 26 l${hw} -26 v-34 l-${hw} -26 l-${hw} 26 z`} />
            <path d={`M${cx} ${y + 26} v-34`} fill="none" opacity="0.5" />
            <path d={`M${cx - hw + 24} ${y - 14} h${f.w - 48}`} fill="none" stroke="#ffbc7d" opacity="0.7" />
            <path d={`M${cx - hw + 30} ${y - 22} h${f.w - 60}`} fill="none" stroke="#7fb7e6" opacity="0.7" />
          </g>
        );
      })}
    </svg>
  );
}
