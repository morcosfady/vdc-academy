"use client";

import { useEffect } from "react";
import { useThree } from "@react-three/fiber";

// Pulls the camera back on narrow or portrait canvases so the building is never cropped.
export function zoomForAspect(aspect: number) {
  return Math.max(1, 1.35 / aspect);
}

export function FitCamera({ distance }: { distance: number }) {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  useEffect(() => {
    camera.position.setLength(distance * zoomForAspect(size.width / size.height));
  }, [camera, size.width, size.height, distance]);
  return null;
}
