import type { Metadata } from "next";

// The poster page is a client page used only by scripts/poster.mjs. This layout only adds noindex; it renders nothing.
export const metadata: Metadata = { title: "Poster", robots: { index: false, follow: false } };

export default function PosterLayout({ children }: { children: React.ReactNode }) {
  return children;
}
