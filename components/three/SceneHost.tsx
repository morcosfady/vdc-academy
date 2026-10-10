"use client";

import { Canvas } from "@react-three/fiber";
import { AdaptiveDpr, PerformanceMonitor, View } from "@react-three/drei";
import { gpu } from "@/lib/gpu";

// One WebGL context for the whole page. Every <SteppedView> renders into this canvas through drei's View.
export default function SceneHost() {
  return (
    <Canvas
      className="!pointer-events-none"
      style={{ position: "fixed", inset: 0, zIndex: 5 }}
      dpr={[1, 1.5]}
      gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
      onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
    >
      <PerformanceMonitor
        onDecline={() => {
          gpu.low = true;
        }}
      />
      <AdaptiveDpr pixelated />
      <View.Port />
    </Canvas>
  );
}
