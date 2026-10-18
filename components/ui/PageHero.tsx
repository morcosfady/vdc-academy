import { SheetTag } from "@/components/ds/Devices";
import { cn } from "@/lib/utils";

// Paper page hero for the inner pages: sheet tag, one headline, one lead, optional actions. No photo, no decoration.
// `title` is an array for older call sites; the lines are joined with a space.
export function PageHero({
  eyebrow,
  sheet,
  title,
  subtitle,
  children,
  className,
}: {
  eyebrow: string;
  sheet?: string;
  title: string[];
  subtitle?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("theme-light pt-[72px]", className)}>
      <div className="wrap">
        <div className="rule-b pb-14 pt-16 lg:pb-20 lg:pt-28">
          {sheet ? <SheetTag sheet={sheet} name={eyebrow} /> : <p className="mono">{eyebrow}</p>}
          <h1 className="t-h1 mt-8 max-w-[18ch]">{title.join(" ")}</h1>
          {subtitle && <p className="t-lead mt-6">{subtitle}</p>}
          {children && <div className="mt-9 flex flex-col gap-5 sm:flex-row sm:items-center">{children}</div>}
        </div>
      </div>
    </section>
  );
}
