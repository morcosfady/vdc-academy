"use client";

import { useLayoutEffect, useMemo, useRef, type MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import {
  BufferGeometry,
  Color,
  EdgesGeometry,
  ExtrudeGeometry,
  Float32BufferAttribute,
  Line,
  LineBasicMaterial,
  LineDashedMaterial,
  Matrix4,
  MeshBasicMaterial,
  MeshStandardMaterial,
  QuadraticBezierCurve3,
  Quaternion,
  Shape,
  Vector3,
  type Group,
  type InstancedMesh,
  type LineSegments,
  type Mesh,
} from "three";
import { gpu } from "@/lib/gpu";
import type { SteppedState } from "@/lib/modelState";

// The v5 study model: a seven storey office building with terraces stepping back on one side, a glazed rounded
// corner, a solid core and roof plant. On paper it is a white architectural model (matte slabs, thin dark mullions,
// mist glass). At night (mood 1) the slabs go dark, the edges become fine mist lines and the systems glow gently.
export const FLOORS = 7;
export const H = 1.1;
const W = 8;
const D = 5.2;
const R = 1.5; // rounded corner radius (the glazed corner)
const SLAB = 0.12;
const ROOF_GEAR = 0.55;
export const TOTAL_H = FLOORS * H + SLAB + ROOF_GEAR;
const CLASH_FLOOR = 2;
// Floor widths: terraces step back 1.2 m per floor on the +x side from the fourth floor up.
const widths = [W, W, W, W - 1.2, W - 2.4, W - 3.6, W - 4.8];
const slabWidth = (level: number) => widths[Math.max(0, level - 1)];

type Box = [number, number, number, number, number, number]; // x y z sx sy sz

// Footprint for a given width with the rounded corner at (-x, +z). Built in shape space (x, -z) and rotated so the
// extrusion runs along +y.
function footprint(w: number, inset = 0) {
  const x0 = -W / 2 + inset;
  const x1 = -W / 2 + w - inset;
  const z0 = -D / 2 + inset; // shape y = -z, so world +z is shape -y
  const z1 = D / 2 - inset;
  const r = R - inset;
  const s = new Shape();
  s.moveTo(x0 + r, -z1);
  s.lineTo(x1, -z1);
  s.lineTo(x1, -z0);
  s.lineTo(x0, -z0);
  s.lineTo(x0, -z1 + r);
  s.absarc(x0 + r, -z1 + r, r, Math.PI, 1.5 * Math.PI, false);
  return s;
}
function extrude(shape: Shape, depth: number) {
  const g = new ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 14 });
  g.rotateX(-Math.PI / 2);
  return g;
}

// Systems inside one floor, laid out inside its width.
function layout(w: number) {
  const x0 = -W / 2 + 0.45;
  const x1 = -W / 2 + w - 0.45;
  const n = Math.max(2, Math.round((x1 - x0) / 2.3) + 1);
  const xs = Array.from({ length: n }, (_, i) => x0 + ((x1 - x0) * i) / (n - 1));
  const zs = [-D / 2 + 0.55, 0.1, D / 2 - 0.55];
  const ceil = H - 0.18;
  const columns: Box[] = xs.flatMap((x) => zs.map((z) => [x, H / 2, z, 0.14, H, 0.14] as Box));
  const beams: Box[] = [
    ...zs.map((z) => [(x0 + x1) / 2, ceil, z, x1 - x0, 0.16, 0.1] as Box),
    ...xs.map((x) => [x, ceil, 0, 0.1, 0.16, zs[2] - zs[0]] as Box),
  ];
  const ducts: Box[] = [[(x0 + x1) / 2, ceil - 0.34, 1.05, x1 - x0 - 0.3, 0.3, 0.42]];
  const pipes: Box[] = [-1.35, -1.55].map((z) => [(x0 + x1) / 2, ceil - 0.46, z, x1 - x0 - 0.3, 0.07, 0.07] as Box);
  const trays: Box[] = [[(x0 + x1) / 2, ceil - 0.6, -0.45, x1 - x0 - 0.3, 0.04, 0.3]];
  const hangers: Box[] = xs.slice(1, -1).flatMap((x) => [[x, ceil - 0.17, 1.05, 0.03, 0.34, 0.03] as Box, [x, ceil - 0.3, -0.45, 0.03, 0.6, 0.03] as Box]);
  return { columns, beams, ducts, pipes, trays, hangers, xs, ceil, x0, x1 };
}

