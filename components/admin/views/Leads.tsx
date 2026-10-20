"use client";

import { useEffect, useMemo, useState } from "react";
import { Tabs, Toggle } from "@/components/ds/Controls";
import { Input } from "@/components/ds/Forms";
import { Button } from "@/components/ui/Button";
import { adminCopy } from "@/content/copy-admin";
import type { ContactMessage, Lead } from "@/lib/db";
import { AdminShell, useToast } from "../AdminShell";
import { CsvButton } from "../CsvButton";
import { DataTable, type Column } from "../DataTable";
import { TableSkeleton } from "../Skeleton";
import { EmptyState, ErrorState } from "../States";
import { HandledBadge } from "../StatusBadge";
import { fmtDateTime, sb, unwrap, useLoad } from "../util";

const c = adminCopy.leads;
const common = adminCopy.common;
type TabId = "leads" | "messages" | "deletions";
const TABS = c.tabs.map((t) => t.id) as TabId[];
const TABLE: Record<TabId, string> = { leads: "leads", messages: "contact_messages", deletions: "account_deletion_requests" };

type Deletion = { id: string; user_id: string; reason: string | null; handled: boolean; created_at: string; email?: string | null; full_name?: string | null };
type Item = Lead | ContactMessage | Deletion;

async function load(tab: TabId): Promise<Item[]> {
  const s = sb();
  const rows = unwrap<Item[]>(await s.from(TABLE[tab]).select("*").order("created_at", { ascending: false }).limit(500));
  if (tab !== "deletions") return rows;
  // Deletion requests only carry user_id: pull the matching profiles for a name and an email.
  const ids = Array.from(new Set((rows as Deletion[]).map((r) => r.user_id)));
  if (!ids.length) return rows;
  const profiles = unwrap<{ id: string; email: string | null; full_name: string | null }[]>(await s.from("profiles").select("id,email,full_name").in("id", ids));
  const by = new Map(profiles.map((p) => [p.id, p]));
  return (rows as Deletion[]).map((r) => ({ ...r, email: by.get(r.user_id)?.email ?? null, full_name: by.get(r.user_id)?.full_name ?? null }));
}

const nameOf = (r: Item) => ("name" in r ? r.name : r.full_name) ?? "";
const emailOf = (r: Item) => r.email ?? "";

