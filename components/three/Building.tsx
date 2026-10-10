"use client";

import { useLayoutEffect, useMemo, useRef, type MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import {
  Color,
  DoubleSide,
  Matrix4,
  MeshStandardMaterial,
  Quaternion,
  Vector3,
  type Group,
  type InstancedMesh,
  type Mesh,
} from "three";
import type { ModelState } from "@/lib/modelState";

export const FLOORS = 6;
export const H = 1.2;
const XS = [-3.3, -1.1, 1.1, 3.3];
const ZS = [-2.2, 0, 2.2];
const W = 6.6;
const D = 4.4;
export const CLASH_POINT: [number, number, number] = [1.1, 2 * H + H - 0.3, 1.1];

type Box = [number, number, number, number, number, number]; // x y z sx sy sz

const columns: Box[] = XS.flatMap((x) => ZS.map((z) => [x, H / 2, z, 0.24, H, 0.24] as Box));
const beams: Box[] = [
  ...ZS.flatMap((z) => [-2.2, 0, 2.2].map((x) => [x, H - 0.12, z, 2.2, 0.26, 0.2] as Box)),
  ...XS.flatMap((x) => [-1.1, 1.1].map((z) => [x, H - 0.12, z, 0.2, 0.26, 2.2] as Box)),
];
const slab: Box[] = [[0, H - 0.04, 0, W + 0.9, 0.12, D + 0.9]];
const ducts: Box[] = [-1.1, 1.1].map((z) => [0, H - 0.56, z, W, 0.3, 0.55] as Box);
const pipes: Box[] = [-2.2, 0, 2.2].map((x) => [x, H - 0.84, 0, 0.12, 0.12, D] as Box);
const trays: Box[] = [-0.6, 0.6].map((z) => [0, H - 0.97, z, W, 0.05, 0.4] as Box);
const hangers: Box[] = [-2.2, 0, 2.2].flatMap((x) => [-1.1, 1.1].map((z) => [x, H - 0.3, z, 0.04, 0.5, 0.04] as Box));
const glass: Box[] = [
  [0, H / 2, D / 2 + 0.2, W + 0.8, H - 0.14, 0.04],
  [0, H / 2, -D / 2 - 0.2, W + 0.8, H - 0.14, 0.04],
  [W / 2 + 0.2, H / 2, 0, 0.04, H - 0.14, D + 0.8],
  [-W / 2 - 0.2, H / 2, 0, 0.04, H - 0.14, D + 0.8],
];
const mass: Box[] = [[0, H / 2, 0, W + 0.8, H - 0.1, D + 0.8]];

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
    <instancedMesh ref={ref} args={[undefined, undefined, items.length]} material={mat}>
      <boxGeometry />
    </instancedMesh>
  );
}

const clamp = (v: number) => Math.min(1, Math.max(0, v));
const seg = (v: number, a: number, b: number) => clamp((v - a) / (b - a));
const ease = (t: number) => 1 - Math.pow(1 - t, 3);

type CatKey = "structure" | "ducts" | "pipes" | "trays" | "facade" | "hangers" | "mass";
const KEYS: CatKey[] = ["structure", "ducts", "pipes", "trays", "facade", "hangers", "mass"];

