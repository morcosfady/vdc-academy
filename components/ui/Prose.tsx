import { PageHero } from "./PageHero";

export function LegalPage({ eyebrow, title, updated, children }: { eyebrow: string; title: string[]; updated: string; children: React.ReactNode }) {
  return (
    <>
      <PageHero eyebrow={eyebrow} title={title} />
      <article className="mx-auto max-w-3xl space-y-10 px-5 pb-32 md:px-10 [&_h2]:font-semibold [&_h2]:text-xl [&_h2]:tracking-tight [&_li]:mt-2 [&_p]:mt-3 [&_p]:text-muted [&_ul]:list-disc [&_ul]:ps-6 [&_ul]:text-muted">
        <p className="meta">Last updated: {updated}</p>
        {children}
      </article>
    </>
  );
}
