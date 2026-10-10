// Small stepped-slab icon, different for every program. Same motif as the logo and the hero building.
const Slab = ({ x, y, w, o = 1, accent = false }: { x: number; y: number; w: number; o?: number; accent?: boolean }) => (
  <rect x={x} y={y} width={w} height="6" fill={accent ? "var(--accent)" : "currentColor"} opacity={o} />
);

export function ProgramGlyph({ slug, className }: { slug: string; className?: string }) {
  let body: React.ReactNode;
  switch (slug) {
    case "bim-fundamentals-revit":
      body = (<><Slab x={8} y={46} w={44} /><rect x={14} y={20} width="10" height="26" fill="currentColor" opacity=".6" /><rect x={30} y={30} width="14" height="16" fill="var(--accent)" /></>);
      break;
    case "revit-architecture":
      body = (<><Slab x={8} y={44} w={40} /><Slab x={16} y={32} w={40} o={0.7} /><Slab x={24} y={20} w={32} accent /></>);
      break;
    case "revit-structure":
      body = (<><Slab x={8} y={20} w={48} />{[12, 26, 40, 52].map((x) => <rect key={x} x={x} y="26" width="4" height="26" fill="currentColor" opacity=".7" />)}<Slab x={8} y={52} w={48} accent /></>);
      break;
    case "revit-mep":
      body = (<><Slab x={8} y={14} w={48} />{[26, 36, 46].map((y, i) => <rect key={y} x="10" y={y} width="44" height="4" fill={i === 1 ? "#ffbc7d" : "#7fb7e6"} />)}</>);
      break;
    case "low-voltage-bim":
      body = (<><Slab x={8} y={14} w={48} /><rect x="10" y="32" width="44" height="3" fill="var(--accent)" />{[14, 24, 34, 44].map((x) => <circle key={x} cx={x + 4} cy="46" r="3" fill="var(--accent)" />)}</>);
      break;
    case "revit-family-creation":
      body = (<><rect x="10" y="26" width="26" height="26" fill="currentColor" opacity=".7" /><rect x="28" y="12" width="26" height="26" fill="var(--accent)" opacity=".9" /></>);
      break;
    case "navisworks-clash-detection":
      body = (<><rect x="8" y="22" width="32" height="26" fill="currentColor" opacity=".55" /><rect x="24" y="30" width="32" height="22" fill="#7fb7e6" opacity=".8" /><circle cx="32" cy="38" r="5" fill="#ff3b30" /></>);
      break;
    case "4d-5d-simulation":
      body = (<><Slab x={8} y={50} w={48} /><Slab x={16} y={38} w={40} o={0.8} /><Slab x={24} y={26} w={32} o={0.6} /><Slab x={32} y={14} w={24} accent /></>);
      break;
    case "dynamo-for-revit":
      body = (<><path d="M14 40 L32 20 L50 36 L32 52 Z" fill="none" stroke="currentColor" strokeWidth="1.5" opacity=".6" />{[[14, 40], [32, 20], [50, 36], [32, 52]].map(([cx, cy], i) => <circle key={i} cx={cx} cy={cy} r="5" fill={i === 1 ? "var(--accent)" : "currentColor"} />)}</>);
      break;
    case "bim-management-iso-19650":
      body = (<>{[0, 1, 2].map((i) => <rect key={i} x={12 + i * 6} y={10 + i * 6} width="30" height="40" fill="none" stroke={i === 2 ? "var(--accent)" : "currentColor"} strokeWidth="1.5" opacity={1 - i * 0.2} />)}<rect x="26" y="32" width="14" height="3" fill="var(--accent)" /></>);
      break;
    default:
      body = (<>{[0, 1, 2, 3, 4].map((i) => <Slab key={i} x={8 + (i % 2) * 8 + i * 2} y={48 - i * 9} w={40 - i * 3} accent={i === 4} o={0.45 + i * 0.12} />)}</>);
  }
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      {body}
    </svg>
  );
}
