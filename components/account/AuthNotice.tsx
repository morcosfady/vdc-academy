"use client";

import { LeadForm } from "@/components/forms/LeadForm";
import { account } from "@/content/copy-account";

// Shown on the auth pages when the site has no Supabase keys (and no test mock): an honest notice and the lead form.
export function AuthNotice() {
  const c = account.notice;
  return (
    <div className="rounded-[12px] border p-6 md:p-8" style={{ borderColor: "var(--rule)" }}>
      <p className="mono">Status</p>
      <h2 className="t-h3 mt-3">{c.title}</h2>
      <p className="t-body mt-3 text-muted">{c.lead}</p>
      <div className="mt-7">
        <LeadForm topic={c.topic} button={c.button} />
      </div>
    </div>
  );
}
