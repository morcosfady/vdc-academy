import { PageHero } from "./PageHero";
import { pages } from "@/content/copy-pages";
import { cn } from "@/lib/utils";

// Long-form text on paper in a narrow column. Headings are H4 size, lists get hairline bullets.
export function Prose({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "max-w-3xl space-y-12 text-muted [&_a]:underline [&_a]:underline-offset-4 [&_a:hover]:text-accent-text [&_h2]:text-[clamp(1.25rem,1.05rem+0.7vw,1.5rem)] [&_h2]:leading-[1.2] [&_h2]:text-text [&_li]:mt-2 [&_p]:mt-4 [&_ul]:mt-4 [&_ul]:list-disc [&_ul]:ps-5",
        className,
      )}
    >
      {children}
    </div>
  );
}

// Legal pages: hero, a mono "last updated" line, then the prose.
export function LegalPage({ eyebrow, sheet, title, updated, children }: { eyebrow: string; sheet?: string; title: string[]; updated: string; children: React.ReactNode }) {
  return (
    <>
      <PageHero eyebrow={eyebrow} sheet={sheet} title={title} />
      <section className="theme-light section !pt-16 lg:!pt-20">
        <article className="wrap">
          <p className="mono">{pages.legal.updated(updated)}</p>
          <Prose className="mt-10">{children}</Prose>
        </article>
      </section>
    </>
  );
}
