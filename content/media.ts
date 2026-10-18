import { photos, type Photo } from "@/assets/images";

// One map from a use to a photo, so client photos can replace the stock ones in one place later.
export const media = {
  whySite: { photo: photos.site, alt: "Engineer in a hard hat checks the model on a tablet on site" },
  whyScreen: { photo: photos.screen, alt: "Two engineers review drawings on a tablet on a city construction site" },
  grad: { photo: photos.grad, alt: "Young engineer in a hard hat holding a tablet on a construction site" },
  team: { photo: photos.team, alt: "Three engineers in hard hats review a model on a laptop" },
};

// Program card covers: 16:10 graded crops, one focus point per program.
export const covers: Record<string, { photo: Photo; pos: string }> = {
  "bim-fundamentals-revit": { photo: photos.cardGlass, pos: "20% 30%" },
  "revit-architecture": { photo: photos.cardFacade, pos: "30% 40%" },
  "revit-structure": { photo: photos.cardSteel, pos: "55% 70%" },
  "revit-mep": { photo: photos.cardGlass, pos: "80% 60%" },
  "low-voltage-bim": { photo: photos.cardGlass, pos: "45% 15%" },
  "revit-family-creation": { photo: photos.cardFacade, pos: "85% 20%" },
  "navisworks-clash-detection": { photo: photos.cardSteel, pos: "20% 40%" },
  "4d-5d-simulation": { photo: photos.cardSteel, pos: "85% 25%" },
  "dynamo-for-revit": { photo: photos.cardGlass, pos: "60% 85%" },
  "bim-management-iso-19650": { photo: photos.cardFacade, pos: "60% 80%" },
  "vdc-professional-bootcamp": { photo: photos.hero, pos: "50% 40%" },
};

export const cover = (slug: string) => covers[slug] ?? covers["bim-fundamentals-revit"];
