export type Cats = { structure: boolean; ducts: boolean; pipes: boolean; trays: boolean; facade: boolean };

// Mutable values the 3D model reads every frame. GSAP and sliders write to it directly.
export type ModelState = {
  build: number; // 0..1 assembly timeline
  wire: number; // 1 = wireframe, 0 = solid
  explode: number; // 0..1 exploded view
  lod: number; // 100 | 200 | 300 | 350 | 400 | 500
  clash: number; // -1 off, 0..0.5 red clash, 0.5..1 rerouting to green
  sim: number; // -1 off, 0..1 4D floor-by-floor growth
  focus: number; // 0..1 camera zoom to the clash
  cats: Cats;
};

export const newModelState = (over: Partial<ModelState> = {}): ModelState => ({
  build: 1,
  wire: 0,
  explode: 0,
  lod: 500,
  clash: -1,
  sim: -1,
  focus: 0,
  cats: { structure: true, ducts: true, pipes: true, trays: true, facade: true },
  ...over,
});
