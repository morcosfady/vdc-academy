import { Award, FolderOpen, Handshake, Layers, Presentation, Wrench } from "lucide-react";
import { media } from "@/content/media";
import { copy } from "@/content/copy";
import { Photo } from "@/components/ui/Photo";
import { Slab } from "@/components/ui/Slab";
import { DimensionString, SheetTag } from "@/components/ds/Devices";
import { FeatureItem } from "@/components/ds/Sections";

const icons = [Presentation, FolderOpen, Wrench, Layers, Handshake, Award];

// S3. Paper, editorial. Three rows, three different compositions, no boxes.
export function Why() {
  const c = copy.why;
  return (
    <section id="why" aria-labelledby="why-title" className="theme-light section">
      <div className="wrap">
        {/* Row 1: large portrait photo, headline beside it */}
        <div className="grid-12 items-center gap-y-10">
          <Slab className="col-span-12 lg:col-span-7">
            <figure className="img-wipe aspect-[4/5] max-h-[70svh] w-full overflow-hidden bg-paper-2 lg:max-h-none">
              <Photo photo={media.whySite.photo} alt={media.whySite.alt} className="parallax-y" />
            </figure>
          </Slab>
          <Slab className="col-span-12 lg:col-span-4 lg:col-start-9" index={1}>
            <SheetTag sheet={c.sheet} name={c.name} className="mb-8" />
            <h2 id="why-title">{c.title}</h2>
            <p className="t-lead mt-6">{c.lead}</p>
          </Slab>
        </div>

        {/* Row 2: small text block, wide landscape photo with a dimension string */}
        <div className="grid-12 mt-24 items-end gap-y-8 lg:mt-32">
          <Slab className="col-span-12 lg:col-span-4">
            <h3>{c.row2.title}</h3>
            <p className="t-body mt-4 text-muted">{c.row2.text}</p>
            <p className="mono mt-6">{c.row2.caption}</p>
          </Slab>
          <Slab className="col-span-12 lg:col-span-7 lg:col-start-6" index={1}>
            <figure className="img-wipe aspect-video w-full overflow-hidden bg-paper-2">
              <Photo photo={media.whyScreen.photo} alt={media.whyScreen.alt} className="parallax-y" />
            </figure>
            <DimensionString label={c.dimension} className="mt-4" />
          </Slab>
        </div>

        {/* Row 3: six benefits as a clean list with hairline dividers */}
        <Slab className="mt-24 lg:mt-32">
          <ul className="grid sm:grid-cols-2 lg:grid-cols-3 lg:gap-x-6">
            {c.benefits.map((b, i) => {
              const Icon = icons[i];
              return (
                <li key={b.t}>
                  <FeatureItem icon={<Icon size={26} strokeWidth={1.5} aria-hidden />} title={b.t} text={b.d} />
                </li>
              );
            })}
          </ul>
        </Slab>
      </div>
    </section>
  );
}
