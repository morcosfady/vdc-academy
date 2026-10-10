import type { Photo as PhotoData } from "@/assets/images";
import { cn } from "@/lib/utils";

// Responsive photo: AVIF with WebP fallback, explicit size to avoid layout shift, lazy unless it is the LCP image.
export function Photo({
  photo,
  alt = "",
  className,
  priority = false,
  style,
}: {
  photo: PhotoData;
  alt?: string;
  className?: string;
  priority?: boolean;
  style?: React.CSSProperties;
}) {
  return (
    <picture>
      <source srcSet={photo.avif} type="image/avif" />
      <img
        src={photo.webp}
        alt={alt}
        width={photo.width}
        height={photo.height}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        {...(priority ? { fetchPriority: "high" as const } : {})}
        className={cn("h-full w-full object-cover", className)}
        style={style}
      />
    </picture>
  );
}
