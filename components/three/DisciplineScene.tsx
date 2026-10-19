"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { ContactShadows, Edges, Environment, Lightformer, PerspectiveCamera } from "@react-three/drei";
import { BufferGeometry, CanvasTexture, Color, CubicBezierCurve3, Line, LineBasicMaterial, MeshStandardMaterial, Sprite, SpriteMaterial, Vector3, type Group } from "three";
import { StudyModel } from "./StudyModel";
import { newState } from "@/lib/modelState";

// Eleven close-up "discipline scenes" rendered from the same study-model language: paper surfaces, thin ink
// edges, blueprint, brass and slate accents, one lens, one soft studio light. Rendered to stills by
// scripts/covers.mjs through /poster?scene=<id>. Everything is procedural; no external assets.

const C = {
  paper: "#f2efe8",
  paper2: "#e6e2da",
  ink: "#0a1d23",
  slate: "#365b62",
  blueprint: "#2a63c4",
  brass: "#b8925a",
  mist: "#d6e8f6",
  clash: "#d9463e",
};

const mats = {
  paper: new MeshStandardMaterial({ color: C.paper, roughness: 0.9 }),
  paper2: new MeshStandardMaterial({ color: C.paper2, roughness: 0.95 }),
  slate: new MeshStandardMaterial({ color: C.slate, roughness: 0.6 }),
  blueprint: new MeshStandardMaterial({ color: C.blueprint, roughness: 0.5 }),
  brass: new MeshStandardMaterial({ color: C.brass, roughness: 0.4, metalness: 0.2 }),
  ink: new MeshStandardMaterial({ color: "#1b3444", roughness: 0.7 }),
  glass: new MeshStandardMaterial({ color: C.mist, roughness: 0.2, transparent: true, opacity: 0.4, depthWrite: false }),
  clash: new MeshStandardMaterial({ color: C.clash, roughness: 0.5 }),
};

type V3 = [number, number, number];

// A box with a crisp outline, the basic unit of every scene
function Block({ at, size, mat = mats.paper, edge = 0.55, rot }: { at: V3; size: V3; mat?: MeshStandardMaterial; edge?: number; rot?: V3 }) {
  return (
    <mesh position={at} rotation={rot} material={mat}>
      <boxGeometry args={size} />
      {edge > 0 && <Edges threshold={20} color={C.ink} lineWidth={1} transparent opacity={edge} />}
    </mesh>
  );
}

function Cyl({ at, r, h, mat = mats.brass, rot }: { at: V3; r: number; h: number; mat?: MeshStandardMaterial; rot?: V3 }) {
  return (
    <mesh position={at} rotation={rot} material={mat}>
      <cylinderGeometry args={[r, r, h, 20]} />
    </mesh>
  );
}

// Thin line between points
function Wire({ pts, color = C.ink, opacity = 0.7, dashed = false }: { pts: V3[]; color?: string; opacity?: number; dashed?: boolean }) {
  const line = useMemo(() => {
    const g = new BufferGeometry().setFromPoints(pts.map((p) => new Vector3(...p)));
    const l = new Line(g, new LineBasicMaterial({ color, transparent: true, opacity }));
    if (dashed) l.computeLineDistances();
    return l;
  }, [pts, color, opacity, dashed]);
  return <primitive object={line} />;
}

function Curve({ a, b, color = C.blueprint }: { a: V3; b: V3; color?: string }) {
  const line = useMemo(() => {
    const c = new CubicBezierCurve3(new Vector3(...a), new Vector3(a[0] + 0.8, a[1], a[2]), new Vector3(b[0] - 0.8, b[1], b[2]), new Vector3(...b));
    return new Line(new BufferGeometry().setFromPoints(c.getPoints(24)), new LineBasicMaterial({ color, transparent: true, opacity: 0.9 }));
  }, [a, b, color]);
  return <primitive object={line} />;
}

