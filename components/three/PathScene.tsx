"use client";

import { useMemo, type MutableRefObject } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Grid } from "@react-three/drei";
import { CatmullRomCurve3, Vector3 } from "three";

export const MILESTONES = 6;

const POINTS = [
  new Vector3(-7, 0, 5),
  new Vector3(-3.5, 0.6, 1),
  new Vector3(0, 1.2, 4),
  new Vector3(3.5, 1.9, 0),
  new Vector3(7, 2.6, -4),
  new Vector3(3, 3.4, -8),
];

function Road({ progress }: { progress: MutableRefObject<number> }) {
  const curve = useMemo(() => new CatmullRomCurve3(POINTS), []);
  const marks = useMemo(() => Array.from({ length: MILESTONES }, (_, i) => curve.getPoint(i / (MILESTONES - 1))), [curve]);
  const look = useMemo(() => new Vector3(), []);

  useFrame(({ camera }) => {
    const t = progress.current;
    const p = curve.getPoint(Math.min(t, 0.97));
    look.copy(curve.getPoint(Math.min(t + 0.06, 1)));
    camera.position.lerp(new Vector3(p.x + 4, p.y + 5, p.z + 9), 0.08);
    camera.lookAt(look);
  });

  return (
    <>
      <mesh>
        <tubeGeometry args={[curve, 120, 0.12, 8, false]} />
        <meshStandardMaterial color="#5fd0c4" emissive="#5fd0c4" emissiveIntensity={0.5} />
      </mesh>
      {marks.map((m, i) => (
        <group key={i} position={m}>
          <mesh position={[0, 0.9, 0]}>
            <boxGeometry args={[0.7, 0.7 + i * 0.35, 0.7]} />
            <meshStandardMaterial color={i === MILESTONES - 1 ? "#ffbc7d" : "#a3bec7"} roughness={0.5} />
          </mesh>
        </group>
      ))}
    </>
  );
}

export default function PathScene({ active, progress }: { active: boolean; progress: MutableRefObject<number> }) {
  return (
    <Canvas
      dpr={[1, 1.5]}
      frameloop={active ? "always" : "never"}
      camera={{ position: [-4, 4, 10], fov: 45 }}
      gl={{ antialias: true, alpha: true }}
    >
      <ambientLight intensity={0.8} />
      <directionalLight position={[6, 10, 6]} intensity={1.5} />
      <Road progress={progress} />
      <Grid
        position={[0, -0.4, 0]}
        args={[60, 60]}
        cellColor="#365b62"
        sectionColor="#5fd0c4"
        fadeDistance={35}
        infiniteGrid
      />
    </Canvas>
  );
}
