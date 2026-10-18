"use client";

import { useEffect, useState } from "react";

// ?grid=1 shows the 12 column grid over the page, to check that everything lands on a column line.
export function GridOverlay() {
  const [on, setOn] = useState(false);
  useEffect(() => setOn(new URLSearchParams(window.location.search).get("grid") === "1"), []);
  if (!on) return null;
  return (
    <div aria-hidden className="grid-overlay">
      <div className="wrap">
        <div className="grid-12">
          {Array.from({ length: 12 }, (_, i) => (
            <div key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
