"use client";

import { useRef, useState } from "react";
import { MAX_FILE } from "@/lib/applySchema";
import { cn } from "@/lib/utils";

// Drag and drop file picker with type and size checks (5 MB max). Same dashed look as components/ds/Forms.tsx FileDrop.
export function FileUpload({
  label,
  hint,
  accept,
  types,
  file,
  onFile,
  highlight,
}: {
  label: string;
  hint: string;
  accept: string;
  types: string[];
  file: File | null;
  onFile: (f: File | null) => void;
  highlight?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const [over, setOver] = useState(false);

  function take(f: File | undefined) {
    if (!f) return;
    if (!types.includes(f.type)) return setError("That file type is not allowed. " + hint);
    if (f.size > MAX_FILE) return setError("That file is larger than 5 MB.");
    setError("");
    onFile(f);
  }

  const active = over || highlight;

  return (
    <div>
      <p className="mono mb-3">{label}</p>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          take(e.dataTransfer.files[0]);
        }}
        className={cn("flex min-h-28 flex-col items-center justify-center gap-1 rounded-[4px] border border-dashed px-6 py-6 text-center transition-colors duration-200", active ? "border-accent bg-mist/40" : "")}
        style={active ? undefined : { borderColor: "var(--rule)" }}
      >
        {file ? (
          <>
            <p className="text-[15px] font-medium text-text">
              {file.name} <span className="font-normal text-dim">({(file.size / 1024).toFixed(0)} KB)</span>
            </p>
            <button type="button" onClick={() => onFile(null)} className="mono mt-1 min-h-11 hover:!text-text">
              Remove
            </button>
          </>
        ) : (
          <>
            <button type="button" onClick={() => input.current?.click()} className="min-h-11 text-[15px] font-medium text-text hover:text-accent-text">
              Choose a file
            </button>
            <p className="mono">or drop it here · {hint}</p>
          </>
        )}
        <input ref={input} type="file" accept={accept} className="sr-only" tabIndex={-1} onChange={(e) => take(e.target.files?.[0])} aria-label={label} />
      </div>
      {error && (
        <p role="alert" className="mt-2 text-[13px] leading-5 text-err">
          {error}
        </p>
      )}
    </div>
  );
}
