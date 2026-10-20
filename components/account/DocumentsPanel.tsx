"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { getSupabase } from "@/lib/supabase";
import type { Application } from "@/lib/db";
import { content, shown } from "@/content/site";
import { account } from "@/content/copy-account";
import { Notice } from "./Notice";
import { extOf } from "./format";
import { cn } from "@/lib/utils";

const c = account.documents;
const MAX = 5 * 1024 * 1024;
const TYPES = ["application/pdf", "image/jpeg", "image/png"];
type Kind = "cv" | "proof";
const col: Record<Kind, "cv_file_path" | "proof_file_path"> = { cv: "cv_file_path", proof: "proof_file_path" };

// CV and graduation proof for the latest application. Upload or replace while it is a draft (bucket `documents`,
// <user_id>/<uuid>.<ext>, saved on the row); read only once submitted, with a way to ask for a replacement.
export function DocumentsPanel({ app, userId, onChange, className }: { app: Application | null; userId: string; onChange: (a: Application) => void; className?: string }) {
  const [busy, setBusy] = useState<Kind | null>(null);
  const [msg, setMsg] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const inputs = { cv: useRef<HTMLInputElement>(null), proof: useRef<HTMLInputElement>(null) };
  const email = shown(content.contact.email);
  const editable = app?.status === "draft";

  async function view(path: string) {
    const sb = getSupabase();
    if (!sb) return;
    const { data, error } = await sb.storage.from("documents").createSignedUrl(path, 120);
    if (error || !data?.signedUrl) return setMsg({ tone: "error", text: c.failed });
    window.open(data.signedUrl, "_blank", "noopener");
  }

  async function upload(kind: Kind, file: File | undefined) {
    const sb = getSupabase();
    if (!file || !app || !sb) return;
    if (!TYPES.includes(file.type)) return setMsg({ tone: "error", text: c.badType });
    if (file.size > MAX) return setMsg({ tone: "error", text: c.tooBig });
    setBusy(kind);
    setMsg(null);
    const path = `${userId}/${crypto.randomUUID()}.${extOf(file)}`;
    const up = await sb.storage.from("documents").upload(path, file, { contentType: file.type, upsert: false });
    if (up.error) {
      setBusy(null);
      return setMsg({ tone: "error", text: c.failed });
    }
    const { error } = await sb.from("applications").update({ [col[kind]]: path }).eq("id", app.id);
    setBusy(null);
    if (error) return setMsg({ tone: "error", text: c.failed });
    onChange({ ...app, [col[kind]]: path });
    setMsg({ tone: "ok", text: c.saved });
  }

  const rows: { kind: Kind; label: string; path: string | null }[] = [
    { kind: "cv", label: c.cv, path: app?.cv_file_path ?? null },
    { kind: "proof", label: c.proof, path: app?.proof_file_path ?? null },
  ];

  return (
    <div className={className}>
      {!app ? (
        <p className="t-small text-muted">
          {c.noApp}{" "}
          <Link prefetch={false} href="/apply/" className="ul-draw pb-0.5 font-medium text-text hover:text-accent-text">
            {account.dashboard.empty.start}
          </Link>
        </p>
      ) : (
        <ul className="border-t" style={{ borderColor: "var(--rule)" }}>
          {rows.map((r) => (
            <li key={r.kind} className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b py-4" style={{ borderColor: "var(--rule)" }}>
              <div className="min-w-0">
                <p className="text-[15px] font-medium text-text">{r.label}</p>
                <p className={cn("mono mt-1", r.path && "!text-text")}>{busy === r.kind ? c.uploading : r.path ? c.uploaded : c.missing}</p>
              </div>
              <div className="flex items-center gap-5">
                {r.path && (
                  <button type="button" onClick={() => view(r.path!)} className="ul-draw pb-0.5 text-[15px] font-medium text-text hover:text-accent-text">
                    {c.view}
                  </button>
                )}
                {editable && (
                  <>
                    <button
                      type="button"
                      disabled={busy !== null}
                      onClick={() => inputs[r.kind].current?.click()}
                      className="inline-flex h-11 items-center rounded-[4px] border px-4 text-[15px] font-medium text-text transition-colors hover:border-accent hover:text-accent-text disabled:opacity-45"
                      style={{ borderColor: "var(--rule)" }}
                    >
                      {r.path ? c.replace : c.upload}
                    </button>
                    <input
                      ref={inputs[r.kind]}
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                      className="sr-only"
                      tabIndex={-1}
                      aria-label={`${r.path ? c.replace : c.upload} ${r.label}`}
                      onChange={(e) => {
                        void upload(r.kind, e.target.files?.[0]);
                        e.target.value = "";
                      }}
                    />
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      {app && editable && <p className="mono mt-3">{c.hint}</p>}
      {app && !editable && (
        <p className="t-small mt-4 text-muted">
          {c.locked}{" "}
          {email ? (
            <a href={`mailto:${email}?subject=${encodeURIComponent(`Replace a document (application ${app.id})`)}`} className="ul-draw pb-0.5 font-medium text-text hover:text-accent-text">
              {c.askReplace}
            </a>
          ) : (
            <Link prefetch={false} href="/contact/" className="ul-draw pb-0.5 font-medium text-text hover:text-accent-text">
              {c.askReplace}
            </Link>
          )}
        </p>
      )}
      <div aria-live="polite" className="mt-4 empty:hidden">
        {msg && (
          <Notice tone={msg.tone} action={msg.tone === "error" ? { label: account.dashboard.retry, onClick: () => setMsg(null) } : undefined}>
            {msg.text}
          </Notice>
        )}
      </div>
    </div>
  );
}