// Mono text label as a camera-facing sprite (paper tag with an ink border, or a filled tone)
function label(text: string, tone: "paper" | "blueprint" | "brass" | "slate" | "clash" = "paper") {
  const font = typeof window !== "undefined" ? getComputedStyle(document.documentElement).getPropertyValue("--font-mono").trim() : "";
  const c = document.createElement("canvas");
  const ctx = c.getContext("2d")!;
  const px = 30;
  const fam = `${px}px ${font || "ui-monospace"}, ui-monospace, monospace`;
  ctx.font = fam;
  const w = Math.ceil(ctx.measureText(text).width) + 36;
  const h = px + 24;
  c.width = w * 2;
  c.height = h * 2;
  ctx.scale(2, 2);
  ctx.font = fam;
  const fill = { paper: "#f6f4ef", blueprint: C.blueprint, brass: C.brass, slate: C.slate, clash: C.clash }[tone];
  ctx.fillStyle = fill;
  ctx.strokeStyle = tone === "paper" ? C.ink : fill;
  ctx.lineWidth = 2;
  ctx.fillRect(1, 1, w - 2, h - 2);
  ctx.strokeRect(1, 1, w - 2, h - 2);
  ctx.fillStyle = tone === "paper" ? C.ink : "#ffffff";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 18, h / 2 + 1);
  const t = new CanvasTexture(c);
  t.anisotropy = 4;
  return { t, aspect: w / h };
}

function Tag({ text, at, from, tone, size = 0.3 }: { text: string; at: V3; from?: V3; tone?: "paper" | "blueprint" | "brass" | "slate" | "clash"; size?: number }) {
  const ref = useRef<Group>(null);
  useLayoutEffect(() => {
    const g = ref.current;
    if (!g) return;
    const { t, aspect } = label(text, tone);
    const s = new Sprite(new SpriteMaterial({ map: t, transparent: true, depthTest: false }));
    s.scale.set(size * aspect, size, 1);
    s.position.set(...at);
    s.renderOrder = 9;
    g.add(s);
    return () => {
      g.remove(s);
    };
  }, [text, at, tone, size]);
  return (
    <group ref={ref}>
      {from && <Wire pts={[from, at]} opacity={0.6} />}
    </group>
  );
}

// Dimension string in 3D: two ticks and a line with a label
function Dim({ a, b, text, up = 0.4 }: { a: V3; b: V3; text: string; up?: number }) {
  const a2: V3 = [a[0], a[1] + up, a[2]];
  const b2: V3 = [b[0], b[1] + up, b[2]];
  const mid: V3 = [(a[0] + b[0]) / 2, a[1] + up + 0.3, (a[2] + b[2]) / 2];
  return (
    <>
      <Wire pts={[a, a2]} opacity={0.5} />
      <Wire pts={[b, b2]} opacity={0.5} />
      <Wire pts={[a2, b2]} opacity={0.8} />
      <Tag text={text} at={mid} size={0.3} />
    </>
  );
}

function Bubble({ text, at }: { text: string; at: V3 }) {
  return (
    <group position={at}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.26, 0.3, 32]} />
        <meshBasicMaterial color={C.ink} transparent opacity={0.7} />
      </mesh>
      <Tag text={text} at={[0, 0.02, 0]} size={0.26} />
    </group>
  );
}

// ---------- the eleven scenes ----------