export function Leads() {
  const [tab, setTab] = useState<TabId>("leads");
  const [q, setQ] = useState("");
  const [showHandled, setShowHandled] = useState(false);
  const { toast, node } = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("tab");
    if (t && (TABS as string[]).includes(t)) setTab(t as TabId);
  }, []);

  const data = useLoad(() => load(tab), [tab]);
  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (data.data ?? []).filter((r) => (showHandled || !r.handled) && (!needle || nameOf(r).toLowerCase().includes(needle) || emailOf(r).toLowerCase().includes(needle)));
  }, [data.data, q, showHandled]);

  async function markHandled(r: Item) {
    setBusy(r.id);
    setErr(null);
    try {
      unwrap(await sb().from(TABLE[tab]).update({ handled: true }).eq("id", r.id));
      data.setData((data.data ?? []).map((x) => (x.id === r.id ? { ...x, handled: true } : x)));
      toast(common.saved);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  const handledCol: Column<Item> = {
    key: "state",
    label: c.columns.state,
    render: (r) => (
      <span className="flex flex-wrap items-center gap-3">
        <HandledBadge handled={r.handled} openLabel={c.openItem} handledLabel={c.handled} />
        {!r.handled && (
          <button type="button" onClick={() => markHandled(r)} disabled={busy !== null} className="ul-draw pb-0.5 text-[14px] font-medium text-text hover:text-accent-text disabled:opacity-50" data-testid="mark-handled">
            {busy === r.id ? c.marking : c.markHandled}
          </button>
        )}
      </span>
    ),
  };
  const received: Column<Item> = { key: "received", label: c.columns.received, className: "whitespace-nowrap", render: (r) => fmtDateTime(r.created_at) };
  const email: Column<Item> = { key: "email", label: c.columns.email, render: (r) => (emailOf(r) ? <a href={`mailto:${emailOf(r)}`} className="ul-draw break-all pb-0.5 hover:text-accent-text">{emailOf(r)}</a> : <span className="text-dim">{common.unknown}</span>) };

  const columns: Record<TabId, Column<Item>[]> = {
    leads: [
      { key: "name", label: c.columns.name, primary: true, render: nameOf },
      email,
      { key: "topic", label: c.columns.topic, className: "max-w-[36ch]", render: (r) => ("topic" in r ? r.topic : "") },
      received,
      handledCol,
    ],
    messages: [
      { key: "name", label: c.columns.name, primary: true, render: nameOf },
      email,
      { key: "message", label: c.columns.message, className: "max-w-[44ch]", render: (r) => <span className="line-clamp-3 whitespace-pre-line">{"message" in r ? r.message : ""}</span> },
      received,
      handledCol,
    ],
    deletions: [
      { key: "user", label: c.columns.user, primary: true, render: (r) => nameOf(r) || <span className="mono !text-text">{"user_id" in r ? r.user_id : ""}</span> },
      email,
      { key: "reason", label: c.columns.reason, className: "max-w-[36ch]", render: (r) => ("reason" in r ? r.reason : "") },
      received,
      handledCol,
    ],
  };

  const csvColumns: Record<TabId, { key: string; label: string }[]> = {
    leads: [
      { key: "name", label: "Name" },
      { key: "email", label: "Email" },
      { key: "topic", label: "Topic" },
      { key: "handled", label: "Handled" },
      { key: "created_at", label: "Received" },
    ],
    messages: [
      { key: "name", label: "Name" },
      { key: "email", label: "Email" },
      { key: "message", label: "Message" },
      { key: "handled", label: "Handled" },
      { key: "created_at", label: "Received" },
    ],
    deletions: [
      { key: "full_name", label: "Name" },
      { key: "email", label: "Email" },
      { key: "user_id", label: "User id" },
      { key: "reason", label: "Reason" },
      { key: "handled", label: "Handled" },
      { key: "created_at", label: "Received" },
    ],
  };

  const empty = c.empty[tab];

  return (
    <AdminShell sheet={c.sheet} name={c.name} title={c.title} lead={c.lead} actions={<CsvButton name={tab} columns={csvColumns[tab]} rows={rows as unknown as Record<string, unknown>[]} disabled={data.loading} />}>
      <Tabs tabs={c.tabs.map((t) => ({ id: t.id, label: t.label }))} value={tab} onChange={(id) => setTab(id as TabId)} label={c.tabsLabel} />

      <div className="mt-8 grid gap-x-6 gap-y-4 md:grid-cols-[minmax(0,420px)_1fr] md:items-center">
        <Input label={c.search} type="search" value={q} onChange={(e) => setQ(e.target.value)} autoComplete="off" />
        <div className="flex flex-wrap items-center justify-between gap-4 md:justify-end md:gap-8">
          <Toggle checked={showHandled} onChange={setShowHandled} label={c.showHandled} />
          <p className="mono" aria-live="polite">
            {data.loading ? common.loading : common.rows(rows.length)}
          </p>
        </div>
      </div>

      {tab === "deletions" && <p className="t-small mt-4 text-dim">{c.deletionHint}</p>}
      {err && (
        <p role="alert" className="mt-4 rounded-[4px] border px-4 py-3 text-[15px]" style={{ borderColor: "var(--err)", color: "var(--err)" }}>
          {err}
        </p>
      )}

      <div className="mt-6">
        {data.error ? (
          <ErrorState text={data.error} onRetry={data.reload} />
        ) : data.loading ? (
          <TableSkeleton rows={4} />
        ) : rows.length === 0 ? (
          <EmptyState
            title={empty.title}
            text={empty.text}
            action={
              !showHandled && (data.data?.length ?? 0) > 0 ? (
                <Button variant="secondary" onClick={() => setShowHandled(true)}>
                  {c.showHandled}
                </Button>
              ) : undefined
            }
          />
        ) : (
          <DataTable rows={rows} columns={columns[tab]} rowKey={(r) => r.id} testId="inbox-row" />
        )}
      </div>
      {node}
    </AdminShell>
  );
}
