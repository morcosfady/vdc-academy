// Lines of text rising out of a mask. Pure CSS (no JavaScript), so the heading is painted at first paint and
// the animation starts at once. `delay` shifts the whole sequence. Reduced motion collapses it to the end state.
export function RiseLines({ lines, className, delay = 0.1 }: { lines: string[]; className?: string; delay?: number }) {
  return (
    <span className={className}>
      {lines.map((l, i) => (
        <span key={i} className="block overflow-hidden pb-[0.08em]">
          {i > 0 && " "}
          <span className="rise block" style={{ animationDelay: `${delay + i * 0.09}s` }}>
            {l}
          </span>
        </span>
      ))}
    </span>
  );
}