// P-02: one floor plate being drawn: a 2D plan with grid bubbles, walls rising from it
function Fundamentals() {
  const walls: { at: V3; size: V3 }[] = [
    { at: [-2.2, 0.55, 0], size: [0.18, 1.1, 5] },
    { at: [0, 0.55, -2.4], size: [4.6, 1.1, 0.18] },
    { at: [2.2, 0.35, 0.6], size: [0.18, 0.7, 3.8] },
    { at: [0.2, 0.2, 2.4], size: [4.2, 0.4, 0.18] },
    { at: [-0.6, 0.45, 0], size: [0.14, 0.9, 2.6] },
    { at: [0.8, 0.12, -0.9], size: [2.6, 0.24, 0.14] },
  ];
  const grid: V3[][] = [];
  for (let i = 0; i < 4; i++) grid.push([[-3.2 + i * 2.1, 0.01, -3.4], [-3.2 + i * 2.1, 0.01, 3.4]]);
  for (let j = 0; j < 3; j++) grid.push([[-4.2, 0.01, -2.4 + j * 2.4], [4.2, 0.01, -2.4 + j * 2.4]]);
  return (
    <>
      <Block at={[0, -0.06, 0]} size={[6.2, 0.12, 5.4]} edge={0.7} />
      {grid.map((g, i) => (
        <Wire key={i} pts={g} opacity={0.35} />
      ))}
      {["A", "B", "C", "D"].map((l, i) => (
        <Bubble key={l} text={l} at={[-3.2 + i * 2.1, 0.02, -3.9]} />
      ))}
      {["1", "2", "3"].map((l, j) => (
        <Bubble key={l} text={l} at={[-4.7, 0.02, -2.4 + j * 2.4]} />
      ))}
      {walls.map((w, i) => (
        <Block key={i} at={w.at} size={w.size} />
      ))}
      <Block at={[1.4, 0.55, 2.4]} size={[0.9, 1.1, 0.2]} mat={mats.glass} edge={0.4} />
      <Tag text="LEVEL 1 · PLAN" at={[2.4, 1.7, -2.2]} from={[2.2, 0.7, -2.4]} />
    </>
  );
}

// P-03: facade close-up: curtain wall, mullions, a door and a window family, a section cut through the slab
function Architecture() {
  const mull: React.ReactNode[] = [];
  for (let x = -2.4; x <= 2.4; x += 0.8) mull.push(<Block key={`m${x}`} at={[x, 1.3, 0.06]} size={[0.06, 2.6, 0.08]} mat={mats.ink} edge={0} />);
  for (const y of [0.9, 1.8]) mull.push(<Block key={`t${y}`} at={[0, y, 0.06]} size={[4.9, 0.06, 0.08]} mat={mats.ink} edge={0} />);
  return (
    <>
      <Block at={[0, 1.3, -0.02]} size={[4.9, 2.6, 0.06]} mat={mats.glass} edge={0.3} />
      {mull}
      {/* section cut: the slab and a spandrel, cut face hatched by thin lines */}
      <Block at={[0, 0.0, -0.9]} size={[5.2, 0.2, 1.8]} edge={0.7} />
      <Block at={[0, 2.7, -0.9]} size={[5.2, 0.2, 1.8]} edge={0.7} />
      {Array.from({ length: 10 }, (_, i) => (
        <Wire key={i} pts={[[2.61, -0.1, -1.8 + i * 0.18], [2.61, 0.1, -1.6 + i * 0.18]]} opacity={0.5} />
      ))}
      {/* door family */}
      <Block at={[-1.6, 0.5, 0.14]} size={[0.9, 1.0, 0.04]} mat={mats.paper2} />
      <Block at={[-1.6, 0.5, 0.17]} size={[0.96, 1.06, 0.03]} mat={mats.slate} edge={0} />
      <Block at={[-1.28, 0.5, 0.2]} size={[0.06, 0.06, 0.06]} mat={mats.brass} edge={0} />
      {/* window family with a sill */}
      <Block at={[1.6, 1.45, 0.14]} size={[1.2, 0.8, 0.04]} mat={mats.glass} edge={0.6} />
      <Block at={[1.6, 1.02, 0.16]} size={[1.3, 0.06, 0.16]} mat={mats.paper2} />
      <Tag text="CW-01 · CURTAIN WALL" at={[1.6, 3.1, 0.9]} from={[1.2, 2.3, 0.1]} />
      <Tag text="DR-12 · 900×2100" at={[-1.5, 1.9, 1.1]} from={[-1.6, 1.0, 0.2]} />
    </>
  );
}

