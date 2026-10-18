import { photos, type Photo } from "@/assets/images";
import { programCovers } from "@/assets/images/covers";

// One map from a use to a photo, so client photos can replace the stock ones in one place later.
export const media = {
  whySite: { photo: photos.site, alt: "Engineer in a hard hat checks the model on a tablet on site" },
  whyScreen: { photo: photos.screen, alt: "Two engineers review drawings on a tablet on a city construction site" },
  grad: { photo: photos.grad, alt: "Young engineer in a hard hat holding a tablet on a construction site" },
  team: { photo: photos.team, alt: "Three engineers in hard hats review a model on a laptop" },
};

// Program card covers: one render of the study model per program (scripts/covers.mjs), no repeats.
export const covers: Record<string, { photo: Photo; pos: string }> = Object.fromEntries(Object.entries(programCovers).map(([slug, photo]) => [slug, { photo, pos: "50% 50%" }]));

export const cover = (slug: string) => covers[slug] ?? { photo: photos.cardGlass, pos: "50% 50%" };