// Mullion lines for one floor: vertical lines on every facade, 0.75 m apart.
function mullions(w: number, y0: number, y1: number) {
  const pts: number[] = [];
  const x0 = -W / 2 + 0.06;
  const x1 = -W / 2 + w - 0.06;
  const z0 = -D / 2 + 0.06;
  const z1 = D / 2 - 0.06;
  const push = (x: number, z: number) => pts.push(x, y0, z, x, y1, z);
  for (let x = x0 + R; x < x1; x += 0.75) push(x, z1); // +z face (after the curve)
  for (let x = x0 + 0.4; x < x1; x += 0.75) push(x, z0); // -z face
  for (let z = z0 + 0.4; z < z1; z += 0.75) push(x1, z); // +x face
  for (let z = z0 + 0.4; z < z1 - R; z += 0.75) push(x0, z); // -x face (before the curve)
  // the curve: a few mullions along the arc
  for (let a = Math.PI; a < 1.5 * Math.PI; a += Math.PI / 8) push(x0 + R - 0.06 + (R - 0.06) * Math.cos(a), z1 - R + 0.06 + (R - 0.06) * -Math.sin(a) * -1);
  const g = new BufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute(pts, 3));
  return g;
}

function Boxes({ items, mat }: { items: Box[]; mat: MeshStandardMaterial }) {
  const ref = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = new Matrix4();
    const q = new Quaternion();
    items.forEach((b, i) => {
      m.compose(new Vector3(b[0], b[1], b[2]), q, new Vector3(b[3], b[4], b[5]));
      ref.current?.setMatrixAt(i, m);
    });
    if (ref.current) ref.current.instanceMatrix.needsUpdate = true;
  }, [items]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, items.length]} material={mat} frustumCulled={false}>
      <boxGeometry />
    </instancedMesh>
  );
}

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const seg = (v: number, a: number, b: number) => clamp((v - a) / (b - a));
const ease = (t: number) => 1 - Math.pow(1 - t, 3);

type Sys = "structure" | "ducts" | "pipes" | "trays" | "hangers";
const SYS: Sys[] = ["structure", "ducts", "pipes", "trays", "hangers"];

// Paper and night colors for every material
const PAL = {
  slab: ["#f2efe8", "#15303a"],
  core: ["#e8e4db", "#0e2229"],
  glass: ["#d6e8f6", "#163247"],
  edge: ["#0a1d23", "#deeffd"],
  mullion: ["#0a1d23", "#deeffd"],
  structure: ["#365b62", "#8fa9b0"],
  ducts: ["#2a63c4", "#7faef0"],
  pipes: ["#b8925a", "#d9b06a"],
  trays: ["#1c3540", "#a3b6bd"],
  hangers: ["#365b62", "#8fa9b0"],
  ghost: ["#e9e5dc", "#0d2028"],
} as const;