// P-04: structural frame close-up: columns, beams, connections and a footing
function Structure() {
  return (
    <>
      <Block at={[0, -0.45, 0]} size={[2.6, 0.5, 2.6]} mat={mats.paper2} edge={0.7} />
      <Block at={[0, -0.1, 0]} size={[0.6, 0.2, 0.6]} mat={mats.paper2} edge={0.7} />
      {[-1.6, 1.6].map((x) => (
        <Block key={x} at={[x, 1.6, 0]} size={[0.28, 3.2, 0.28]} mat={mats.slate} />
      ))}
      <Block at={[0, 1.6, 0]} size={[0.28, 3.2, 0.28]} mat={mats.slate} />
      <Block at={[0, 2.9, 0]} size={[3.5, 0.34, 0.2]} mat={mats.slate} />
      <Block at={[0, 1.5, 0]} size={[3.5, 0.3, 0.2]} mat={mats.slate} />
      <Block at={[0, 2.9, -1.4]} size={[0.2, 0.34, 2.8]} mat={mats.slate} rot={[0, 0, 0]} />
      {/* gusset plates and bolts at the connections */}
      {[-1.6, 0, 1.6].flatMap((x) =>
        [1.5, 2.9].map((y) => (
          <group key={`${x}${y}`}>
            <Block at={[x, y, 0.16]} size={[0.5, 0.5, 0.04]} mat={mats.brass} edge={0.4} />
            {[-0.14, 0.14].flatMap((dx) => [-0.14, 0.14].map((dy) => <Cyl key={`${dx}${dy}`} at={[x + dx, y + dy, 0.2]} r={0.035} h={0.05} mat={mats.ink} rot={[Math.PI / 2, 0, 0]} />))}
          </group>
        )),
      )}
      <Tag text="BEAM B-12 · W14×22" at={[1.4, 3.8, 1.0]} from={[1.0, 3.07, 0.1]} />
      <Tag text="F-3 · 2600×2600" at={[-1.6, 0.7, 1.6]} from={[-1.3, -0.2, 1.3]} />
    </>
  );
}

// P-05: ceiling plenum: ducts in blueprint, pipes in brass, diffusers under the ceiling
function Mep() {
  return (
    <>
      <Block at={[0, 2.0, 0]} size={[6.4, 0.16, 4.6]} edge={0.6} />
      <Block at={[0, 1.4, 0.4]} size={[6.0, 0.4, 0.6]} mat={mats.blueprint} edge={0.35} />
      <Block at={[1.6, 1.4, -0.9]} size={[0.5, 0.36, 2.0]} mat={mats.blueprint} edge={0.35} />
      {[-1.2, -1.5].map((z) => (
        <Cyl key={z} at={[0, 1.15, z]} r={0.07} h={6.0} rot={[0, 0, Math.PI / 2]} />
      ))}
      <Cyl at={[-2.2, 1.15, -1.35]} r={0.07} h={1.0} rot={[Math.PI / 2, 0, 0]} />
      {[-2.2, -0.4, 1.4].map((x) => (
        <group key={x}>
          <Block at={[x, 1.88, 0.4]} size={[0.04, 0.08, 0.04]} mat={mats.slate} edge={0} />
          <Block at={[x, 1.63, 0.4]} size={[0.56, 0.06, 0.76]} mat={mats.slate} edge={0.3} />
        </group>
      ))}
      {[-2.4, 0, 2.4].map((x) => (
        <Block key={x} at={[x, 0.6, 1.6]} size={[0.6, 0.05, 0.6]} mat={mats.paper2} edge={0.6} />
      ))}
      {[-2.4, 0, 2.4].map((x) => (
        <Wire key={x} pts={[[x, 1.2, 0.4], [x, 0.63, 1.6]]} color={C.blueprint} opacity={0.5} />
      ))}
      <Tag text="DUCT-204 · 600×300" at={[1.6, 0.5, 1.9]} from={[1.6, 1.2, 0.7]} tone="blueprint" />
      <Tag text="HW-31 · DN50" at={[-2.0, 0.5, 0.2]} from={[-2.2, 1.1, -1.2]} tone="brass" />
    </>
  );
}

