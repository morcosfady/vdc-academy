export type Isolate = "all" | "architecture" | "structure" | "mep" | "lowvoltage" | "clash" | "4d";

// Mutable values the 3D building reads every frame. GSAP, sliders and buttons write to it directly,
// so nothing re-renders React per frame.
export type SteppedState = {
  build: number; // 0..1 assembly (floors drop in, then systems light up)
  explode: number; // 0..1 floors separate vertically
  spread: number; // 0..1.5 lateral stepped offset (1 = the signature pose)
  lod: number; // 100 | 200 | 300 | 350 | 400 | 500
  isolate: Isolate;
  clash: number; // -1 off, 0..0.5 red clash, 0.5..1 reroute to green
  sim: number; // -1 off, 0..1 floors appear one by one (4D)
  highlight: number; // floor index to highlight, -1 none
  focus: number; // 0..1 camera zooms toward the clash
  yaw: number; // extra rotation in radians (drag + scroll)
};

export const LODS = [100, 200, 300, 350, 400, 500] as const;

export const lodNotes: Record<number, string> = {
  100: "Massing only. Simple volumes to test the shape.",
  200: "Floors and walls. Approximate size and placement.",
  300: "Adds columns, beams and main ducts at real size.",
  350: "Adds hangers and connections between systems.",
  400: "Adds small pipes and cable trays, ready to fabricate.",
  500: "Adds tags and data on every element, as built.",
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
  ...over,
});