export function StudyModel({ stateRef, autoBuild = false, buildSeconds = 2 }: { stateRef: MutableRefObject<SteppedState>; autoBuild?: boolean; buildSeconds?: number }) {
  const colors = useMemo(() => Object.fromEntries(Object.entries(PAL).map(([k, [a, b]]) => [k, [new Color(a), new Color(b)]])) as Record<keyof typeof PAL, [Color, Color]>, []);
  const mats = useMemo(
    () => ({
      slab: new MeshStandardMaterial({ color: PAL.slab[0], roughness: 0.9, metalness: 0 }),
      core: new MeshStandardMaterial({ color: PAL.core[0], roughness: 0.95, metalness: 0 }),
      glass: new MeshStandardMaterial({ color: PAL.glass[0], roughness: 0.18, metalness: 0.05, transparent: true, opacity: 0.32, depthWrite: false, envMapIntensity: 0.8 }),
      structure: new MeshStandardMaterial({ color: PAL.structure[0], roughness: 0.6, transparent: true }),
      ducts: new MeshStandardMaterial({ color: PAL.ducts[0], roughness: 0.5, transparent: true }),
      pipes: new MeshStandardMaterial({ color: PAL.pipes[0], roughness: 0.4, metalness: 0.2, transparent: true }),
      trays: new MeshStandardMaterial({ color: PAL.trays[0], roughness: 0.7, transparent: true }),
      hangers: new MeshStandardMaterial({ color: PAL.hangers[0], roughness: 0.6, transparent: true }),
      clash: new MeshStandardMaterial({ color: "#d9463e", roughness: 0.5, transparent: true }),
      edge: new LineBasicMaterial({ color: PAL.edge[0], transparent: true, opacity: 0.6 }),
      edgeHi: new LineBasicMaterial({ color: "#7faef0", transparent: true, opacity: 1 }),
      mullion: new LineBasicMaterial({ color: PAL.mullion[0], transparent: true, opacity: 0.32 }),
      ring: new MeshBasicMaterial({ color: "#d9463e", transparent: true, opacity: 0, depthTest: false }),
      check: new LineBasicMaterial({ color: "#7faef0", transparent: true, opacity: 0, depthTest: false }),
    }),
    [],
  );

  // Geometry: slabs (levels 0..7), glass volumes (floors 0..6), outlines and mullions
  const geo = useMemo(() => {
    const slabs = Array.from({ length: FLOORS + 1 }, (_, lv) => extrude(footprint(slabWidth(lv)), SLAB));
    const glass = widths.map((w) => extrude(footprint(w, 0.05), H - SLAB));
    const slabEdges = slabs.map((g) => new EdgesGeometry(g, 25));
    const mull = widths.map((w) => mullions(w, SLAB + 0.02, H - 0.02));
    const check = new BufferGeometry().setFromPoints([new Vector3(-0.22, 0, 0), new Vector3(-0.06, -0.16, 0), new Vector3(0.24, 0.16, 0)]);
    return { slabs, glass, slabEdges, mull, check };
  }, []);
  const plan = useMemo(() => widths.map((w) => layout(w)), []);
  const plan0 = plan[CLASH_FLOOR];

  const floors = useRef<Group[]>([]);
  const sysGroups = useRef<Record<Sys, Group[]>>({ structure: [], ducts: [], pipes: [], trays: [], hangers: [] });
  const glassMeshes = useRef<Mesh[]>([]);
  const mullLines = useRef<LineSegments[]>([]);
  const slabLines = useRef<LineSegments[]>([]);
  const clashDuct = useRef<Mesh>(null);
  const ring = useRef<Mesh>(null);
  const checkLine = useRef<Line>(null);
  const dim = useRef<Record<Sys, number>>({ structure: 0, ducts: 0, pipes: 0, trays: 0, hangers: 0 });
  const glassDim = useRef(0);
  const lastCount = useRef(FLOORS);
  const flash = useRef({ floor: -1, at: -10 });
  const tmp = useMemo(() => ({ a: new Color(), b: new Color(), red: new Color("#d9463e"), acc: new Color("#7faef0") }), []);

  const pathLine = useMemo(() => {
    const x = plan0.xs[Math.floor(plan0.xs.length / 2)];
    const z = 1.05;
    const top = plan0.ceil - 0.34;
    const curve = new QuadraticBezierCurve3(new Vector3(x, top, z), new Vector3(x, top - 0.2, z + 0.9), new Vector3(x, top - 0.42, z));
    const line = new Line(new BufferGeometry().setFromPoints(curve.getPoints(28)), new LineDashedMaterial({ color: "#d9b06a", dashSize: 0.1, gapSize: 0.07, transparent: true }));
    line.computeLineDistances();
    line.visible = false;
    return line;
  }, [plan0]);

  useFrame(({ clock, camera }, dt) => {
    const s = stateRef.current;
    if (autoBuild && s.build < 1) s.build = Math.min(1, s.build + dt / buildSeconds);
    const m = clamp(s.mood);
    const k = Math.min(1, dt * 7);
    const iso = s.isolate;

    // Mood: lerp every material between paper and night
    const lerp = (mat: MeshStandardMaterial | LineBasicMaterial, key: keyof typeof PAL, ghost = 0) => {
      tmp.a.copy(colors[key][0]).lerp(colors[key][1], m);
      if (ghost > 0) {
        tmp.b.copy(colors.ghost[0]).lerp(colors.ghost[1], m);
        tmp.a.lerp(tmp.b, ghost);
      }
      mat.color.copy(tmp.a);
    };
    lerp(mats.slab, "slab");
    lerp(mats.core, "core");
    lerp(mats.edge, "edge");
    mats.edge.opacity = 0.6 - 0.1 * m;
    lerp(mats.mullion, "mullion");
    mats.mullion.opacity = 0.32 - 0.08 * m;

    const on: Record<Sys, boolean> = {
      structure: iso === "all" || iso === "structure" || iso === "clash" || iso === "4d",
      ducts: iso === "all" || iso === "mep" || iso === "clash" || iso === "4d",
      pipes: iso === "all" || iso === "mep" || iso === "4d",
      trays: iso === "all" || iso === "lowvoltage" || iso === "4d",
      hangers: iso === "all" || iso === "mep" || iso === "lowvoltage" || iso === "4d",
    };
    const lodOK: Record<Sys, boolean> = { structure: s.lod >= 300, ducts: s.lod >= 300, hangers: s.lod >= 350, pipes: s.lod >= 400, trays: s.lod >= 400 };
    for (const key of SYS) {
      const d = (dim.current[key] += ((on[key] ? 0 : 1) - dim.current[key]) * k);
      const mat = mats[key];
      lerp(mat, key, d);
      mat.opacity = 1 - 0.86 * d;
      mat.emissive.copy(mat.color);
      mat.emissiveIntensity = (0.1 + 0.4 * (key === "ducts" ? 1 : key === "pipes" ? 0.7 : 0.4)) * m * (1 - d);
    }
    // Glass: full on the whole model and architecture, ghosted when a system is isolated
    const gTarget = iso === "all" || iso === "architecture" || iso === "4d" ? 0 : 1;
    const gd = (glassDim.current += (gTarget - glassDim.current) * k);
    lerp(mats.glass, "glass");
    mats.glass.opacity = (0.32 - 0.14 * m) * (1 - 0.75 * gd);
    const showSystems = s.lod >= 300 && iso !== "architecture";

    // 4D: floors appear one by one, with a short edge flash on the newest floor
    const count = s.sim >= 0 ? Math.ceil(s.sim * FLOORS - 1e-6) : FLOORS;
    if (s.sim >= 0 && count > lastCount.current) flash.current = { floor: count - 1, at: clock.elapsedTime };
    lastCount.current = s.sim >= 0 ? count : FLOORS;

    for (let i = 0; i < FLOORS; i++) {
      const f = floors.current[i];
      if (!f) continue;
      const rise = ease(seg(s.build, i * 0.09, i * 0.09 + 0.3));
      const simV = s.sim >= 0 ? clamp(s.sim * FLOORS - i) : 1;
      f.visible = rise > 0.001 && simV > 0.001;
      f.scale.set(1, Math.max(0.001, rise * simV), 1);
      const gm = glassMeshes.current[i];
      if (gm) gm.visible = iso !== "structure" && iso !== "mep" && iso !== "lowvoltage" ? true : true;
      const ml = mullLines.current[i];
      if (ml) ml.visible = s.lod >= 200 && gd < 0.5;
      const sl = slabLines.current[i];
      const hot = s.highlight === i || (flash.current.floor === i && clock.elapsedTime - flash.current.at < 0.5);
      if (sl) sl.material = hot ? mats.edgeHi : mats.edge;
      for (const key of SYS) {
        const g = sysGroups.current[key][i];
        if (!g) continue;
        const a = ease(seg(s.build, 0.55 + i * 0.04, 0.75 + i * 0.04));
        g.visible = showSystems && lodOK[key] && a > 0.001 && !(iso === "clash" && Math.abs(i - CLASH_FLOOR) > 1);
        g.scale.setScalar(0.7 + 0.3 * a);
      }
    }
    // Roof slab and gear follow the top floor
    const roof = floors.current[FLOORS];
    if (roof) {
      const rise = ease(seg(s.build, FLOORS * 0.09, FLOORS * 0.09 + 0.3));
      roof.visible = rise > 0.001 && (s.sim < 0 || s.sim > 0.999);
      roof.scale.set(1, Math.max(0.001, rise), 1);
    }

    // Clash story on one floor: the duct hits a beam, a thin red ring marks it, the duct drops below the beam
    // along a dashed path, the ring turns to a check.
    const r = s.clash < 0 ? 1 : clamp((s.clash - 0.5) / 0.5);
    const open = s.clash >= 0 && s.sim < 0 && s.lod >= 300;
    if (clashDuct.current) {
      clashDuct.current.position.y = plan0.ceil - 0.34 - 0.42 * ease(r) * (s.clash >= 0 ? 1 : 0) + (s.clash < 0 ? -0.42 : 0);
      clashDuct.current.position.z = 1.05 + 0.6 * Math.sin(Math.PI * ease(r)) * (s.clash >= 0 ? 1 : 0);
      tmp.a.copy(colors.ducts[0]).lerp(colors.ducts[1], m);
      mats.clash.color.copy(tmp.red).lerp(tmp.a, s.clash < 0 ? 1 : ease(r));
      mats.clash.emissive.copy(mats.clash.color);
      mats.clash.emissiveIntensity = mats.ducts.emissiveIntensity + (open && r < 1 ? 0.3 : 0);
      mats.clash.opacity = mats.ducts.opacity;
    }
    if (ring.current) {
      ring.current.visible = open;
      if (open) {
        const ph = r < 0.5 ? (clock.elapsedTime * 0.9) % 1 : 0;
        ring.current.scale.setScalar(1 + ph * 0.9);
        mats.ring.opacity = r < 0.5 ? (1 - ph) * 0.95 : 0.9;
        mats.ring.color.copy(tmp.red).lerp(tmp.acc, ease(r));
        ring.current.lookAt(camera.position);
      }
    }
    if (checkLine.current) {
      checkLine.current.visible = open && r > 0.6;
      mats.check.opacity = clamp((r - 0.6) / 0.3);
      if (checkLine.current.visible) checkLine.current.lookAt(camera.position);
    }
    pathLine.visible = s.clash >= 0.5 && s.sim < 0 && s.lod >= 300;
    if (pathLine.visible) pathLine.geometry.setDrawRange(0, Math.max(2, Math.floor(clamp((s.clash - 0.5) / 0.4) * 29)));
  });

  const refSys = (k: Sys, i: number) => (el: Group | null) => {
    if (el) sysGroups.current[k][i] = el;
  };
  const low = gpu.low;
  const clashX = plan0.xs[Math.floor(plan0.xs.length / 2)];

  return (
    <group position={[0, -TOTAL_H / 2, 0]}>
      {/* Core: solid, full height */}
      <mesh position={[-W / 2 + 2.0, (FLOORS * H) / 2, -0.7]} material={mats.core}>
        <boxGeometry args={[1.4, FLOORS * H, 2.0]} />
      </mesh>

      {widths.map((w, i) => (
        <group key={i} position={[0, i * H, 0]} ref={(el) => { if (el) floors.current[i] = el; }}>
          {/* Slab under this floor, with a crisp outline */}
          <mesh geometry={geo.slabs[i]} material={mats.slab} />
          <lineSegments geometry={geo.slabEdges[i]} material={mats.edge} ref={(el) => { if (el) slabLines.current[i] = el; }} />
          {/* Glass volume and mullions */}
          <mesh geometry={geo.glass[i]} material={mats.glass} position={[0, SLAB, 0]} renderOrder={2} ref={(el) => { if (el) glassMeshes.current[i] = el; }} />
          {!low && <lineSegments geometry={geo.mull[i]} material={mats.mullion} ref={(el) => { if (el) mullLines.current[i] = el; }} />}
          {/* Systems */}
          <group ref={refSys("structure", i)}>
            <Boxes items={plan[i].columns} mat={mats.structure} />
            <Boxes items={plan[i].beams} mat={mats.structure} />
          </group>
          <group ref={refSys("ducts", i)}>
            {i === CLASH_FLOOR ? (
              <>
                <mesh ref={clashDuct} position={[(plan0.x0 + plan0.x1) / 2, plan0.ceil - 0.76, 1.05]} material={mats.clash}>
                  <boxGeometry args={[plan0.x1 - plan0.x0 - 0.3, 0.3, 0.42]} />
                </mesh>
                <mesh ref={ring} position={[clashX, plan0.ceil - 0.2, 1.05]} material={mats.ring} renderOrder={6}>
                  <ringGeometry args={[0.42, 0.47, 48]} />
                </mesh>
                <primitive object={new Line(geo.check, mats.check)} ref={checkLine} position={[clashX, plan0.ceil - 0.2, 1.05]} renderOrder={7} />
                <primitive object={pathLine} />
              </>
            ) : (
              <Boxes items={plan[i].ducts} mat={mats.ducts} />
            )}
          </group>
          <group ref={refSys("pipes", i)}><Boxes items={plan[i].pipes} mat={mats.pipes} /></group>
          <group ref={refSys("trays", i)}><Boxes items={plan[i].trays} mat={mats.trays} /></group>
          <group ref={refSys("hangers", i)}><Boxes items={plan[i].hangers} mat={mats.hangers} /></group>
        </group>
      ))}

      {/* Roof slab and plant */}
      <group position={[0, FLOORS * H, 0]} ref={(el) => { if (el) floors.current[FLOORS] = el; }}>
        <mesh geometry={geo.slabs[FLOORS]} material={mats.slab} />
        <lineSegments geometry={geo.slabEdges[FLOORS]} material={mats.edge} />
        <mesh position={[-W / 2 + 1.2, SLAB + 0.3, 0.6]} material={mats.core}>
          <boxGeometry args={[1.3, 0.6, 0.9]} />
        </mesh>
        <mesh position={[-W / 2 + 2.3, SLAB + 0.2, -1.2]} material={mats.core}>
          <boxGeometry args={[0.7, 0.4, 0.7]} />
        </mesh>
        <mesh position={[-W / 2 + 1.0, SLAB + 0.35, -0.5]} material={mats.slab}>
          <boxGeometry args={[0.05, 0.7, 2.2]} />
        </mesh>
      </group>
    </group>
  );
}

// World position of the clash marker (for the close-up camera), before the group's rotation.
export function clashWorld(): [number, number, number] {
  const p = layout(widths[CLASH_FLOOR]);
  return [p.xs[Math.floor(p.xs.length / 2)], CLASH_FLOOR * H + p.ceil - 0.2 - TOTAL_H / 2, 1.05];
}
