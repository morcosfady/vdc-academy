"use client";

import { useRef, type MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { ContactShadows, Environment, Lightformer, PerspectiveCamera, View } from "@react-three/drei";
import { Vector3, type Group } from "three";
import { StudyModel, TOTAL_H, clashWorld } from "./StudyModel";
import type { SteppedState } from "@/lib/modelState";
import { useReduceMotion } from "@/hooks/useReduceMotion";

type Drag = { down: boolean; x: number; vel: number; yaw: number; tx: number; ty: number };

const BASE = new Vector3(13.6, 8.4, 17.2);
const LOOK = new Vector3(0, -0.4, 0);
const TILT = (8 * Math.PI) / 180;

function Scene({ stateRef, drag, box, fit, autoBuild, autoRotate, rotateSpeed, reduce, buildSeconds, onReady }: { stateRef: MutableRefObject<SteppedState>; drag: MutableRefObject<Drag>; box: React.RefObject<HTMLDivElement | null>; fit: number; autoBuild: boolean; autoRotate: boolean; rotateSpeed: number; reduce: boolean; buildSeconds: number; onReady?: () => void }) {
  const g = useRef<Group>(null);
  const frames = useRef(0);
  const pos = useRef(new Vector3());
  const look = useRef(new Vector3());
  const cw = clashWorld();
  const clashBase = useRef(new Vector3(cw[0], cw[1], cw[2]));
  const clashPos = useRef(new Vector3());
  const clashCam = useRef(new Vector3());
  const up = useRef(new Vector3(0, 1, 0));
  const tilt = useRef({ x: 0, y: 0 });
  const aspect = useRef(1.25);

  useFrame(({ camera }, dt) => {
    const s = stateRef.current;
    const d = drag.current;
    // Camera fit uses this slot's own size (the shared canvas covers the window); measured every 20 frames
    if (frames.current % 20 === 0 && box.current) {
      const r = box.current.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) aspect.current = r.width / r.height;
      box.current.dataset.aspect = aspect.current.toFixed(2);
    }
    frames.current++;
    if (frames.current === 4) onReady?.();
    if (!d.down) {
      d.yaw += d.vel;
      d.vel *= 0.94;
      if (autoRotate && !reduce && Math.abs(d.vel) < 0.0005) d.yaw += dt * rotateSpeed;
    }
    // Mouse tilt: damped toward the pointer, at most 8 degrees each way
    const kt = Math.min(1, dt * 5);
    tilt.current.x += (d.ty * TILT - tilt.current.x) * kt;
    tilt.current.y += (d.tx * TILT - tilt.current.y) * kt;
    if (g.current) {
      g.current.rotation.y = 0.62 + s.yaw + d.yaw + tilt.current.y;
      g.current.rotation.x = tilt.current.x;
    }
    // The clash point turns with the model, so the close-up camera turns with it.
    const rot = g.current?.rotation.y ?? 0;
    clashPos.current.copy(clashBase.current).applyAxisAngle(up.current, rot);
    clashCam.current.set(2.2, 0.1, 5.6).applyAxisAngle(up.current, rot).add(clashPos.current);
    // Fit: the vertical distance fits the height, narrow slots pull back so the width fits too
    const zoom = Math.max(1.0, 1.18 / aspect.current) * fit * (1 - 0.28 * s.dolly);
    pos.current.copy(BASE).multiplyScalar(zoom).lerp(clashCam.current, s.focus);
    look.current.copy(LOOK).lerp(clashPos.current, s.focus);
    camera.position.lerp(pos.current, 0.12);
    camera.lookAt(look.current);
  });

  return (
    <>
      {/* Soft studio: one warm key, one cool rim, a quiet environment. No bloom. */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[7, 11, 5]} intensity={1.15} color="#fff3e2" />
      <directionalLight position={[-9, 6, -7]} intensity={0.55} color="#d7e8ff" />
      <Environment resolution={128} frames={1}>
        <Lightformer form="rect" intensity={1.6} position={[0, 9, -5]} scale={[20, 6, 1]} color="#ffffff" />
        <Lightformer form="rect" intensity={0.9} position={[-10, 3, 4]} rotation-y={Math.PI / 2} scale={[12, 6, 1]} color="#dfe9f3" />
        <Lightformer form="rect" intensity={0.7} position={[10, 3, 3]} rotation-y={-Math.PI / 2} scale={[12, 6, 1]} color="#fff6ea" />
      </Environment>
      <ContactShadows position={[0, -TOTAL_H / 2 - 0.02, 0]} opacity={0.42} scale={22} blur={2.4} far={6} resolution={512} color="#0a1d23" />
      <group ref={g}>
        <StudyModel stateRef={stateRef} autoBuild={autoBuild} buildSeconds={buildSeconds} />
      </group>
    </>
  );
}

