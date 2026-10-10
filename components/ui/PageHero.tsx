export function PageHero({ tag, title, subtitle, children }: { tag: string; title: string; subtitle?: string; children?: React.ReactNode }) {
  return (
    <section className="blueprint-grid border-b border-border">
      <div className="mx-auto max-w-7xl px-4 py-16 md:px-6 md:py-24">
        <p className="mb-3 font-mono text-xs uppercase tracking-[0.2em] text-text-muted">{tag}</p>
        <h1 className="max-w-3xl text-3xl font-bold md:text-5xl">{title}</h1>
        {subtitle && <p className="mt-5 max-w-2xl text-lg text-text-muted">{subtitle}</p>}
        {children && <div className="mt-8 flex flex-wrap items-center gap-4">{children}</div>}
      </div>
    </section>
  );
}
