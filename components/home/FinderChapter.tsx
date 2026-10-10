import { Slab } from "@/components/ui/Slab";
import { BlueprintLayer } from "@/components/ui/BlueprintLayer";
import { Finder } from "@/components/programs/Finder";

export function FinderChapter() {
  return (
    <section id="ch-4" aria-labelledby="finder-title" className="theme-dark relative overflow-hidden py-20 md:py-32">
      <BlueprintLayer className="drift pointer-events-none absolute inset-0 h-full w-full text-[#7db3e8] opacity-[0.07]" />
      <div aria-hidden className="pointer-events-none absolute end-[-10%] top-1/2 size-[760px] -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(90,160,225,0.22),transparent_65%)]" />
      <div className="relative z-10 mx-auto max-w-[1280px] px-5 md:px-8">
        <Slab className="mb-14 max-w-3xl">
          <p className="label mb-5">04 · Programs</p>
          <h2 id="finder-title" className="display-lg">Find your floor.</h2>
          <p className="mt-6 max-w-md text-muted">Every program sits on a level of the career path. Start where you are.</p>
        </Slab>
        <Finder />
      </div>
    </section>
  );
}
