"use client";

import { useState, type MutableRefObject } from "react";
import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";
import type { SteppedState } from "@/lib/modelState";
import { SteppedPoster } from "./SteppedPoster";
import { useWebGL } from "./useWebGL";
import { useScenesReady } from "@/lib/scenesReady";

const SteppedView = dynamic(() => import("./SteppedView"), { ssr: false });

// A page region that shows the SVG poster first, then the live 3D building once it is drawing.
export function SceneSlot({
  stateRef,
  className,
  label,
  interactive,
  tilt,
  autoBuild,
  autoRotate,
  buildSeconds,
  rotateSpeed,
  priority,
  fit,
}: {
  stateRef: MutableRefObject<SteppedState>;
  className?: string;
  label?: string;
  interactive?: boolean;
  tilt?: boolean;
  autoBuild?: boolean;
  autoRotate?: boolean;
  buildSeconds?: number;
  rotateSpeed?: number;
  priority?: boolean;
  fit?: number;
}) {
  const [ready, setReady] = useState(false);
  const webgl = useWebGL();
  const scenesReady = useScenesReady();
  return (
    <div className={cn("relative", className)} role="img" aria-label={label}>
      <SteppedPoster
        night={stateRef.current.mood >= 0.5}
        priority={priority}
        className={cn("absolute inset-0 block h-full w-full transition-opacity duration-700", ready ? "opacity-0" : "opacity-100")}
      />
      {webgl && scenesReady && (
        <SteppedView
          stateRef={stateRef}
          className="absolute inset-0"
          interactive={interactive}
          tilt={tilt}
          autoBuild={autoBuild}
          autoRotate={autoRotate}
          buildSeconds={buildSeconds}
          rotateSpeed={rotateSpeed}
          fit={fit}
          onReady={() => setReady(true)}
        />
      )}
    </div>
  );
}
