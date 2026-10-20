import type { Photo as PhotoData } from "@/assets/images";
import { cn } from "@/lib/utils";

// Responsive photo: AVIF with WebP fallback, explicit size to avoid layout shift, lazy unless it is the LCP image.
export function Photo({
  photo,
  alt = "",
  className,
  priority = false,
  style,
  sizes = "(min-width: 1024px) 33vw, 100vw",
}: {
  photo: PhotoData;
  alt?: string;
  className?: string;
  priority?: boolean;
  style?: React.CSSProperties;
  sizes?: string;
}) {
  return (
    <picture style={photo.blur ? { backgroundImage: `url(${photo.blur})`, backgroundSize: "cover", backgroundPosition: style?.objectPosition ?? "center" } : undefined}>
      <source srcSet={photo.avifSm ? `${photo.avifSm} ${Math.round(photo.width / 2)}w, ${photo.avif} ${photo.width}w` : photo.avif} sizes={photo.avifSm ? sizes : undefined} type="image/avif" />
      {photo.webpSm && <source srcSet={`${photo.webpSm} ${Math.round(photo.width / 2)}w, ${photo.webp} ${photo.width}w`} sizes={sizes} type="image/webp" />}
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
