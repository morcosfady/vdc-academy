import Link from "next/link";
import type { Photo as PhotoData } from "@/assets/images";
import { Photo } from "@/components/ui/Photo";
import { cn } from "@/lib/utils";
import { Software, Tag } from "./Chips";

const ruleBorder = { borderColor: "var(--rule)" } as const;

// Program card as a drawing sheet: image, sheet number, title, one line, level, software, arrow.
export function ProgramCard({
  href,
  sheet,
  title,
  line,
  level,
  software,
  photo,
  featured,
  className,
}: {
  href: string;
  sheet: string;
  title: string;
  line: string;
  level: string;
  software: string[];
  photo: PhotoData;
  featured?: boolean;
  className?: string;
}) {
  return (
    <Link
      prefetch={false}
      href={href}
      className={cn(
        "group card flex h-full flex-col overflow-hidden transition-[border-color] duration-300 hover:border-accent",
        featured && "md:flex-row",
        className,
      )}
    >
      <div className={cn("relative overflow-hidden", featured ? "aspect-[16/10] md:aspect-auto md:w-1/2" : "aspect-[16/10]")}>
        <Photo photo={photo} className="transition-transform duration-[900ms] ease-[cubic-bezier(.2,.7,.1,1)] group-hover:scale-[1.03]" />
      </div>
      <div className={cn("flex flex-1 flex-col p-6 md:p-7", featured && "md:w-1/2")}>
        <div className="flex items-center justify-between">
          <span className="mono !text-text">{sheet}</span>
          <Tag>{level}</Tag>
        </div>
        <h3 className="mt-5 !text-[1.5rem]">{title}</h3>
        <p className="t-small mt-2 text-dim">{line}</p>
        <div className="mt-5 flex flex-wrap gap-2">
          {software.map((s) => (
            <Software key={s}>{s}</Software>
          ))}
        </div>
        <span className="mt-auto flex justify-end pt-6 text-accent-text" aria-hidden>
          <svg width="22" height="14" viewBox="0 0 22 14" className="transition-transform duration-200 group-hover:translate-x-1">
            <path d="M0 7h20M14 1l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </span>
      </div>
    </Link>
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
