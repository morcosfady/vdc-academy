import { LogoMark } from "./Logo";
import { RiseLines } from "./RiseLines";

// Compact hero for inner pages: one headline, one line, optional actions. The stepped mark sits behind.
export function PageHero({
  eyebrow,
  title,
  subtitle,
  children,
}: {
  eyebrow: string;
  title: string[];
  subtitle?: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="relative overflow-hidden pb-16 pt-36 md:pb-24 md:pt-48">
      <LogoMark size={520} className="pointer-events-none absolute -end-24 top-8 hidden text-accent opacity-[0.07] md:block" />
      <div className="relative z-10 mx-auto max-w-[1600px] px-5 md:px-10">
        <p className="label mb-5">{eyebrow}</p>
        <h1 className="display-lg max-w-[18ch]" aria-label={title.join(" ")}>
          <RiseLines lines={title} />
        </h1>
        {subtitle && <p className="mt-6 max-w-xl text-lg text-muted">{subtitle}</p>}
        {children && <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-4">{children}</div>}
      </div>
    </section>
  );
}
