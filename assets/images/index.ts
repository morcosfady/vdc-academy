// Optimized, graded photos (see docs/image-credits.md). AVIF first, WebP fallback.
import heroAvif from "./hero-glass.avif";
import heroWebp from "./hero-glass.webp";
import steelAvif from "./panel-steel.avif";
import steelWebp from "./panel-steel.webp";
import glassAvif from "./panel-glass.avif";
import glassWebp from "./panel-glass.webp";
import facadeAvif from "./panel-facade.avif";
import facadeWebp from "./panel-facade.webp";
import craneAvif from "./light-crane.avif";
import craneWebp from "./light-crane.webp";
import cardSteelAvif from "./card-steel.avif";
import cardSteelWebp from "./card-steel.webp";
import cardGlassAvif from "./card-glass.avif";
import cardGlassWebp from "./card-glass.webp";
import cardFacadeAvif from "./card-facade.avif";
import cardFacadeWebp from "./card-facade.webp";

export type Photo = { avif: string; webp: string; width: number; height: number };
const p = (a: { src: string; width: number; height: number }, w: { src: string }): Photo => ({ avif: a.src, webp: w.src, width: a.width, height: a.height });

export const photos = {
  hero: p(heroAvif, heroWebp),
  steel: p(steelAvif, steelWebp),
  glass: p(glassAvif, glassWebp),
  facade: p(facadeAvif, facadeWebp),
  crane: p(craneAvif, craneWebp),
  cardSteel: p(cardSteelAvif, cardSteelWebp),
  cardGlass: p(cardGlassAvif, cardGlassWebp),
  cardFacade: p(cardFacadeAvif, cardFacadeWebp),
};
