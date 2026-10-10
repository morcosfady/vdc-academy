"use client";

import type { MutableRefObject } from "react";
import { Canvas } from "@react-three/fiber";
import { Grid, OrbitControls } from "@react-three/drei";
import { Building, FLOORS, H } from "./Building";
import { FitCamera } from "./FitCamera";
import type { ModelState } from "@/lib/modelState";

// Interactive model viewer: orbit, zoom, discipline toggles and a section slider (via the shared state).
export default function ViewerScene({ active, stateRef }: { active: boolean; stateRef: MutableRefObject<ModelState> }) {
  return (
    <Canvas
      dpr={[1, 1.5]}
      frameloop={active ? "always" : "never"}
      camera={{ position: [13, 8.5, 14.5], fov: 38 }}
      gl={{ antialias: true, alpha: true }}
    >
      <FitCamera distance={21} />
      <ambientLight intensity={0.7} />
      <hemisphereLight args={["#deeffd", "#0a1d23", 0.8]} />
      <directionalLight position={[8, 14, 6]} intensity={1.6} />
      <group position={[0, -(FLOORS * H) / 2 + 0.2, 0]}>
        <Building stateRef={stateRef} />
        <Grid position={[0, -0.34, 0]} args={[40, 40]} cellColor="#365b62" sectionColor="#5fd0c4" fadeDistance={26} infiniteGrid />
      </group>
      <OrbitControls enablePan={false} minDistance={8} maxDistance={40} maxPolarAngle={Math.PI / 2.05} />
    </Canvas>
  );
}