// P-06: cable trays with cable bundles, a rack, cameras and access points. Light and legible.
function LowVoltage() {
  const tray = (z: number) => (
    <group key={z}>
      <Block at={[0, 1.7, z]} size={[6.0, 0.04, 0.5]} mat={mats.slate} edge={0.3} />
      {[-0.23, 0.23].map((dz) => (
        <Block key={dz} at={[0, 1.76, z + dz]} size={[6.0, 0.1, 0.03]} mat={mats.slate} edge={0} />
      ))}
      <Cyl at={[0, 1.78, z - 0.12]} r={0.05} h={5.8} mat={mats.blueprint} rot={[0, 0, Math.PI / 2]} />
      <Cyl at={[0, 1.78, z + 0.02]} r={0.05} h={5.8} mat={mats.brass} rot={[0, 0, Math.PI / 2]} />
      <Cyl at={[0, 1.78, z + 0.14]} r={0.05} h={5.8} mat={mats.ink} rot={[0, 0, Math.PI / 2]} />
    </group>
  );
  return (
    <>
      <Block at={[0, 2.2, 0]} size={[6.6, 0.14, 3.8]} edge={0.5} />
      {tray(0.6)}
      {tray(-0.4)}
      {/* rack */}
      <Block at={[-2.4, 0.9, -1.2]} size={[0.8, 1.8, 0.9]} mat={mats.paper2} edge={0.7} />
      {Array.from({ length: 7 }, (_, i) => (
        <Block key={i} at={[-2.4, 0.25 + i * 0.22, -0.74]} size={[0.68, 0.12, 0.02]} mat={i % 3 === 1 ? mats.blueprint : mats.slate} edge={0} />
      ))}
      {/* cameras */}
      {[1.0, 2.6].map((x) => (
        <group key={x}>
          <Block at={[x, 1.95, 1.5]} size={[0.26, 0.2, 0.3]} mat={mats.paper2} edge={0.6} />
          <Cyl at={[x, 1.95, 1.7]} r={0.07} h={0.12} mat={mats.ink} rot={[Math.PI / 2, 0, 0]} />
        </group>
      ))}
      {/* access points */}
      {[-0.6, 1.8].map((x) => (
        <Cyl key={x} at={[x, 2.1, -1.2]} r={0.22} h={0.06} mat={mats.paper2} />
      ))}
      <Tag text="CT-07 · 300 mm TRAY" at={[1.6, 1.0, 1.7]} from={[1.8, 1.7, 0.85]} />
      <Tag text="RACK R-1 · 42U" at={[-1.8, 2.6, 0.2]} from={[-2.4, 1.8, -0.8]} tone="slate" />
    </>
  );
}

// P-07: exploded parametric family (a light fixture) with dimensions and parameters
function Family() {
  return (
    <>
      <Block at={[0, -0.1, 0]} size={[4.4, 0.08, 2.8]} mat={mats.paper2} edge={0.6} />
      <Block at={[0, 0.5, 0]} size={[2.4, 0.08, 0.6]} mat={mats.paper} />
      <Block at={[0, 1.3, 0]} size={[2.4, 0.18, 0.6]} mat={mats.glass} edge={0.6} />
      <Block at={[0, 2.1, 0]} size={[2.4, 0.16, 0.6]} mat={mats.paper2} edge={0.7} />
      {[-0.9, 0.9].map((x) => (
        <Block key={x} at={[x, 2.75, 0]} size={[0.06, 0.6, 0.06]} mat={mats.slate} edge={0} />
      ))}
      <Block at={[0, 3.1, 0]} size={[2.0, 0.05, 0.3]} mat={mats.slate} edge={0.3} />
      {[0.5, 1.3, 2.1].map((y, i) => (
        <Wire key={i} pts={[[1.3, y, 0], [1.3, y + 0.8, 0]]} opacity={0.3} dashed />
      ))}
      <Dim a={[-1.2, 0.5, 0.5]} b={[1.2, 0.5, 0.5]} text="L = 1200" up={-0.5} />
      <Dim a={[1.2, 0.5, -0.3]} b={[1.2, 0.5, 0.3]} text="W = 600" up={-0.5} />
      <Tag text="H = 85" at={[-2.4, 1.3, 0.6]} from={[-1.2, 1.3, 0.3]} />
      <Tag text="LF-01 · LIGHT FIXTURE" at={[1.6, 2.9, 0.8]} from={[1.2, 2.1, 0.3]} tone="blueprint" />
      <Tag text="TYPE: RECESSED" at={[-1.9, 2.6, 0.3]} />
    </>
  );
}

