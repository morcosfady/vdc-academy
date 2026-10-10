// A real technical drawing used as a quiet background: column grid bubbles (A, B, C / 1, 2, 3),
// dimension lines, section markers and a stepped elevation outline. Decorative, so hidden from screen readers.
export function BlueprintLayer({ className }: { className?: string }) {
  const cols = ["A", "B", "C", "D", "E"];
  const rows = ["1", "2", "3", "4"];
  return (
    <svg viewBox="0 0 1600 900" className={className} preserveAspectRatio="xMidYMid slice" aria-hidden fill="none" stroke="currentColor" strokeWidth="1">
      {/* column grid */}
      {cols.map((c, i) => (
        <g key={c}>
          <path d={`M${200 + i * 300} 80 V820`} strokeDasharray="14 8 2 8" />
          <circle cx={200 + i * 300} cy="60" r="18" />
          <text x={200 + i * 300} y="66" textAnchor="middle" fontSize="16" fill="currentColor" stroke="none">{c}</text>
        </g>
      ))}
      {rows.map((r, i) => (
        <g key={r}>
          <path d={`M120 ${180 + i * 200} H1500`} strokeDasharray="14 8 2 8" />
          <circle cx="96" cy={180 + i * 200} r="18" />
          <text x="96" y={186 + i * 200} textAnchor="middle" fontSize="16" fill="currentColor" stroke="none">{r}</text>
        </g>
      ))}
      {/* dimension lines */}
      <path d="M200 860 H1400 M200 850 V870 M500 850 V870 M800 850 V870 M1100 850 V870 M1400 850 V870" />
      <text x="350" y="846" textAnchor="middle" fontSize="13" fill="currentColor" stroke="none">9 000</text>
      <text x="650" y="846" textAnchor="middle" fontSize="13" fill="currentColor" stroke="none">9 000</text>
      <text x="950" y="846" textAnchor="middle" fontSize="13" fill="currentColor" stroke="none">9 000</text>
      <text x="1250" y="846" textAnchor="middle" fontSize="13" fill="currentColor" stroke="none">9 000</text>
      {/* section markers */}
      <g>
        <path d="M120 540 H220 M170 540 V500" />
        <circle cx="170" cy="480" r="20" />
        <path d="M150 480 H190" />
        <text x="170" y="474" textAnchor="middle" fontSize="12" fill="currentColor" stroke="none">1</text>
        <text x="170" y="496" textAnchor="middle" fontSize="12" fill="currentColor" stroke="none">A-301</text>
      </g>
      {/* stepped elevation outline */}
      <path d="M900 700 V620 H980 V540 H1060 V460 H1140 V380 H1220 V700 Z" />
      <path d="M980 620 V700 M1060 540 V700 M1140 460 V700" opacity="0.6" />
    </svg>
  );
}
