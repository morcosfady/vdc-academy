export function Marquee({ items }: { items: string[] }) {
  const row = [...items, ...items];
  return (
    <div className="marquee overflow-hidden" aria-label="Software we teach">
      <ul className="marquee-track flex w-max gap-4">
        {row.map((t, i) => (
          <li
            key={i}
            aria-hidden={i >= items.length}
            className="whitespace-nowrap rounded-btn border border-border px-6 py-3 font-heading text-sm text-text-muted transition-colors hover:border-brand-accent hover:text-brand-accent"
          >
            {t}
          </li>
        ))}
      </ul>
    </div>
  );
}
