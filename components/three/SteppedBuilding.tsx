"use client";

import { useLayoutEffect, useMemo, useRef, type MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import {
  BoxGeometry,
  BufferGeometry,
  Color,
  EdgesGeometry,
  LineBasicMaterial,
  Line,
  LineDashedMaterial,
  Matrix4,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  QuadraticBezierCurve3,
  Quaternion,
  Vector3,
  type Group,
  type InstancedMesh,
  type LineSegments,
  type Mesh,
} from "three";
import { gpu } from "@/lib/gpu";
import type { SteppedState } from "@/lib/modelState";

export const FLOORS = 6;
export const H = 1.3;
export const TOTAL_H = FLOORS * H;

// Each floor is shifted and resized: the stepped silhouette.
const OFFS: [number, number][] = [[0, 0], [0.9, 0.5], [-0.7, 0.9], [0.8, -0.6], [-0.6, -0.7], [0.3, 0.3]];
const SIZE: [number, number][] = [[7.2, 4.8], [6.4, 4.4], [6.0, 4.6], [6.0, 4.2], [5.4, 3.8], [4.4, 3.2]];
const CLASH_FLOOR = 2;

type Box = [number, number, number, number, number, number]; // x y z sx sy sz

function layout(W: number, D: number) {
  const xs = [0, 1, 2, 3].map((i) => -W / 2 + 0.35 + (i * (W - 0.7)) / 3);
  const zs = [0, 1, 2].map((i) => -D / 2 + 0.35 + (i * (D - 0.7)) / 2);
  const dx = (W - 0.7) / 3;
  const dz = (D - 0.7) / 2;
  const columns: Box[] = xs.flatMap((x) => zs.map((z) => [x, H / 2, z, 0.2, H, 0.2] as Box));
  const beams: Box[] = [
    ...zs.flatMap((z) => [0, 1, 2].map((i) => [xs[0] + dx * (i + 0.5), H - 0.13, z, dx, 0.24, 0.16] as Box)),
    ...xs.flatMap((x) => [0, 1].map((i) => [x, H - 0.13, zs[0] + dz * (i + 0.5), 0.16, 0.24, dz] as Box)),
  ];
  const slab: Box[] = [[0, H - 0.03, 0, W - 0.1, 0.08, D - 0.1]];
  const ducts: Box[] = [-1, 1].map((s) => [0, H - 0.56, (s * dz) / 2, W - 0.9, 0.3, 0.5] as Box);
  const pipes: Box[] = [1, 2].flatMap((i) => [0.18, -0.18].map((o) => [xs[i] + o, H - 0.86, 0, 0.1, 0.1, D - 0.9] as Box));
  const trays: Box[] = [-1, 1].map((s) => [0, H - 0.98, (s * dz) / 4, W - 0.9, 0.05, 0.34] as Box);
  const hangers: Box[] = [1, 2].flatMap((i) => [-1, 1].map((s) => [xs[i], H - 0.34, (s * dz) / 2, 0.035, 0.46, 0.035] as Box));
  return { columns, beams, slab, ducts, pipes, trays, hangers, xs, dz };
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

type Sys = "structure" | "slab" | "ducts" | "pipes" | "trays" | "hangers";
const SYS: Sys[] = ["structure", "slab", "ducts", "pipes", "trays", "hangers"];

const DIM = new Color("#0d2329");
const plan0 = layout(SIZE[CLASH_FLOOR][0], SIZE[CLASH_FLOOR][1]);

export function SteppedBuilding({ stateRef, autoBuild = false, buildSeconds = 5 }: { stateRef: MutableRefObject<SteppedState>; autoBuild?: boolean; buildSeconds?: number }) {
  const mats = useMemo(() => {
    const sys = (color: string) => ({ base: new Color(color), mat: new MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.2, emissive: color, emissiveIntensity: 0.35 }) });
    return {
      structure: sys("#93aabd"),
      slab: sys("#2c4a63"),
      ducts: sys("#8cc0f0"),
      pipes: sys("#c9a36a"),
      trays: sys("#6fb1ee"),
      hangers: sys("#93aabd"),
      clash: sys("#e5484d"),
      marker: sys("#e5484d"),
    };
  }, []);

  const glass = useMemo(
    () =>
      new MeshPhysicalMaterial({
        color: "#9fbbd6",
        roughness: 0.08,
        metalness: 0,
        transmission: 1,
        thickness: 0.5,
        ior: 1.4,
        dispersion: 0.35,
        attenuationColor: new Color("#8fb2d8"),
        attenuationDistance: 6,
        envMapIntensity: 0.42,
      }),
    [],
  );
  const glassLow = useMemo(() => new MeshStandardMaterial({ color: "#9cc4ee", transparent: true, opacity: 0.18, roughness: 0.1, depthWrite: false }), []);
  const edge = useMemo(() => new LineBasicMaterial({ color: "#6fb1ee", transparent: true, opacity: 0.8 }), []);
  const edgeHi = useMemo(() => new LineBasicMaterial({ color: "#ffffff", transparent: true, opacity: 1 }), []);

  const plan = useMemo(() => SIZE.map(([W, D]) => ({ ...layout(W, D), W, D })), []);
  const edgeGeos = useMemo(() => SIZE.map(([W, D]) => new EdgesGeometry(new BoxGeometry(W, H - 0.06, D))), []);

  const floors = useRef<Group[]>([]);
  const sysGroups = useRef<Record<Sys, Group[]>>({ structure: [], slab: [], ducts: [], pipes: [], trays: [], hangers: [] });
  const glassMeshes = useRef<Mesh[]>([]);
  const edgeLines = useRef<LineSegments[]>([]);
  const clashDuct = useRef<Mesh>(null);
  const marker = useRef<Mesh>(null);
  const red = useMemo(() => new Color("#e5484d"), []);
  const green = useMemo(() => new Color("#d9b06a"), []);
  const duct = useMemo(() => new Color("#8cc0f0"), []);
  // Smooth ghosting, a one-time pulse on the selected system, 4D floor flash, clash ring and dashed reroute path
  const dimState = useRef<Record<Sys, number>>({ structure: 0, slab: 0, ducts: 0, pipes: 0, trays: 0, hangers: 0 });
  const prevIso = useRef(stateRef.current.isolate);
  const pulseAt = useRef(-10);
  const lastCount = useRef(FLOORS);
  const flash = useRef({ floor: -1, at: -10 });
  const ring = useRef<Mesh>(null);
  const ringMat = useMemo(() => new MeshBasicMaterial({ color: "#e5484d", transparent: true, opacity: 0, depthTest: false }), []);
  const pathLine = useMemo(() => {
    const [x, z] = [plan0.xs[2], plan0.dz / 2];
    const curve = new QuadraticBezierCurve3(new Vector3(x, H - 0.3, z), new Vector3(x, H - 0.45, z + 1.1), new Vector3(x, H - 0.56, z));
    const geo = new BufferGeometry().setFromPoints(curve.getPoints(28));
    const line = new Line(geo, new LineDashedMaterial({ color: "#c9a36a", dashSize: 0.1, gapSize: 0.07, transparent: true }));
    line.computeLineDistances();
    line.visible = false;
    return line;
  }, []);

  useFrame(({ clock, camera }, dt) => {
    const s = stateRef.current;
    if (autoBuild && s.build < 1) s.build = Math.min(1, s.build + dt / buildSeconds);

    const low = gpu.low;
    const iso = s.isolate;
    // Which systems are emphasized (not dimmed) for the isolation
    const on: Record<Sys, boolean> = {
      structure: iso === "all" || iso === "structure" || iso === "clash" || iso === "4d" || iso === "architecture",
      slab: iso === "all" || iso === "structure" || iso === "architecture" || iso === "clash" || iso === "4d",
      ducts: iso === "all" || iso === "mep" || iso === "clash" || iso === "4d",
      pipes: iso === "all" || iso === "mep" || iso === "4d",
      trays: iso === "all" || iso === "lowvoltage" || iso === "4d",
      hangers: iso === "all" || iso === "mep" || iso === "lowvoltage",
    };
    const lodOK: Record<Sys, boolean> = {
      slab: s.lod >= 200,
      structure: s.lod >= 300,
      ducts: s.lod >= 300,
      hangers: s.lod >= 350,
      pipes: s.lod >= 400,
      trays: s.lod >= 400,
    };
    // Materials: emphasized systems glow, others fade to a dark tone (kept opaque so they show through the glass)
    if (prevIso.current !== iso) {
      prevIso.current = iso;
      pulseAt.current = clock.elapsedTime;
    }
    const pulse = Math.max(0, 1 - (clock.elapsedTime - pulseAt.current) / 0.9);
    (SYS as Sys[]).forEach((k) => {
      const m = mats[k];
      const target = on[k] ? 0 : 1;
      const dm = (dimState.current[k] += (target - dimState.current[k]) * Math.min(1, dt * 7));
      m.mat.color.copy(m.base).lerp(DIM, dm);
      m.mat.emissive.copy(m.base).lerp(DIM, dm);
      const base = 0.2 * (1 - dm) + 0.02 * dm + (s.build < 1 ? 0.3 * Math.sin(s.build * Math.PI) * (1 - dm) : 0);
      m.mat.emissiveIntensity = base + (on[k] && iso !== "all" ? pulse * 0.7 : 0);
    });
    const showGlass = iso === "all" || iso === "architecture" || iso === "4d";
    glass.visible = true;
    const gm = low ? glassLow : glass;
    glassLow.opacity = iso === "architecture" ? 0.42 : 0.18;
    edge.opacity += ((iso === "all" || iso === "architecture" || iso === "4d" ? 0.8 : 0.22) - edge.opacity) * Math.min(1, dt * 7);

    const count = s.sim >= 0 ? Math.ceil(s.sim * FLOORS - 1e-6) : FLOORS;
    if (s.sim >= 0 && count > lastCount.current) flash.current = { floor: count - 1, at: clock.elapsedTime };
    lastCount.current = s.sim >= 0 ? count : FLOORS;

    for (let i = 0; i < FLOORS; i++) {
      const f = floors.current[i];
      if (!f) continue;
      const [ox, oz] = OFFS[i];
      const drop = ease(seg(s.build, i * 0.07, i * 0.07 + 0.3));
      const simV = s.sim >= 0 ? clamp(s.sim * FLOORS - i) : 1;
      f.visible = drop > 0.001 && simV > 0.001;
      f.position.set(ox * s.spread, i * H + s.explode * i * 1.5 + (1 - drop) * 9, oz * s.spread);
      f.scale.set(1, Math.max(simV, 0.001), 1);

      const gmesh = glassMeshes.current[i];
      if (gmesh) {
        gmesh.material = gm;
        gmesh.visible = showGlass;
      }
      const line = edgeLines.current[i];
      if (line) line.material = s.highlight === i || (flash.current.floor === i && clock.elapsedTime - flash.current.at < 0.5) ? edgeHi : edge;

      // Systems light up in sequence after the floors land
      const t: Record<Sys, number> = {
        structure: 0.62,
        slab: 0.55,
        ducts: 0.7,
        pipes: 0.78,
        trays: 0.86,
        hangers: 0.8,
      };
      for (const k of SYS) {
        const g = sysGroups.current[k][i];
        if (!g) continue;
        const a = ease(seg(s.build, t[k], t[k] + 0.1));
        g.visible = lodOK[k] && a > 0.001;
        g.scale.setScalar(0.6 + 0.4 * a);
      }
    }

    // Clash story on one floor: duct hits a beam, marker pulses red, duct reroutes, marker turns green.
    const r = s.clash < 0 ? 1 : clamp((s.clash - 0.5) / 0.5);
    if (clashDuct.current) {
      clashDuct.current.position.y = H - 0.3 + (H - 0.56 - (H - 0.3)) * ease(r);
      // the duct travels along the dashed reroute path
      clashDuct.current.position.z = plan0.dz / 2 + 0.5 * Math.sin(Math.PI * ease(r)) * (s.clash >= 0 ? 1 : 0);
      mats.clash.mat.color.copy(red).lerp(duct, ease(r));
      mats.clash.mat.emissive.copy(mats.clash.mat.color);
      mats.clash.mat.emissiveIntensity = s.clash >= 0 && r < 1 ? 0.8 : 0.35;
    }
    if (marker.current) {
      marker.current.visible = s.clash >= 0 && s.sim < 0 && s.lod >= 300;
      mats.marker.mat.color.copy(red).lerp(green, ease(r));
      mats.marker.mat.emissive.copy(mats.marker.mat.color);
      mats.marker.mat.emissiveIntensity = 1;
      const clashPulse = r < 0.5 ? 1 + 0.3 * Math.sin(clock.elapsedTime * 7) : 1;
      marker.current.scale.setScalar(clashPulse * (1 - 0.25 * r));
    }
    // red ring pulses outward while the clash is open
    if (ring.current) {
      const open = s.clash >= 0 && s.sim < 0 && s.lod >= 300 && r < 0.5;
      ring.current.visible = open;
      if (open) {
        const ph = (clock.elapsedTime * 0.9) % 1;
        ring.current.scale.setScalar(1 + ph * 1.4);
        ringMat.opacity = (1 - ph) * 0.9;
        ring.current.lookAt(camera.position);
      }
    }
    // dashed reroute path draws while the duct moves
    pathLine.visible = s.clash >= 0.5 && s.sim < 0 && s.lod >= 300;
    if (pathLine.visible) pathLine.geometry.setDrawRange(0, Math.max(2, Math.floor(clamp((s.clash - 0.5) / 0.4) * 29)));
  });

  const refSys = (k: Sys, i: number) => (el: Group | null) => {
    if (el) sysGroups.current[k][i] = el;
  };

  return (
    <group position={[0, -TOTAL_H / 2, 0]}>
      {plan.map((p, i) => (
        <group key={i} ref={(el) => { if (el) floors.current[i] = el; }}>
          {/* Glass volume with bright edges */}
          <mesh ref={(el) => { if (el) glassMeshes.current[i] = el; }} position={[0, H / 2 - 0.03, 0]}>
            <boxGeometry args={[p.W, H - 0.06, p.D]} />
          </mesh>
          <lineSegments
            ref={(el) => { if (el) edgeLines.current[i] = el; }}
            geometry={edgeGeos[i]}
            material={edge}
            position={[0, H / 2 - 0.03, 0]}
          />

          <group ref={refSys("slab", i)}><Boxes items={p.slab} mat={mats.slab.mat} /></group>
          <group ref={refSys("structure", i)}>
            <Boxes items={p.columns} mat={mats.structure.mat} />
            <Boxes items={p.beams} mat={mats.structure.mat} />
          </group>
          <group ref={refSys("ducts", i)}>
            <Boxes items={i === CLASH_FLOOR ? p.ducts.slice(0, 1) : p.ducts} mat={mats.ducts.mat} />
            {i === CLASH_FLOOR && (
              <>
                <mesh ref={clashDuct} position={[0, H - 0.56, p.dz / 2 + 0.0]} material={mats.clash.mat}>
                  <boxGeometry args={[p.W - 0.9, 0.3, 0.46]} />
                </mesh>
                <mesh ref={marker} position={[p.xs[2], H - 0.3, p.dz / 2]} material={mats.marker.mat}>
                  <sphereGeometry args={[0.42, 24, 24]} />
                </mesh>
                <mesh ref={ring} position={[p.xs[2], H - 0.3, p.dz / 2]} material={ringMat} renderOrder={5}>
                  <ringGeometry args={[0.55, 0.62, 48]} />
                </mesh>
                <primitive object={pathLine} />
              </>
            )}
          </group>
          <group ref={refSys("pipes", i)}><Boxes items={p.pipes} mat={mats.pipes.mat} /></group>
          <group ref={refSys("trays", i)}><Boxes items={p.trays} mat={mats.trays.mat} /></group>
          <group ref={refSys("hangers", i)}><Boxes items={p.hangers} mat={mats.hangers.mat} /></group>
        </group>
      ))}
    </group>
  );
}

// World position of the clash marker (for camera focus), assuming spread = 1 and no explode.
export function clashWorld(): [number, number, number] {
  const [ox, oz] = OFFS[CLASH_FLOOR];
  const p = layout(...SIZE[CLASH_FLOOR]);
  return [ox + p.xs[2], CLASH_FLOOR * H + H - 0.3 - TOTAL_H / 2, oz + p.dz / 2];
}