// A region of the page where the study model is drawn into the shared canvas.
// `interactive`: drag to rotate with inertia (mouse only). `tilt`: the model leans toward the mouse, at most 8 degrees.
// Both are off for touch pointers (so pages still scroll) and with reduced motion.
export default function SteppedView({
  stateRef,
  className,
  interactive = false,
  tilt = false,
  autoBuild = false,
  autoRotate = true,
  rotateSpeed = 0.1,
  buildSeconds = 2,
  fit = 1,
  onReady,
}: {
  stateRef: MutableRefObject<SteppedState>;
  className?: string;
  interactive?: boolean;
  tilt?: boolean;
  autoBuild?: boolean;
  autoRotate?: boolean;
  rotateSpeed?: number;
  buildSeconds?: number;
  fit?: number; // 1 fits the whole model, below 1 moves in
  onReady?: () => void;
}) {
  const reduce = useReduceMotion();
  const drag = useRef<Drag>({ down: false, x: 0, vel: 0, yaw: 0, tx: 0, ty: 0 });
  const box = useRef<HTMLDivElement>(null);

  // Reduced motion: show the finished building at once, no drag, no tilt.
  if (reduce && stateRef.current.build < 1) stateRef.current.build = 1;
  const canDrag = interactive && !reduce;
  const canTilt = tilt && !reduce;
  const mouse = (e: React.PointerEvent) => e.pointerType === "mouse";

  return (
    <div
      ref={box}
      className={className}
      style={{ touchAction: "pan-y", cursor: canDrag ? "grab" : undefined }}
      onPointerDown={(e: React.PointerEvent) => {
        if (!canDrag || !mouse(e)) return;
        drag.current.down = true;
        drag.current.x = e.clientX;
        drag.current.vel = 0;
        (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
      }}
      onPointerMove={(e: React.PointerEvent) => {
        if (!mouse(e)) return;
        if (canTilt) {
          const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
          drag.current.tx = ((e.clientX - r.left) / r.width - 0.5) * 2;
          drag.current.ty = ((e.clientY - r.top) / r.height - 0.5) * 2;
        }
        if (!canDrag || !drag.current.down) return;
        const dx = e.clientX - drag.current.x;
        drag.current.x = e.clientX;
        drag.current.yaw += dx * 0.008;
        drag.current.vel = dx * 0.0016;
      }}
      onPointerLeave={() => {
        drag.current.tx = 0;
        drag.current.ty = 0;
      }}
      onPointerUp={() => (drag.current.down = false)}
      onPointerCancel={() => (drag.current.down = false)}
    >
      <View className="absolute inset-0 h-full w-full">
        <PerspectiveCamera makeDefault position={[13.6, 8.4, 17.2]} fov={26} />
        <Scene stateRef={stateRef} drag={drag} box={box} fit={fit} autoBuild={autoBuild} autoRotate={autoRotate} rotateSpeed={rotateSpeed} reduce={reduce} buildSeconds={buildSeconds} onReady={onReady} />
      </View>
    </div>
  );
}
