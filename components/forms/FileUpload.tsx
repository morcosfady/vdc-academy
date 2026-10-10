"use client";

import { useRef, useState } from "react";
import { MAX_FILE } from "@/lib/applySchema";
import { cn } from "@/lib/utils";

// Drag and drop file picker with type and size checks (5 MB max).
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

  return (
    <div>
      <p className="meta mb-2">{label}</p>
      <div
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); take(e.dataTransfer.files[0]); }}
        className={cn("flex min-h-[96px] flex-col items-start justify-center gap-2 border border-dashed p-5 transition-colors", over || highlight ? "border-accent bg-accent/10" : "border-border")}
      >
        {file ? (
          <p className="flex flex-wrap items-center gap-4 text-sm">
            <span>{file.name} <span className="text-muted">({(file.size / 1024).toFixed(0)} KB)</span></span>
            <button type="button" onClick={() => onFile(null)} className="meta underline hover:!text-text">Remove</button>
          </p>
        ) : (
          <>
            <button type="button" onClick={() => input.current?.click()} className="text-sm underline underline-offset-4">Choose a file</button>
            <p className="text-sm text-muted">or drop it here. {hint}</p>
          </>
        )}
        <input ref={input} type="file" accept={accept} className="sr-only" tabIndex={-1} onChange={(e) => take(e.target.files?.[0])} aria-label={label} />
      </div>
      {error && <p role="alert" className="mt-1.5 text-sm text-[#ff8a80]">{error}</p>}
    </div>
  );
}
