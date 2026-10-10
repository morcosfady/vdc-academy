// Lines of text rising out of a mask. Pure CSS (no JavaScript), so the heading is painted at first paint and
// the animation starts at once. Reduced motion collapses the animation to its end state (see globals.css).
export function RiseLines({ lines, className }: { lines: string[]; className?: string }) {
  return (
    <span className={className}>
      {lines.map((l, i) => (
        <span key={i} className="block overflow-hidden pb-[0.08em]">
          {i > 0 && " "}
          <span className="rise block" style={{ animationDelay: `${0.1 + i * 0.09}s` }}>
            {l}
          </span>
        </span>
      ))}
    </span>
  );
}