export function Building({
  stateRef,
  autoBuild = false,
  buildSeconds = 6,
}: {
  stateRef: MutableRefObject<ModelState>;
  autoBuild?: boolean;
  buildSeconds?: number;
}) {
  const mats = useMemo(() => {
    const mk = (color: string, extra: Record<string, unknown> = {}) =>
      new MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.15, emissive: color, emissiveIntensity: 0, ...extra });
    return {
      structure: mk("#a3bec7"),
      slab: mk("#4a7a83"),
      duct: mk("#7fb7e6"),
      pipe: mk("#ffbc7d"),
      tray: mk("#5fd0c4"),
      glass: mk("#deeffd", { transparent: true, opacity: 0.16, roughness: 0.1, side: DoubleSide, depthWrite: false }),
      mass: mk("#5b8a93", { transparent: true, opacity: 0.85 }),
      clash: mk("#ff3b30"),
      marker: mk("#ff3b30"),
    };
  }, []);

  const floorRefs = useRef<Group[]>([]);
  const subRefs = useRef<Record<CatKey, Group[]>>({
    structure: [],
    ducts: [],
    pipes: [],
    trays: [],
    facade: [],
    hangers: [],
    mass: [],
  });
  const foundation = useRef<Mesh>(null);
  const clashDuct = useRef<Mesh>(null);
  const marker = useRef<Mesh>(null);
  const green = useMemo(() => new Color("#34c759"), []);
  const red = useMemo(() => new Color("#ff3b30"), []);
  const ductColor = useMemo(() => new Color("#7fb7e6"), []);

  useFrame(({ clock }, dt) => {
    const s = stateRef.current;
    if (autoBuild && s.build < 1) {
      s.build = Math.min(1, s.build + dt / buildSeconds);
      s.wire = 1 - ease(seg(s.build, 0.8, 0.97));
    }
    const wire = s.wire > 0.5;
    (Object.values(mats) as MeshStandardMaterial[]).forEach((m) => {
      if (m !== mats.glass) m.wireframe = wire;
      m.emissiveIntensity = m === mats.marker ? 0.8 : s.wire * 0.5;
    });
    if (foundation.current) foundation.current.visible = s.build > 0.02 && s.cats.structure;

    const lod = s.lod;
    const show: Record<CatKey, boolean> = {
      mass: lod < 200,
      structure: lod >= 200 && s.cats.structure,
      ducts: lod >= 300 && s.cats.ducts,
      pipes: lod >= 300 && s.cats.pipes,
      trays: lod >= 350 && s.cats.trays,
      facade: lod >= 400 && s.cats.facade,
      hangers: lod >= 500 && s.cats.ducts,
    };
    const explodeY: Record<CatKey, number> = {
      structure: 0,
      mass: 0,
      ducts: -0.55,
      pipes: -1.1,
      trays: -1.65,
      hangers: -0.55,
      facade: 0.7,
    };

    for (let i = 0; i < FLOORS; i++) {
      const f = floorRefs.current[i];
      if (!f) continue;
      const v = s.sim >= 0 ? clamp(s.sim * FLOORS - i) : 1;
      f.visible = v > 0;
      f.scale.y = Math.max(v, 0.001);
      f.position.y = i * H + s.explode * i * 1.3;

      const k = i / FLOORS;
      const a: Record<CatKey, number> = {
        mass: ease(seg(s.build, 0.08 + 0.45 * k, 0.2 + 0.45 * k)),
        structure: ease(seg(s.build, 0.08 + 0.45 * k, 0.2 + 0.45 * k)),
        ducts: ease(seg(s.build, 0.55 + 0.2 * k, 0.7 + 0.2 * k)),
        pipes: ease(seg(s.build, 0.58 + 0.2 * k, 0.73 + 0.2 * k)),
        trays: ease(seg(s.build, 0.61 + 0.2 * k, 0.76 + 0.2 * k)),
        hangers: ease(seg(s.build, 0.66 + 0.2 * k, 0.8 + 0.2 * k)),
        facade: ease(seg(s.build, 0.82 + 0.1 * k, 0.94 + 0.1 * k)),
      };
      for (const key of KEYS) {
        const g = subRefs.current[key][i];
        if (!g) continue;
        g.visible = show[key] && a[key] > 0.001;
        g.position.y = (1 - a[key]) * 6 + explodeY[key] * s.explode;
      }
    }

    // Clash story on floor 2: duct hits a beam, marker pulses red, duct reroutes, marker turns green.
    const r = s.clash < 0 ? 1 : clamp((s.clash - 0.5) / 0.5);
    if (clashDuct.current) {
      clashDuct.current.position.y = H - 0.3 + (H - 0.56 - (H - 0.3)) * ease(r);
      clashDuct.current.visible = lod >= 300 && s.cats.ducts;
      mats.clash.color.copy(red).lerp(ductColor, ease(r));
      mats.clash.emissive.copy(mats.clash.color);
    }
    if (marker.current) {
      marker.current.visible = s.clash >= 0 && s.sim < 0 && lod >= 300;
      mats.marker.color.copy(red).lerp(green, ease(r));
      mats.marker.emissive.copy(mats.marker.color);
      const pulse = r < 0.5 ? 1 + 0.3 * Math.sin(clock.elapsedTime * 7) : 1;
      marker.current.scale.setScalar(pulse * (1 - 0.3 * r));
    }
  });

  const setRef = (key: CatKey, i: number) => (el: Group | null) => {
    if (el) subRefs.current[key][i] = el;
  };

  return (
    <group>
      <mesh ref={foundation} position={[0, -0.18, 0]} material={mats.slab}>
        <boxGeometry args={[W + 1.6, 0.3, D + 1.6]} />
      </mesh>
      {Array.from({ length: FLOORS }, (_, i) => (
        <group
          key={i}
          ref={(el) => {
            if (el) floorRefs.current[i] = el;
          }}
        >
          <group ref={setRef("mass", i)}>
            <Boxes items={mass} mat={mats.mass} />
          </group>
          <group ref={setRef("structure", i)}>
            <Boxes items={columns} mat={mats.structure} />
            <Boxes items={beams} mat={mats.structure} />
            <Boxes items={slab} mat={mats.slab} />
          </group>
          <group ref={setRef("ducts", i)}>
            <Boxes items={ducts} mat={mats.duct} />
            {i === 2 && (
              <>
                <mesh ref={clashDuct} position={[0, H - 0.56, 1.1]} material={mats.clash}>
                  <boxGeometry args={[W, 0.3, 0.55]} />
                </mesh>
                <mesh ref={marker} position={[1.1, H - 0.3, 1.1]} material={mats.marker}>
                  <sphereGeometry args={[0.46, 24, 24]} />
                </mesh>
              </>
            )}
          </group>
          <group ref={setRef("pipes", i)}>
            <Boxes items={pipes} mat={mats.pipe} />
          </group>
          <group ref={setRef("trays", i)}>
            <Boxes items={trays} mat={mats.tray} />
          </group>
          <group ref={setRef("hangers", i)}>
            <Boxes items={hangers} mat={mats.structure} />
          </group>
          <group ref={setRef("facade", i)}>
            <Boxes items={glass} mat={mats.glass} />
          </group>
        </group>
      ))}
    </group>
  );
}
