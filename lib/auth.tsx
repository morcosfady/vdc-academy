"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { Session, SupabaseClient, User } from "@supabase/supabase-js";
import { authEnabled, getSupabase, loadSupabase } from "./supabase";
import type { Profile, RecruiterProfile } from "./db";
import { isAdmin as adminRole, isRecruiter as recruiterRole, isStudent as studentRole, isSuperAdmin as superRole, roleOf, type Role } from "./roles";

// Session + profile for the whole app. `ready` turns true once the client has checked storage (before that,
// render neutral chrome so server and client HTML match). `enabled` is false without keys and without the mock.
// Role answers come from lib/roles.ts; the database sets the role, the browser only reads it.
type Auth = {
  enabled: boolean;
  ready: boolean;
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  recruiter: RecruiterProfile | null; // the company row, for recruiters
  role: Role;
  isAdmin: boolean; // admin or super admin
  isSuperAdmin: boolean;
  isRecruiter: boolean;
  isStudent: boolean;
  needsOnboarding: boolean; // signed in, profile not complete: /onboarding/ first
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<Auth>({
  enabled: false,
  ready: false,
  session: null,
  user: null,
  profile: null,
  recruiter: null,
  role: "student",
  isAdmin: false,
  isSuperAdmin: false,
  isRecruiter: false,
  isStudent: true,
  needsOnboarding: false,
  refreshProfile: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [enabled, setEnabled] = useState(false);
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [recruiter, setRecruiter] = useState<RecruiterProfile | null>(null);

  const loadProfile = useCallback(async (userId: string | undefined) => {
    const sb = getSupabase();
    if (!sb || !userId) {
      setProfile(null);
      setRecruiter(null);
      return;
    }
    const { data } = await sb.from("profiles").select("*").eq("id", userId).maybeSingle();
    const p = (data as Profile | null) ?? null;
    let r: RecruiterProfile | null = null;
    if (p && (p.account_type === "recruiter" || p.role === "recruiter")) {
      const res = await sb.from("recruiter_profiles").select("*").eq("id", userId).maybeSingle();
      r = (res.data as RecruiterProfile | null) ?? null;
    }
    setProfile(p);
    setRecruiter(r);
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

  const value = useMemo<Auth>(() => {
    const user = session?.user ?? null;
    return {
      enabled,
      ready,
      session,
      user,
      profile,
      recruiter,
      role: roleOf(profile),
      isAdmin: adminRole(profile),
      isSuperAdmin: superRole(profile),
      isRecruiter: recruiterRole(profile),
      isStudent: Boolean(profile) && studentRole(profile),
      needsOnboarding: Boolean(enabled && user && (!profile || !profile.onboarding_complete)),
      refreshProfile: () => loadProfile(session?.user.id),
      signOut: async () => {
        await getSupabase()?.auth.signOut();
        setSession(null);
        setProfile(null);
        setRecruiter(null);
      },
    };
  }, [enabled, ready, session, profile, recruiter, loadProfile]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);

export const onboardingHref = (path: string | null | undefined) => `/onboarding/?next=${encodeURIComponent(path || "/account/")}`;

// Client-side gate for account pages. RLS is the real protection; this only avoids showing empty screens.
// Renders `fallback` (a paper skeleton) until the session is known, then redirects: to /login/ without a session,
// to /onboarding/ while the profile is incomplete (no screen behind this gate shows a half-filled account).
export function RequireAuth({ children, admin = false, fallback = null }: { children: React.ReactNode; admin?: boolean; fallback?: React.ReactNode }) {
  const { enabled, ready, user, profile, isAdmin, needsOnboarding } = useAuth();
  const router = useRouter();
  const path = usePathname();
  useEffect(() => {
    if (!ready) return;
    if (!enabled || !user) router.replace(`/login/?next=${encodeURIComponent(path ?? "/account/")}`);
    else if (needsOnboarding) router.replace(onboardingHref(path));
  }, [ready, enabled, user, needsOnboarding, router, path]);
  if (!ready || !user || needsOnboarding) return <>{fallback}</>;
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
