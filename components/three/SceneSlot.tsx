"use client";

import { useState, type MutableRefObject } from "react";
import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";
import type { SteppedState } from "@/lib/modelState";
import { SteppedPoster } from "./SteppedPoster";
import { useWebGL } from "./useWebGL";

const SteppedView = dynamic(() => import("./SteppedView"), { ssr: false });

// A page region that shows the SVG poster first, then the live 3D building once it is drawing.
export function SceneSlot({
  stateRef,
  className,
  label,
  interactive,
  autoBuild,
  autoRotate,
  buildSeconds,
}: {
  stateRef: MutableRefObject<SteppedState>;
  className?: string;
  label?: string;
  interactive?: boolean;
  autoBuild?: boolean;
  autoRotate?: boolean;
  buildSeconds?: number;
}) {
  const [ready, setReady] = useState(false);
  const webgl = useWebGL();
  return (
    <div className={cn("relative", className)} role="img" aria-label={label}>
      <SteppedPoster
        className={cn("absolute inset-0 h-full w-full transition-opacity duration-1000", ready ? "opacity-0" : "opacity-100")}
      />
      {webgl && (
        <SteppedView
          stateRef={stateRef}
          className="absolute inset-0"
          interactive={interactive}
          autoBuild={autoBuild}
          autoRotate={autoRotate}
          buildSeconds={buildSeconds}
          onReady={() => setReady(true)}
        />
      )}
    </div>
  );
}
