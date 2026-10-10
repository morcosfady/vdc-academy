"use client";

import { useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Grid, OrbitControls, PerformanceMonitor } from "@react-three/drei";
import type { Group } from "three";
import { Building, FLOORS, H } from "./Building";
import { FitCamera } from "./FitCamera";
import { newModelState } from "@/lib/modelState";
import { useReduceMotion } from "@/hooks/useReduceMotion";

function Rig({ reduce, children }: { reduce: boolean; children: React.ReactNode }) {
  const g = useRef<Group>(null);
  useFrame(({ pointer }) => {
    if (!g.current || reduce) return;
    g.current.rotation.x += (pointer.y * 0.08 - g.current.rotation.x) * 0.05;
    g.current.rotation.z += (-pointer.x * 0.05 - g.current.rotation.z) * 0.05;
  });
  return <group ref={g}>{children}</group>;
}

// Hero and final CTA scene: the building assembles itself, slow auto-rotation, mouse parallax.
export default function HeroScene({ active, night = false }: { active: boolean; night?: boolean }) {
  const reduce = useReduceMotion();
  const [dpr, setDpr] = useState(1.5);
  const stateRef = useRef(newModelState({ build: 0, wire: 1 }));

  // With reduced motion the building is simply complete.
  if (reduce && stateRef.current.build < 1) stateRef.current = newModelState();

  return (
    <Canvas
      dpr={[1, dpr]}
      frameloop={active ? "always" : "never"}
      camera={{ position: [15.5, 10, 17], fov: 36 }}
      gl={{ antialias: true, alpha: true }}
    >
      <PerformanceMonitor onDecline={() => setDpr(1)} />
      <FitCamera distance={24.6} />
      <ambientLight intensity={night ? 0.35 : 0.7} />
      <hemisphereLight args={["#deeffd", "#0a1d23", night ? 0.4 : 0.8]} />
      <directionalLight position={[8, 14, 6]} intensity={night ? 1.1 : 1.6} />
      <pointLight position={[-6, 3, -6]} color="#5fd0c4" intensity={night ? 40 : 15} />
      <Rig reduce={reduce}>
        <group position={[0, -(FLOORS * H) / 2 + 0.2, 0]}>
          <Building stateRef={stateRef} autoBuild={!reduce} />
          <Grid
            position={[0, -0.34, 0]}
            args={[40, 40]}
            cellColor="#365b62"
            sectionColor="#5fd0c4"
            cellThickness={0.6}
            sectionThickness={1}
            fadeDistance={28}
            infiniteGrid
          />
        </group>
      </Rig>
      <OrbitControls
        enablePan={false}
        enableZoom={false}
        autoRotate={!reduce}
        autoRotateSpeed={0.6}
        minPolarAngle={Math.PI / 3.4}
        maxPolarAngle={Math.PI / 2.1}
      />
    </Canvas>
  );
}
