import { photos } from "@/assets/images";
import { cn } from "@/lib/utils";

// The rendered still of the study model: the first thing painted (LCP), the no-WebGL fallback and the
// reduced-motion image. Rendered by scripts/poster.mjs from /poster. `night` picks the ink version.
export function SteppedPoster({ className, night = false, priority = false }: { className?: string; night?: boolean; priority?: boolean }) {
  const p = night ? photos.modelNight : photos.modelPaper;
  return (
    <picture className={cn("!bg-transparent", className)}>
      <source srcSet={p.avif} type="image/avif" />
      <img
        src={p.webp}
        alt=""
        width={p.width}
        height={p.height}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        {...(priority ? { fetchPriority: "high" as const } : {})}
        className="h-full w-full object-contain"
        draggable={false}
      />
    </picture>
  );
}
