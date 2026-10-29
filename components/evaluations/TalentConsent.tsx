"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";
import { evaluations } from "@/content/copy-evaluations";
import { Toggle } from "@/components/ds/Controls";
import { Tag } from "@/components/ds/Chips";
import { Panel } from "@/components/account/AccountShell";
import { LiveStatus, Notice } from "@/components/account/Notice";

const c = evaluations.consent;

// Profile page, students only. The switch saves at once (it is not part of the profile form) and can be turned off any
// time. The database lets only the student change it and stamps the consent time.
export function TalentConsent() {
  const { user, profile, refreshProfile } = useAuth();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const on = Boolean(profile?.talent_visible);

  async function change(next: boolean) {
    const sb = getSupabase();
    if (!sb || !user || busy) return;
    setBusy(true);
    setMsg(null);
    const { error } = await sb.from("profiles").update({ talent_visible: next }).eq("id", user.id);
    if (error) {
      setBusy(false);
      return setMsg({ tone: "error", text: c.failed });
    }
    await refreshProfile();
    setBusy(false);
    setMsg({ tone: "ok", text: next ? c.savedOn : c.savedOff });
  }

  return (
    <Panel id="visibility" label={c.label} className="scroll-mt-24">
      <div className="card p-6 md:p-7" data-testid="talent-consent" data-visible={on ? "on" : "off"}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="mono">{on ? c.on : c.off}</p>
          <Tag tone={on ? "blueprint" : "default"}>{on ? "Visible" : "Hidden"}</Tag>
        </div>
        <p className="t-small mt-4 max-w-[64ch] text-muted">{c.text}</p>
        <div className="mt-5">
          <Toggle checked={on} onChange={(v) => void change(v)} label={c.toggle} />
        </div>
        <p className="mono mt-4 !normal-case">{c.keep}</p>
        <LiveStatus className="mt-2">{busy ? c.saving : ""}</LiveStatus>
        {msg && (
          <div className="mt-3">
            <Notice tone={msg.tone}>{msg.text}</Notice>
          </div>
        )}
      </div>
    </Panel>
  );
}
