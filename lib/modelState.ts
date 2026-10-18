export type Isolate = "all" | "architecture" | "structure" | "mep" | "lowvoltage" | "clash" | "4d";

// Mutable values the 3D building reads every frame. GSAP, sliders and buttons write to it directly,
// so nothing re-renders React per frame.
export type SteppedState = {
  build: number; // 0..1 assembly (floors rise, then systems appear)
  explode: number; // 0..1 floors separate vertically (kept for older callers, unused by the v5 model)
  spread: number; // kept for older callers
  lod: number; // 100 | 200 | 300 | 350 | 400 | 500
  isolate: Isolate;
  clash: number; // -1 off, 0..0.5 red clash, 0.5..1 reroute and check
  sim: number; // -1 off, 0..1 floors appear one by one (4D)
  highlight: number; // floor index to light up, -1 none
  focus: number; // 0..1 camera moves toward the clash
  yaw: number; // extra rotation in radians (drag + scroll)
  mood: number; // 0 paper (white study model on a table), 1 night (dark slabs, fine mist edges, systems glow)
  dolly: number; // 0..1 camera moves in (hero to explorer handover)
};

export const LODS = [100, 200, 300, 350, 400, 500] as const;

export const lodNotes: Record<number, string> = {
  100: "Massing only. Simple volumes to test the shape.",
  200: "Floors and walls. Approximate size and placement.",
  300: "Columns, beams and main ducts at real size.",
  350: "Hangers and connections between systems.",
  400: "Small pipes and cable trays, ready to fabricate.",
  500: "Tags and data on every element, as built.",
};

export const newState = (over: Partial<SteppedState> = {}): SteppedState => ({
  build: 1,
  explode: 0,
  spread: 1,
  lod: 300,
  isolate: "all",
  clash: -1,
  sim: -1,
  highlight: -1,
  focus: 0,
  yaw: 0,
  mood: 0,
  dolly: 0,
  ...over,
});
