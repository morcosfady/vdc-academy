import { photos } from "@/assets/images";
import { BlueprintLayer } from "./BlueprintLayer";
import { Photo } from "./Photo";
import { RiseLines } from "./RiseLines";

// Compact hero for inner pages: graded photo, blueprint layer and one headline.
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
    <section className="theme-dark relative overflow-hidden pb-16 pt-36 md:pb-24 md:pt-44">
      <div className="absolute inset-0" aria-hidden>
        <Photo photo={photos.glass} className="opacity-45" style={{ objectPosition: "50% 40%" }} />
      </div>
      <div aria-hidden className="absolute inset-0 bg-[linear-gradient(90deg,#0a1d23_0%,rgba(10,29,35,0.92)_40%,rgba(10,29,35,0.4)_100%)]" />
      <div aria-hidden className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#0a1d23] to-transparent" />
      <BlueprintLayer className="drift pointer-events-none absolute inset-0 h-full w-full text-[#7db3e8] opacity-[0.08]" />
      <div className="relative z-10 mx-auto max-w-[1280px] px-5 md:px-8">
        <p className="label mb-5">{eyebrow}</p>
        <h1 className="display-lg max-w-[18ch] text-[#f2f7fb]" aria-label={title.join(" ")}>
          <RiseLines lines={title} />
        </h1>
        {subtitle && <p className="mt-6 max-w-xl text-lg text-[#a9bcc4]">{subtitle}</p>}
        {children && <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-4">{children}</div>}
      </div>
    </section>
  );
}