// P-09: half-built building beside a small Gantt timeline
function Sim() {
  const state = useRef(newState({ mood: 0, lod: 300, sim: 0.58, yaw: -1.3 }));
  const weeks = [
    { y: 0.0, x0: -0.3, w: 1.4, m: mats.slate },
    { y: 0.2, x0: 0.4, w: 1.6, m: mats.slate },
    { y: 0.4, x0: 1.2, w: 1.8, m: mats.blueprint },
    { y: 0.6, x0: 2.0, w: 1.4, m: mats.blueprint },
    { y: 0.8, x0: 2.8, w: 1.2, m: mats.brass },
  ];
  return (
    <>
      <group position={[-2.2, 0, 0]} scale={0.42}>
        <group position={[0, 4.4, 0]}>
          <StudyModel stateRef={state} />
        </group>
      </group>
      <Block at={[2.6, -0.02, 1.2]} size={[4.8, 0.04, 2.0]} mat={mats.paper} edge={0.6} />
      {weeks.map((w, i) => (
        <Block key={i} at={[w.x0 + w.w / 2 + 0.6, 0.06, 1.95 - w.y * 1.6]} size={[w.w, 0.08, 0.16]} mat={w.m} edge={0} />
      ))}
      {Array.from({ length: 7 }, (_, i) => (
        <Wire key={i} pts={[[0.5 + i * 0.75, 0.02, 0.25], [0.5 + i * 0.75, 0.02, 2.15]]} opacity={0.25} />
      ))}
      <Tag text="WEEK 23 · LEVEL 4" at={[0.0, 2.9, 1.8]} from={[-1.2, 2.3, 1.0]} tone="blueprint" />
      <Tag text="SCHEDULE · 40 WEEKS" at={[2.8, 0.9, 2.6]} size={0.3} />
    </>
  );
}

// P-10: a node graph on the left feeding a parametric facade on the right
function Dynamo() {
  const nodes: { at: V3; w: number; t: string }[] = [
    { at: [-4.4, 2.2, 0], w: 1.2, t: "Number Slider" },
    { at: [-4.4, 1.0, 0], w: 1.2, t: "Range" },
    { at: [-2.4, 1.8, 0], w: 1.3, t: "Panel.ByPoints" },
    { at: [-2.4, 0.4, 0], w: 1.3, t: "Rotate" },
    { at: [-0.5, 1.1, 0], w: 1.1, t: "Place Family" },
  ];
  return (
    <>
      {nodes.map((n) => (
        <group key={n.t}>
          <Block at={n.at} size={[n.w, 0.5, 0.08]} mat={mats.paper} edge={0.7} />
          <Block at={[n.at[0], n.at[1] + 0.19, n.at[2] + 0.05]} size={[n.w, 0.1, 0.02]} mat={mats.blueprint} edge={0} />
          <Tag text={n.t} at={[n.at[0], n.at[1] - 0.08, n.at[2] + 0.1]} size={0.22} />
        </group>
      ))}
      <Curve a={[-3.8, 2.2, 0.05]} b={[-3.05, 1.8, 0.05]} />
      <Curve a={[-3.8, 1.0, 0.05]} b={[-3.05, 0.4, 0.05]} />
      <Curve a={[-1.75, 1.8, 0.05]} b={[-1.05, 1.1, 0.05]} />
      <Curve a={[-1.75, 0.4, 0.05]} b={[-1.05, 1.1, 0.05]} />
      <Curve a={[0.05, 1.1, 0.05]} b={[1.1, 1.1, 0.05]} />
      {/* parametric facade: panels rotating progressively */}
      <Block at={[2.9, 1.1, -0.3]} size={[3.6, 2.8, 0.06]} mat={mats.glass} edge={0.3} />
      {Array.from({ length: 6 }, (_, i) =>
        Array.from({ length: 4 }, (_, j) => (
          <Block key={`${i}${j}`} at={[1.4 + i * 0.6, 0.0 + j * 0.7 + 0.1, 0.0]} size={[0.5, 0.6, 0.04]} mat={mats.paper} rot={[0, (i / 5) * 0.9 - 0.45, 0]} edge={0.6} />
        )),
      )}
      <Tag text="ANGLE = 0 .. 45" at={[2.6, 3.0, 0.6]} from={[2.6, 2.5, 0.1]} tone="blueprint" />
    </>
  );
}

