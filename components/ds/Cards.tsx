import Link from "next/link";
import type { Photo as PhotoData } from "@/assets/images";
import { Photo } from "@/components/ui/Photo";
import { cn } from "@/lib/utils";
import { Software, Tag } from "./Chips";
import { discounts } from "@/config/discounts";

const ruleBorder = { borderColor: "var(--rule)" } as const;

// Program card as a drawing sheet: image, sheet number, title, one line, level, software, price line, arrow.
// The link covers the image and the text; `footer` (for example the compare toggle) sits in its own row so a
// control is never nested inside the anchor.
export function ProgramCard({
  href,
  sheet,
  title,
  line,
  level,
  software,
  photo,
  pos,
  price,
  meta,
  facts,
  alt,
  featured,
  footer,
  className,
}: {
  href: string;
  sheet: string;
  title: string;
  line: string;
  level: string;
  software: string[];
  photo: PhotoData;
  pos?: string;
  price?: string; // a confirmed price; absent shows `meta` instead
  meta?: string; // duration and format if set, else the level
  facts?: string[]; // three short facts inside the featured card
  alt?: string;
  featured?: boolean;
  footer?: React.ReactNode;
  className?: string;
}) {
  return (
    <article className={cn("group card flex h-full flex-col overflow-hidden transition-[border-color] duration-300 focus-within:border-accent hover:border-accent", className)}>
      <Link prefetch={false} href={href} className={cn("flex flex-1 flex-col outline-none", featured && "md:flex-row")}>
        <div className={cn("relative overflow-hidden", featured ? "aspect-[16/10] md:aspect-auto md:w-1/2" : "aspect-[16/10]")}>
          <Photo photo={photo} alt={alt ?? ""} sizes={featured ? "(min-width: 1024px) 44vw, 100vw" : "(min-width: 1024px) 30vw, (min-width: 768px) 50vw, 100vw"} className="transition-transform duration-[900ms] ease-[cubic-bezier(.2,.7,.1,1)] group-hover:scale-[1.03]" style={pos ? { objectPosition: pos } : undefined} />
        </div>
        <div className={cn("flex flex-1 flex-col p-6 pb-0 md:p-7 md:pb-0", featured && "md:w-1/2 md:p-9 md:pb-0")}>
          <div className="flex items-center justify-between">
            <span className="mono !text-text">{sheet}</span>
            <Tag>{level}</Tag>
          </div>
          <h3 className={cn("mt-5", featured ? "!text-[clamp(1.5rem,1.2rem+1vw,2rem)]" : "!text-[1.5rem]")}>{title}</h3>
          <p className="t-small mt-2 text-dim">{line}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            {software.map((s) => (
              <Software key={s}>{s}</Software>
            ))}
          </div>
          {facts && facts.length > 0 && (
            <ul className="mt-5 grid gap-2 border-t pt-4 sm:grid-cols-3" style={{ borderColor: "var(--rule)" }}>
              {facts.map((f) => (
                <li key={f} className="t-small flex items-start gap-2 text-muted">
                  <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" />
                  {f}
                </li>
              ))}
            </ul>
          )}
          <span className="mt-auto flex items-center justify-between gap-3 py-6 text-accent-text">
            <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
              {price ? (
                <>
                  <span className="mono !text-text">{price}</span>
                  <span className="mono !text-warm">−{discounts.freshGrad.percent}% for fresh grads</span>
                </>
              ) : (
                <span className="mono">{meta ?? level}</span>
              )}
            </span>
            <svg aria-hidden width="22" height="14" viewBox="0 0 22 14" className="shrink-0 transition-transform duration-200 group-hover:translate-x-1 group-focus-within:translate-x-1">
              <path d="M0 7h20M14 1l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </span>
        </div>
      </Link>
      {footer && (
        <div className="border-t px-6 py-3 md:px-7" style={{ borderColor: "var(--rule)" }}>
          {footer}
        </div>
      )}
    </article>
  );
}

export function TestimonialCard({ quote, who, className }: { quote: string; who: string; className?: string }) {
  return (
    <figure className={cn("card p-7 md:p-9", className)}>
      <blockquote className="text-[1.125rem] leading-relaxed text-text">{quote}</blockquote>
      <figcaption className="mono mt-6 border-t pt-4" style={ruleBorder}>
        {who}
      </figcaption>
    </figure>
  );
}

export function InstructorCard({ name, role, photo, className }: { name: string; role: string; photo: PhotoData; className?: string }) {
  return (
    <article className={cn("card overflow-hidden", className)}>
      <div className="aspect-[4/5]">
        <Photo photo={photo} />
      </div>
      <div className="p-6">
        <h3 className="!text-[1.25rem]">{name}</h3>
        <p className="mono mt-2">{role}</p>
      </div>
    </article>
  );
}
