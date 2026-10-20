"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { adminCopy } from "@/content/copy-admin";
import { downloadText, isoDay, toCsv } from "./util";

// Builds the CSV in the browser and downloads it as a Blob. Nothing personal ever goes into a URL.
// `rows` can be a list or a function that fetches the full filtered set when clicked.
export function CsvButton({
  name,
  columns,
  rows,
  className,
  disabled,
}: {
  name: string;
  columns: { key: string; label: string }[];
  rows: Record<string, unknown>[] | (() => Promise<Record<string, unknown>[]>);
  className?: string;
  disabled?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const c = adminCopy.common;
  async function run() {
    setBusy(true);
    try {
      const list = typeof rows === "function" ? await rows() : rows;
      downloadText(`${name}-${isoDay(new Date())}.csv`, toCsv(columns, list));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Button variant="secondary" onClick={run} disabled={disabled || busy} className={className} data-testid="csv-export">
      {busy ? c.exporting : c.exportCsv}
    </Button>
  );
}