// P-11: a model beside a standards panel: CDE folders with status tags
function Iso() {
  const state = useRef(newState({ mood: 0, lod: 200, yaw: -0.6 }));
  const rows = [
    { t: "WIP", tone: "brass" as const },
    { t: "SHARED", tone: "blueprint" as const },
    { t: "PUBLISHED", tone: "slate" as const },
    { t: "ARCHIVE", tone: "paper" as const },
  ];
  return (
    <>
      <group position={[-2.4, 0, 0]} scale={0.36}>
        <group position={[0, 4.4, 0]}>
          <StudyModel stateRef={state} />
        </group>
      </group>
      <Block at={[2.4, 1.6, 0]} size={[3.6, 3.2, 0.1]} mat={mats.paper} edge={0.7} />
      <Block at={[2.4, 3.0, 0.06]} size={[3.6, 0.4, 0.02]} mat={mats.paper2} edge={0} />
      <Tag text="CDE · ISO 19650" at={[2.4, 3.0, 0.1]} size={0.3} />
      {rows.map((r, i) => (
        <group key={r.t}>
          <Block at={[1.2, 2.35 - i * 0.62, 0.08]} size={[0.5, 0.36, 0.04]} mat={mats.paper2} edge={0.6} />
          <Wire pts={[[1.6, 2.35 - i * 0.62, 0.11], [3.9, 2.35 - i * 0.62, 0.11]]} opacity={0.35} />
          <Tag text={r.t} at={[3.3, 2.35 - i * 0.62, 0.14]} tone={r.tone} size={0.26} />
        </group>
      ))}
      <Tag text="S2 · SUITABLE FOR INFORMATION" at={[0.2, 3.7, 0.8]} from={[1.6, 1.73, 0.1]} size={0.26} />
    </>
  );
}

// P-01: the whole building with its systems exposed and three floating tags
function Bootcamp() {
  const state = useRef(newState({ mood: 0, lod: 500, yaw: 0.6 }));
  return (
    <group scale={0.5}>
      <group position={[0, 4.4, 0]}>
        <StudyModel stateRef={state} />
      </group>
    </group>
  );
}

// P-08: inside the beams at the clash, with the ring and a resolved tag
function Clash() {
  const state = useRef(newState({ mood: 0, lod: 350, isolate: "clash", clash: 0.2, yaw: 0.2 }));
  return (
    <>
      <group scale={0.5}>
        <group position={[0, 4.4, 0]}>
          <StudyModel stateRef={state} />
        </group>
      </group>
      <Tag text="CLASH #0147 · DUCT vs BEAM" at={[0.6, 3.8, 2.4]} tone="clash" size={0.3} />
      <Tag text="RESOLVED ✓" at={[1.3, 1.7, 2.7]} tone="blueprint" size={0.3} />
    </>
  );
}

