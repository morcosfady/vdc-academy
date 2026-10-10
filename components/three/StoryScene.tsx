"use client";

import { useState, type MutableRefObject } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Grid, PerformanceMonitor } from "@react-three/drei";
import { Vector3 } from "three";
import { Building, CLASH_POINT, FLOORS, H } from "./Building";
import { zoomForAspect } from "./FitCamera";
import type { ModelState } from "@/lib/modelState";

const BASE = new Vector3(14, 9, 15.5);
const ROT = 0.5; // model rotation about Y
const CENTER = new Vector3(0, FLOORS * H * 0.45, 0);
// World position of the clash after the model rotation, and a side-on camera spot next to it.
const CLASH = new Vector3(...CLASH_POINT).applyAxisAngle(new Vector3(0, 1, 0), ROT);
const CLOSE = CLASH.clone().add(new Vector3(6, -0.1, 7.4));

function CameraRig({ stateRef }: { stateRef: MutableRefObject<ModelState> }) {
  const look = new Vector3();
  const pos = new Vector3();
  useFrame(({ camera, size }) => {
    const f = stateRef.current.focus;
    pos.copy(BASE).multiplyScalar(zoomForAspect(size.width / size.height)).lerp(CLOSE, f);
    look.copy(CENTER).lerp(CLASH, f);
    camera.position.lerp(pos, 0.1);
    camera.lookAt(look);
  });
  return null;
}

// Scene driven by scroll (GSAP) or by buttons. It only reads the shared model state.
export default function StoryScene({ active, stateRef }: { active: boolean; stateRef: MutableRefObject<ModelState> }) {
  const [dpr, setDpr] = useState(1.5);
  return (
    <Canvas
      dpr={[1, dpr]}
      frameloop={active ? "always" : "never"}
      camera={{ position: [11, 7, 12], fov: 36 }}
      gl={{ antialias: true, alpha: true }}
    >
      <PerformanceMonitor onDecline={() => setDpr(1)} />
      <ambientLight intensity={0.7} />
      <hemisphereLight args={["#deeffd", "#0a1d23", 0.8]} />
      <directionalLight position={[8, 14, 6]} intensity={1.6} />
      <pointLight position={[-6, 3, -6]} color="#5fd0c4" intensity={15} />
      <group rotation={[0, ROT, 0]}>
        <Building stateRef={stateRef} />
        <Grid
          position={[0, -0.34, 0]}
          args={[40, 40]}
          cellColor="#365b62"
          sectionColor="#5fd0c4"
          fadeDistance={28}
          infiniteGrid
        />
      </group>
      <CameraRig stateRef={stateRef} />
    </Canvas>
  );
}
