"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { Session, SupabaseClient, User } from "@supabase/supabase-js";
import { authEnabled, getSupabase, loadSupabase } from "./supabase";
import type { Profile } from "./db";

// Session + profile for the whole app. `ready` turns true once the client has checked storage (before that,
// render neutral chrome so server and client HTML match). `enabled` is false without keys and without the mock.
type Auth = {
  enabled: boolean;
  ready: boolean;
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  isAdmin: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<Auth>({ enabled: false, ready: false, session: null, user: null, profile: null, isAdmin: false, refreshProfile: async () => {}, signOut: async () => {} });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [enabled, setEnabled] = useState(false);
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  const loadProfile = useCallback(async (userId: string | undefined) => {
    const sb = getSupabase();
    if (!sb || !userId) {
      setProfile(null);
      return;
    }
    const { data } = await sb.from("profiles").select("*").eq("id", userId).maybeSingle();
    setProfile((data as Profile | null) ?? null);
  }, []);

  useEffect(() => {
    const on = authEnabled();
    setEnabled(on);
    if (!on) {
      setReady(true);
      return;
    }
    let active = true;
    let unsubscribe = () => {};
    loadSupabase().then((sb) => {
      if (!active) return;
      if (!sb) return setReady(true);
      subscribe(sb);
    });
    const subscribe = (sb: SupabaseClient) => {
      sb.auth.getSession().then(async ({ data }) => {
        if (!active) return;
        setSession(data.session);
        await loadProfile(data.session?.user.id);
        setReady(true);
      });
      const { data: sub } = sb.auth.onAuthStateChange(async (_event, s) => {
        if (!active) return;
        setSession(s);
        await loadProfile(s?.user.id);
        setReady(true);
      });
      unsubscribe = () => sub.subscription.unsubscribe();
    };
    return () => {
      active = false;
      unsubscribe();
    };
  }, [loadProfile]);

  const value = useMemo<Auth>(
    () => ({
      enabled,
      ready,
      session,
      user: session?.user ?? null,
      profile,
      isAdmin: profile?.role === "admin",
      refreshProfile: () => loadProfile(session?.user.id),
      signOut: async () => {
        await getSupabase()?.auth.signOut();
        setSession(null);
        setProfile(null);
      },
    }),
    [enabled, ready, session, profile, loadProfile],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);

// Client-side gate for account pages. RLS is the real protection; this only avoids showing empty screens.
// Renders `fallback` (a paper skeleton) until the session is known, then redirects when it is missing.
export function RequireAuth({ children, admin = false, fallback = null }: { children: React.ReactNode; admin?: boolean; fallback?: React.ReactNode }) {
  const { enabled, ready, user, profile, isAdmin } = useAuth();
  const router = useRouter();
  const path = usePathname();
  useEffect(() => {
    if (!ready) return;
    if (!enabled || !user) router.replace(`/login/?next=${encodeURIComponent(path ?? "/account/")}`);
  }, [ready, enabled, user, router, path]);
  if (!ready || !user) return <>{fallback}</>;
  if (admin && (!profile || !isAdmin)) return <Forbidden />;
  return <>{children}</>;
}

function Forbidden() {
  return (
    <section className="theme-light section pt-[72px]">
      <div className="wrap">
        <p className="mono">AD-403 · ADMIN</p>
        <h1 className="t-h1 mt-6">This area is for the academy team.</h1>
        <p className="t-lead mt-6">Your account does not have admin access. If it should, ask the owner to update your role.</p>
      </div>
    </section>
  );
}