export const SCENES: Record<string, { el: () => React.ReactNode; cam: V3; look: V3; fov?: number; alt: string }> = {
  "vdc-professional-bootcamp": { el: Bootcamp, cam: [7.5, 5.0, 9.0], look: [0, 1.9, 0], alt: "The whole study model with structure, ducts, pipes and trays exposed and three element tags" },
  "bim-fundamentals-revit": { el: Fundamentals, cam: [6.5, 5.2, 7.5], look: [0, 0.4, 0], alt: "A single floor plate drawn as a plan with grid bubbles, walls rising from it" },
  "revit-architecture": { el: Architecture, cam: [4.8, 2.6, 5.6], look: [0, 1.3, 0], alt: "Curtain wall close-up with mullions, a door and a window family, and a section cut through the slab" },
  "revit-structure": { el: Structure, cam: [5.0, 3.4, 5.6], look: [0, 1.5, 0], alt: "Steel frame close-up: columns, beams, gusset plate connections and a footing" },
  "revit-mep": { el: Mep, cam: [5.6, 2.4, 6.2], look: [0, 1.2, 0], alt: "Ceiling plenum with a blueprint duct, brass pipes, hangers and diffusers" },
  "low-voltage-bim": { el: LowVoltage, cam: [5.8, 3.2, 6.0], look: [0, 1.4, 0], alt: "Cable trays with colored cable bundles, a rack, cameras and access points on a light background" },
  "revit-family-creation": { el: Family, cam: [4.6, 3.0, 5.6], look: [0, 1.4, 0], alt: "An exploded light fixture family with dimension strings and parameters" },
  "navisworks-clash-detection": { el: Clash, cam: [4.2, 3.4, 5.4], look: [0, 2.4, 0], alt: "Inside the structure at the clash: a duct meets a beam, a red ring marks it, a resolved tag beside it" },
  "4d-5d-simulation": { el: Sim, cam: [5.4, 3.6, 7.2], look: [0.2, 1.2, 0.6], alt: "The building half built beside a small schedule timeline" },
  "dynamo-for-revit": { el: Dynamo, cam: [-0.4, 2.2, 10.2], look: [-0.9, 1.3, 0], alt: "A node graph with wires feeding a facade whose panels rotate by a parameter" },
  "bim-management-iso-19650": { el: Iso, cam: [4.6, 3.6, 7.0], look: [0.4, 1.6, 0], alt: "The study model beside a standards panel with CDE folders and status tags" },
};

// A standalone canvas for one scene (used by /poster?scene=... and nowhere else)
function Fit({ cam, look, fov }: { cam: V3; look: V3; fov: number }) {
  const camera = useThree((s) => s.camera);
  const pos = useMemo<V3>(() => [look[0] + (cam[0] - look[0]) * 1.12, look[1] + (cam[1] - look[1]) * 1.12, look[2] + (cam[2] - look[2]) * 1.12], [cam, look]);
  useLayoutEffect(() => {
    camera.position.set(...pos);
    camera.lookAt(...look);
    camera.updateProjectionMatrix();
  }, [camera, pos, look]);
  return <PerspectiveCamera makeDefault position={pos} fov={fov} onUpdate={(c) => c.lookAt(...look)} />;
}

export function DisciplineCanvas({ id }: { id: string }) {
  const s = SCENES[id] ?? SCENES["bim-fundamentals-revit"];
  const Scene = s.el;
  return (
    <Canvas dpr={1} gl={{ antialias: true, preserveDrawingBuffer: true, alpha: true }} style={{ position: "fixed", inset: 0 }} onCreated={({ gl }) => gl.setClearColor(new Color(0x000000), 0)}>
      <Fit cam={s.cam} look={s.look} fov={s.fov ?? 28} />
      <ambientLight intensity={0.55} />
      <directionalLight position={[7, 11, 5]} intensity={1.15} color="#fff3e2" />
      <directionalLight position={[-9, 6, -7]} intensity={0.55} color="#d7e8ff" />
      <Environment resolution={128} frames={1}>
        <Lightformer form="rect" intensity={1.6} position={[0, 9, -5]} scale={[20, 6, 1]} color="#ffffff" />
        <Lightformer form="rect" intensity={0.9} position={[-10, 3, 4]} rotation-y={Math.PI / 2} scale={[12, 6, 1]} color="#dfe9f3" />
        <Lightformer form="rect" intensity={0.7} position={[10, 3, 3]} rotation-y={-Math.PI / 2} scale={[12, 6, 1]} color="#fff6ea" />
      </Environment>
      <ContactShadows position={[0, -0.13, 0]} opacity={0.4} scale={24} blur={2.4} far={8} resolution={512} color="#0a1d23" />
      <Scene />
    </Canvas>
  );
}
