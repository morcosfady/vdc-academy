import { Slab } from "@/components/ui/Slab";
import { Finder } from "@/components/programs/Finder";

export function FinderChapter() {
  return (
    <section id="ch-4" aria-labelledby="finder-title" className="relative py-24 md:py-36">
      <div className="mx-auto max-w-[1600px] px-5 md:px-10">
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
