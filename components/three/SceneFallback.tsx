// Static isometric building drawn in SVG. Shown while 3D loads and when WebGL is unavailable.
export function SceneFallback() {
  const floors = Array.from({ length: 6 });
  return (
    <svg viewBox="0 0 400 400" className="h-full w-full" aria-hidden>
      <g stroke="var(--brand-accent)" strokeWidth="1.5" fill="none" opacity="0.9">
        {floors.map((_, i) => {
          const y = 330 - i * 44;
          return (
            <g key={i}>
              <path d={`M200 ${y} l110 -44 v-24 l-110 44 z`} fill="var(--surface)" />
              <path d={`M200 ${y} l-110 -44 v-24 l110 44 z`} fill="var(--bg-elevated)" />
              <path d={`M200 ${y - 68} l110 -44 l-110 -44 l-110 44 z`} fill="var(--surface)" opacity="0.6" />
            </g>
          );
        })}
      </g>
    </svg>
  );
}
