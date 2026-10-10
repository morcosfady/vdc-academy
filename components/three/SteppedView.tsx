"use client";

import { useRef, type MutableRefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer, PerspectiveCamera, View } from "@react-three/drei";
import { Vector3, type Group } from "three";
import { SteppedBuilding, clashWorld } from "./SteppedBuilding";
import type { SteppedState } from "@/lib/modelState";
import { useReduceMotion } from "@/hooks/useReduceMotion";

type Drag = { down: boolean; x: number; vel: number; yaw: number; px: number; py: number };

const BASE = new Vector3(11.5, 5.2, 14);
const LOOK = new Vector3(0, 0.3, 0);

function Scene({ stateRef, drag, autoBuild, autoRotate, reduce, buildSeconds, onReady }: { stateRef: MutableRefObject<SteppedState>; drag: MutableRefObject<Drag>; autoBuild: boolean; autoRotate: boolean; reduce: boolean; buildSeconds: number; onReady?: () => void }) {
  const g = useRef<Group>(null);
  const frames = useRef(0);
  const size = useThree((s) => s.size);
  const pos = useRef(new Vector3());
  const look = useRef(new Vector3());
  const cw = clashWorld();
  const clashBase = useRef(new Vector3(cw[0], cw[1], cw[2]));
  const clashPos = useRef(new Vector3());
  const clashCam = useRef(new Vector3());
  const up = useRef(new Vector3(0, 1, 0));

  useFrame(({ camera }, dt) => {
    const s = stateRef.current;
    const d = drag.current;
    if (frames.current < 4 && ++frames.current === 4) onReady?.();
    if (!d.down) {
      d.yaw += d.vel;
      d.vel *= 0.94;
      if (autoRotate && !reduce && Math.abs(d.vel) < 0.0005) d.yaw += dt * 0.12;
    }
    if (g.current) {
      g.current.rotation.y = 0.55 + s.yaw + d.yaw;
      g.current.rotation.x += (d.py * 0.05 - g.current.rotation.x) * 0.06;
      g.current.position.y = reduce ? 0 : Math.sin(performance.now() / 1800) * 0.08;
    }
    // The clash point turns with the model, so the close-up camera turns with it.
    const rot = g.current?.rotation.y ?? 0;
    clashPos.current.copy(clashBase.current).applyAxisAngle(up.current, rot);
    clashCam.current.set(2.6, -0.25, 7.2).applyAxisAngle(up.current, rot).add(clashPos.current);
    const aspect = size.width / size.height;
    const zoom = Math.max(1.12, 1.28 / aspect);
    pos.current.copy(BASE).multiplyScalar(zoom).lerp(clashCam.current, s.focus);
    look.current.copy(LOOK).lerp(clashPos.current, s.focus);
    camera.position.lerp(pos.current, 0.12);
    camera.lookAt(look.current);
  });

  return (
    <>
      <ambientLight intensity={0.25} />
      <directionalLight position={[6, 10, 6]} intensity={1.0} />
      <pointLight position={[-8, 3, -6]} color="#6fb1ee" intensity={60} />
      <Environment resolution={256} frames={1}>
        <Lightformer form="rect" intensity={2.6} position={[0, 8, -6]} scale={[24, 5, 1]} />
        <Lightformer form="rect" intensity={1.8} position={[-10, 2, 4]} rotation-y={Math.PI / 2} scale={[14, 6, 1]} color="#6fb1ee" />
        <Lightformer form="rect" intensity={1.2} position={[10, 3, 3]} rotation-y={-Math.PI / 2} scale={[14, 6, 1]} color="#ffffff" />
        <Lightformer form="ring" intensity={2} position={[0, -4, 8]} scale={8} color="#c9a36a" />
      </Environment>
      <group ref={g}>
        <SteppedBuilding stateRef={stateRef} autoBuild={autoBuild} buildSeconds={buildSeconds} />
      </group>
    </>
  );
}

// A region of the page where the stepped building is drawn into the shared canvas.
export default function SteppedView({
  stateRef,
  className,
  interactive = false,
  autoBuild = false,
  autoRotate = true,
  buildSeconds = 5,
  onReady,
}: {
  stateRef: MutableRefObject<SteppedState>;
  className?: string;
  interactive?: boolean;
  autoBuild?: boolean;
  autoRotate?: boolean;
  buildSeconds?: number;
  onReady?: () => void;
}) {
  const reduce = useReduceMotion();
  const drag = useRef<Drag>({ down: false, x: 0, vel: 0, yaw: 0, px: 0, py: 0 });

  // Reduced motion: show the finished building at once.
  if (reduce && stateRef.current.build < 1) stateRef.current.build = 1;

  return (
    <div
      className={className}
      style={{ touchAction: interactive ? "pan-y" : "auto", cursor: interactive ? "grab" : undefined }}
      onPointerDown={(e: React.PointerEvent) => {
        if (!interactive) return;
        drag.current.down = true;
        drag.current.x = e.clientX;
        (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
      }}
      onPointerMove={(e: React.PointerEvent) => {
        const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
        drag.current.py = ((e.clientY - r.top) / r.height - 0.5) * 2;
        if (!interactive || !drag.current.down) return;
        const dx = e.clientX - drag.current.x;
        drag.current.x = e.clientX;
        drag.current.yaw += dx * 0.008;
        drag.current.vel = dx * 0.0016;
      }}
      onPointerUp={() => (drag.current.down = false)}
      onPointerCancel={() => (drag.current.down = false)}
    >
      <View className="absolute inset-0 h-full w-full">
        <PerspectiveCamera makeDefault position={[11.5, 5.2, 14]} fov={30} />
        <Scene stateRef={stateRef} drag={drag} autoBuild={autoBuild} autoRotate={autoRotate} reduce={reduce} buildSeconds={buildSeconds} onReady={onReady} />
      </View>
    </div>
  );
}
