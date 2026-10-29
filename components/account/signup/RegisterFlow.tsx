"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { authCallbackUrl, getSupabase } from "@/lib/supabase";
import { demoOn } from "@/lib/demo/browser";
import { track } from "@/lib/analytics";
import type { CurrentStatus } from "@/lib/db";
import {
  AVAILABILITY, BIO_MAX, BIO_MIN, CAREER_GOALS, COMPANY_SIZES, COMPANY_TYPES, DEGREE_FIELDS, DEGREE_LEVELS, EXPECTED_HIRES, EXPERIENCE, FORMATS, HEARD_FROM, HIRING_ROLES, INDUSTRY_YEARS, INSTRUCTOR_SUBJECTS, MIN_AGE, REVIT_LEVELS, STUDENT_STATUS, TEACHING_YEARS,
  accountSchema, consentSchema, freshGradYear, instructorMeta, instructorSchema, isFreeEmail, labelOf, ownerSchema, recruiterMeta, recruiterSchema, studentMeta, studentSchema, type Opt,
} from "@/lib/signupSchema";
import { Input } from "@/components/ds/Forms";
import { Stepper } from "@/components/ds/Controls";
import { Tag } from "@/components/ds/Chips";
import { Check, TextareaField } from "@/components/forms/Field";
import { Turnstile } from "@/components/forms/Turnstile";
import { Button } from "@/components/ui/Button";
import { account } from "@/content/copy-account";
import { AuthSplit } from "../AuthSplit";
import { AuthNotice } from "../AuthNotice";
import { GoogleButton } from "../GoogleButton";
import { PasswordInput } from "../PasswordInput";
import { LiveStatus, Notice } from "../Notice";
import { FormSkeleton } from "../Skeleton";
import { useNextParam, withNext } from "../useNext";
import { CapIcon, CheckGroup, DateField, OptSelect, PresenterIcon, RoleCards } from "./fields";

const c = account.register;
const o = account.onboarding;
const year = new Date().getFullYear();
const GRAD_YEARS: Opt[] = Array.from({ length: 2026 - 1960 + 1 + 6 }, (_, i) => String(year + 6 - i)).filter((y) => Number(y) >= 1960).map((y) => ({ value: y, label: y }));
const SIGNUP_KEY = "vdc-signup-draft";
const ONBOARD_KEY = "vdc-onboarding-draft";
const RESEND_S = 60;

type Kind = "student" | "instructor" | "recruiter" | "team";
type Step = "role" | "account" | "details" | "review";
type Mode = "signup" | "onboarding";

type V = {
  email: string; password: string; confirm: string;
  full_name: string; phone: string; whatsapp_same: boolean; whatsapp: string; country: string; city: string; date_of_birth: string; current_status: string;
  degree_field: string; degree_level: string; university: string; graduation_year: string; experience_years: string; revit_level: string; career_goal: string;
  preferred_format: string; heard_from: string;
  job_title: string; company_name: string; company_website: string; company_type: string; company_size: string; linkedin_url: string; hiring_roles: string[]; expected_hires: string;
  employer: string; industry_years: string; teaching_years: string; subjects: string[]; teaching_format: string; availability: string; bio: string;
  consent_terms: boolean; consent_contact: boolean; authorised_confirmed: boolean;
};
const EMPTY: V = {
  email: "", password: "", confirm: "",
  full_name: "", phone: "", whatsapp_same: true, whatsapp: "", country: "", city: "", date_of_birth: "", current_status: "",
  degree_field: "", degree_level: "", university: "", graduation_year: "", experience_years: "", revit_level: "", career_goal: "", preferred_format: "", heard_from: "",
  job_title: "", company_name: "", company_website: "", company_type: "", company_size: "", linkedin_url: "", hiring_roles: [], expected_hires: "",
  employer: "", industry_years: "", teaching_years: "", subjects: [], teaching_format: "", availability: "", bio: "",
  consent_terms: false, consent_contact: false, authorised_confirmed: false,
};
const SECRET: (keyof V)[] = ["password", "confirm"];

const label = (k: string) => (c.fields as Record<string, string>)[k] ?? k;
const maxDob = () => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - MIN_AGE);
  return d.toISOString().slice(0, 10);
};

function issues(r: { success: boolean; error?: { issues: { path: PropertyKey[]; message: string }[] } }) {
  const out: Record<string, string> = {};
  if (r.success || !r.error) return out;
  for (const i of r.error.issues) {
    const k = String(i.path[0] ?? "form");
    out[k] ??= i.message;
  }
  return out;
}

function readDraft(key: string): { v: Partial<V>; kind?: Kind; step?: number } | null {
  try {
    const d = JSON.parse(localStorage.getItem(key) ?? "null");
    return d && typeof d === "object" && d.v ? d : null;
  } catch {
    return null;
  }
}
function writeDraft(key: string, v: V, kind: Kind | "", step: number) {
  try {
    const safe: Partial<V> = { ...v };
    for (const k of SECRET) delete safe[k]; // the password never touches storage
    localStorage.setItem(key, JSON.stringify({ v: safe, kind, step }));
  } catch {}
}
const clearDraft = (key: string) => {
  try {
    localStorage.removeItem(key);
  } catch {}
};

// The form shows on /signup (mode "signup", before an account exists) and /onboarding/ (mode "onboarding", for a
// signed-in user whose profile is incomplete). Same steps, same schemas; onboarding skips the account step and
// keeps an account type that is already set.
export function RegisterFlow({ mode }: { mode: Mode }) {
  const { enabled, ready, user, profile, recruiter, instructor, isAdmin, needsOnboarding, refreshProfile } = useAuth();
  const router = useRouter();
  const next = useNextParam();
  const key = mode === "signup" ? SIGNUP_KEY : ONBOARD_KEY;

  const [v, setV] = useState<V>(EMPTY);
  const [kind, setKind] = useState<Kind | "">("");
  const [stepIndex, setStepIndex] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [summary, setSummary] = useState(false);
  const [phase, setPhase] = useState<"form" | "sending" | "sent" | "off">("form");
  const [failure, setFailure] = useState("");
  const [restored, setRestored] = useState(false);
  const [token, setToken] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [resent, setResent] = useState(false);
  const [announce, setAnnounce] = useState("");
  const [loaded, setLoaded] = useState(false);
  const summaryRef = useRef<HTMLDivElement>(null);
  const topRef = useRef<HTMLDivElement>(null); // the step's top: focus lands here when the step changes
  const honeypot = useRef<HTMLInputElement>(null);

  // onboarding: an account type set at sign-up is locked; admins take the short team step
  const lockedKind: Kind | null = mode === "onboarding" ? (isAdmin ? "team" : profile?.account_type === "student" || profile?.account_type === "instructor" || profile?.account_type === "recruiter" ? profile.account_type : null) : null;
  const steps: Step[] = useMemo(() => {
    if (mode === "signup") return ["role", "account", "details", "review"];
    return lockedKind ? ["details", "review"] : ["role", "details", "review"];
  }, [mode, lockedKind]);
  const step = steps[Math.min(stepIndex, steps.length - 1)];
  const effectiveKind: Kind | "" = lockedKind ?? kind;

  // Load: the browser draft (never a password); in onboarding also what the profile already holds.
  useEffect(() => {
    if (!ready || loaded) return;
    if (mode === "onboarding" && !user) return;
    const d = readDraft(key);
    let base: V = { ...EMPTY };
    if (mode === "onboarding" && profile) {
      const p = profile as unknown as Record<string, unknown>;
      const pick = (k: keyof V) => (p[k as string] !== null && p[k as string] !== undefined ? String(p[k as string]) : "");
      base = {
        ...base,
        full_name: pick("full_name") || String(user?.user_metadata?.full_name ?? user?.user_metadata?.name ?? ""),
        phone: pick("phone"), country: pick("country"), city: pick("city"), date_of_birth: pick("date_of_birth"),
        current_status: STUDENT_STATUS.some((x) => x.value === p.current_status) ? String(p.current_status) : "",
        degree_field: pick("degree_field"), degree_level: pick("degree_level"), university: pick("university"), graduation_year: pick("graduation_year"),
        experience_years: pick("experience_years"), revit_level: pick("revit_level"), career_goal: pick("career_goal"), preferred_format: pick("preferred_format"), heard_from: pick("heard_from"),
        whatsapp: pick("whatsapp"), whatsapp_same: !p.whatsapp || p.whatsapp === p.phone,
      };
      if (recruiter) {
        const r = recruiter as unknown as Record<string, unknown>;
        base = { ...base, job_title: String(r.job_title ?? ""), company_name: String(r.company_name ?? ""), company_website: String(r.company_website ?? ""), company_type: String(r.company_type ?? ""), company_size: String(r.company_size ?? ""), linkedin_url: String(r.linkedin_url ?? ""), hiring_roles: (r.hiring_roles as string[]) ?? [], expected_hires: String(r.expected_hires ?? "") };
      }
    }
    if (mode === "onboarding" && instructor) {
      const i = instructor as unknown as Record<string, unknown>;
      base = { ...base, job_title: String(i.job_title ?? ""), employer: String(i.employer ?? ""), industry_years: String(i.industry_years ?? ""), teaching_years: String(i.teaching_years ?? ""), subjects: (i.subjects as string[]) ?? [], teaching_format: String(i.teaching_format ?? ""), availability: String(i.availability ?? ""), linkedin_url: String(i.linkedin_url ?? ""), bio: String(i.bio ?? "") };
    }
    if (d) {
      const merged = { ...base, ...Object.fromEntries(Object.entries(d.v).filter(([, x]) => x !== "" && x !== null && x !== undefined)) } as V;
      setV({ ...merged, password: "", confirm: "" });
      if (d.kind && !lockedKind) setKind(d.kind);
      if (typeof d.step === "number") setStepIndex(Math.max(0, Math.min(d.step, 3)));
      setRestored(Boolean(d.v.full_name || d.v.email || d.kind));
    } else setV(base);
    // /signup/?as=student|instructor|recruiter preselects the role (the demo tour cards use it; recruiter is not offered as a card)
    if (mode === "signup" && !d?.kind) {
      try {
        const as = new URLSearchParams(window.location.search).get("as");
        if (as === "student" || as === "instructor" || as === "recruiter") setKind(as);
      } catch {}
    }
    setLoaded(true);
  }, [ready, loaded, mode, user, profile, recruiter, instructor, key, lockedKind]);

  // Autosave (never the password). Signup also keeps the step so a refresh lands where you were.
  useEffect(() => {
    if (!loaded || phase !== "form") return;
    const t = setTimeout(() => writeDraft(key, v, kind, stepIndex), 400);
    return () => clearTimeout(t);
  }, [v, kind, stepIndex, loaded, phase, key]);

  // Onboarding is done (or not needed): leave.
  useEffect(() => {
    if (mode !== "onboarding" || !ready) return;
    if (!enabled || !user) router.replace(`/login/?next=${encodeURIComponent("/onboarding/")}`);
    else if (!needsOnboarding && phase === "form") router.replace(next ?? (isAdmin ? "/admin/" : "/account/"));
  }, [mode, ready, enabled, user, needsOnboarding, isAdmin, next, router, phase]);

  // Signed in on /signup: nothing to create.
  useEffect(() => {
    if (mode === "signup" && ready && user && phase === "form") router.replace(needsOnboarding ? "/onboarding/" : next ?? "/account/");
  }, [mode, ready, user, needsOnboarding, phase, next, router]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const set = <K extends keyof V>(k: K, value: V[K]) => setV((cur) => ({ ...cur, [k]: value }));

  // ---- validation, one schema per step and role
  const validate = useCallback(
    (s: Step, values: V): Record<string, string> => {
      if (s === "role") return effectiveKind ? {} : { account_type: c.errors.role };
      if (s === "account") return issues(accountSchema.safeParse({ email: values.email, password: values.password, confirm: values.confirm }));
      if (s === "details") {
        if (effectiveKind === "student") return issues(studentSchema.safeParse(values));
        if (effectiveKind === "recruiter") return issues(recruiterSchema.safeParse(values));
        if (effectiveKind === "instructor") return issues(instructorSchema.safeParse(values));
        if (effectiveKind === "team") return issues(ownerSchema.safeParse(values));
        return { account_type: c.errors.role };
      }
      return issues(consentSchema(effectiveKind === "recruiter" || effectiveKind === "instructor" ? effectiveKind : false).safeParse(values));
    },
    [effectiveKind],
  );

  // inline errors after a field is left (and for everything once Continue was pressed)
  useEffect(() => {
    if (!loaded) return;
    const all = validate(step, v);
    setErrors(summary ? all : Object.fromEntries(Object.entries(all).filter(([k]) => touched[k])));
  }, [v, step, touched, summary, validate, loaded]);

  const blur = (k: string) => () => setTouched((t) => ({ ...t, [k]: true }));

  function focusField(name: string) {
    const el = document.querySelector<HTMLElement>(`[name="${name}"]`);
    el?.focus();
    el?.scrollIntoView({ block: "center" });
  }

  function goTo(i: number) {
    setStepIndex(i);
    setSummary(false);
    setTouched({});
    setFailure("");
    const s = steps[i];
    setAnnounce(`Step ${i + 1} of ${steps.length}: ${c.steps[s === "details" && effectiveKind === "team" ? "owner" : s]}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
    // keyboard and screen reader users start the new step at its top (the button they pressed may be far below)
    setTimeout(() => topRef.current?.focus({ preventScroll: true }), 0);
  }

  function attempt(): boolean {
    const all = validate(step, v);
    if (Object.keys(all).length) {
      setErrors(all);
      setSummary(true);
      setTimeout(() => {
        summaryRef.current?.focus();
      }, 0);
      return false;
    }
    return true;
  }

  function onContinue() {
    if (!attempt()) return;
    if (stepIndex < steps.length - 1) goTo(stepIndex + 1);
  }

  // ---- create the account (signup) or finish the profile (onboarding)
  async function submit() {
    if (!attempt()) return;
    for (const s of steps) {
      const e = validate(s, v);
      if (Object.keys(e).length) return goTo(steps.indexOf(s));
    }
    if (honeypot.current?.value) return setPhase("sent"); // a bot: pretend, send nothing
    const sb = getSupabase();
    if (!sb) return setPhase("off"); // accounts are not switched on yet
    setPhase("sending");
    setFailure("");
    const consents = { consent_terms: v.consent_terms, consent_contact: v.consent_contact, authorised_confirmed: v.authorised_confirmed };

    if (mode === "signup") {
      const meta =
        effectiveKind === "student" ? studentMeta(studentSchema.parse(v), consents)
        : effectiveKind === "recruiter" ? recruiterMeta(recruiterSchema.parse(v), consents)
        : effectiveKind === "instructor" ? instructorMeta(instructorSchema.parse(v), consents)
        : { full_name: v.full_name.trim(), first_name: v.full_name.trim().split(/\s+/)[0], phone: v.phone.trim(), team: true, consent_terms: v.consent_terms, consent_contact: v.consent_contact };
      const { data, error } = await sb.auth.signUp({
        email: v.email.trim(),
        password: v.password,
        // a team sign-up comes back to /admin/ (with a grant it is complete; without one the gate sends it to /onboarding/)
        options: { data: meta, emailRedirectTo: authCallbackUrl(next ?? (effectiveKind === "team" ? "/admin/" : undefined)), ...(token ? { captchaToken: token } : {}) },
      });
      if (error) {
        setPhase("form");
        return setFailure(/already|exists|registered/i.test(error.message) ? c.errors.exists : c.errors.generic);
      }
      clearDraft(SIGNUP_KEY);
      track("signup_completed", { status: effectiveKind === "student" ? (v.current_status as CurrentStatus) : null, account_type: effectiveKind || undefined });
      if (data.session) {
        router.replace(next ?? (effectiveKind === "team" ? "/admin/" : "/account/"));
        return;
      }
      setPhase("sent");
      setCooldown(RESEND_S);
      return;
    }

    // onboarding: the company row first (the profile check reads it), then the profile with onboarding_complete
    const uid = user?.id;
    if (!uid) return setPhase("form");
    const now = new Date().toISOString();
    let patch: Record<string, unknown>;
    if (effectiveKind === "team") patch = { full_name: v.full_name.trim(), phone: v.phone.trim() };
    else {
      const meta = effectiveKind === "student" ? studentMeta(studentSchema.parse(v), consents) : effectiveKind === "instructor" ? instructorMeta(instructorSchema.parse(v), consents) : recruiterMeta(recruiterSchema.parse(v), consents);
      if (effectiveKind === "instructor") {
        const r = await sb.from("instructor_profiles").upsert({ id: uid, job_title: meta.job_title, employer: meta.employer, industry_years: meta.industry_years, teaching_years: meta.teaching_years, subjects: meta.subjects, teaching_format: meta.teaching_format, availability: meta.availability, linkedin_url: meta.linkedin_url, bio: meta.bio, info_confirmed: meta.info_confirmed });
        if (r.error) {
          setPhase("form");
          return setFailure(c.errors.save);
        }
      }
      if (effectiveKind === "recruiter") {
        const r = await sb.from("recruiter_profiles").upsert({ id: uid, job_title: meta.job_title, company_name: meta.company_name, company_website: meta.company_website, company_type: meta.company_type, company_size: meta.company_size, linkedin_url: meta.linkedin_url, hiring_roles: meta.hiring_roles, expected_hires: meta.expected_hires, authorised_confirmed: meta.authorised_confirmed });
        if (r.error) {
          setPhase("form");
          return setFailure(c.errors.save);
        }
      }
      const keep = ["full_name", "phone", "whatsapp", "country", "city", "date_of_birth", "current_status", "degree_field", "degree_level", "university", "graduation_year", "experience_years", "revit_level", "career_goal", "preferred_format", "heard_from"];
      patch = Object.fromEntries(Object.entries(meta).filter(([k]) => keep.includes(k)));
      if (!lockedKind) patch.account_type = effectiveKind;
    }
    const res = await sb.from("profiles").update({ ...patch, consent_terms_at: now, consent_contact_at: now, onboarding_complete: true }).eq("id", uid).select("id");
    if (res.error || !res.data?.length) {
      setPhase("form");
      return setFailure(c.errors.save);
    }
    clearDraft(ONBOARD_KEY);
    await refreshProfile();
    setAnnounce(o.done);
    router.replace(next ?? (effectiveKind === "team" ? "/admin/" : "/account/"));
  }

  async function resend() {
    const sb = getSupabase();
    if (!sb || cooldown > 0) return;
    await sb.auth.resend({ type: "signup", email: v.email.trim(), options: { emailRedirectTo: authCallbackUrl(next ?? undefined) } });
    setResent(true);
    setCooldown(RESEND_S);
  }

  function fillSample() {
    const n = String(Math.floor(Math.random() * 900) + 100);
    const k = effectiveKind || "student";
    if (!effectiveKind) setKind("student");
    setV((cur) => ({
      ...cur,
      ...(mode === "signup" ? { email: `${k === "recruiter" ? "recruiter" : k === "instructor" ? "instructor" : "student"}${n}@example.com`, password: "demo-password-1", confirm: "demo-password-1" } : {}),
      full_name: k === "recruiter" ? `Sample Recruiter ${n}` : k === "instructor" ? `Sample Instructor ${n}` : `Sample Student ${n}`,
      phone: "+1 555 010 0100", whatsapp_same: true, country: "USA", city: "Fort Worth", heard_from: "linkedin",
      date_of_birth: "2001-05-14", current_status: "fresh_grad", degree_field: "architecture", degree_level: "bachelor", university: "Sample University", graduation_year: String(year - 1),
      experience_years: "lt1", revit_level: "beginner", career_goal: "bim_coordinator", preferred_format: "online",
      job_title: "Talent lead", company_name: "Sample Company C", company_website: "https://example.com", company_type: "general_contractor", company_size: "51-200",
      linkedin_url: `https://www.linkedin.com/in/sample-${k === "instructor" ? "instructor" : "recruiter"}-${n}`, hiring_roles: ["bim_coordinator", "vdc_engineer"], expected_hires: "2-5",
      employer: "Sample Company C", industry_years: "10-15", teaching_years: "2-5", subjects: ["revit-architecture", "bim-fundamentals-revit"], teaching_format: "either", availability: "evenings",
      bio: "Sample instructor. Ten years of BIM delivery on commercial projects and a few years teaching Revit to new modelers.",
      consent_terms: true, consent_contact: true, authorised_confirmed: k === "recruiter" || k === "instructor",
    }));
  }

  // ---- screens
  const titleKey = step === "details" ? (effectiveKind === "recruiter" ? "recruiter" : effectiveKind === "instructor" ? "instructor" : effectiveKind === "team" ? "owner" : "student") : step;
  const shell = (title: string, lead: string | undefined, body: React.ReactNode) => (
    <AuthSplit sheet={mode === "signup" ? c.sheet : o.sheet} name={mode === "signup" ? c.name : o.name} title={title} lead={lead} panelLabel={`Student sheet · ${mode === "signup" ? c.sheet : o.sheet}`}>
      {body}
    </AuthSplit>
  );

  if (!ready || !loaded) return shell(mode === "signup" ? c.titles.role : o.title, undefined, <FormSkeleton />);
  if (!enabled && mode === "onboarding") return shell(c.titles.role, c.leads.role, <AuthNotice />);
  if (phase === "off") return shell(c.titles.role, c.leads.role, <AuthNotice onBack={() => setPhase("form")} />);

  if (phase === "sent")
    return shell(
      c.check.title,
      c.check.lead(v.email.trim()),
      <div className="grid gap-6" data-testid="check-email">
        {effectiveKind === "recruiter" && <Notice tone="info">{c.check.recruiter}</Notice>}
        {effectiveKind === "instructor" && <Notice tone="info">{c.check.instructor}</Notice>}
        {effectiveKind === "team" && <p className="t-small text-dim">{c.check.team}</p>}
        <div className="flex flex-wrap items-center gap-6">
          <Button type="button" variant="secondary" onClick={resend} disabled={cooldown > 0}>
            {c.check.resend}
          </Button>
          <Link prefetch={false} href={withNext("/login/", next)} className="ul-draw pb-1 text-[15px] font-medium text-text hover:text-accent-text">
            {c.check.back}
          </Link>
        </div>
        <LiveStatus>{cooldown > 0 ? (resent ? `${c.check.resent} ${c.check.wait(cooldown)}` : c.check.wait(cooldown)) : ""}</LiveStatus>
      </div>,
    );

  const errorList = Object.entries(errors);
  const kindName = effectiveKind === "team" ? c.team : effectiveKind ? c.cards[effectiveKind].title : "";
  const e = (k: string) => errors[k];
  const field = (k: keyof V, extra: Partial<React.ComponentProps<typeof Input>> = {}) => (
    <Input label={`${label(k)} *`} name={k} value={String(v[k] ?? "")} onChange={(ev) => set(k, ev.target.value as never)} onBlur={blur(k)} error={e(k)} required {...extra} />
  );
  const select = (k: keyof V, options: Opt[]) => <OptSelect label={`${label(k)} *`} name={k} options={options} value={String(v[k] ?? "")} onChange={(x) => set(k, x as never)} onBlur={blur(k)} error={e(k)} placeholder={c.choose} />;

  const body = (
    <form
      noValidate
      className="grid gap-8"
      onSubmit={(ev) => {
        ev.preventDefault();
        if (phase === "sending") return;
        if (step === "review") void submit();
        else onContinue();
      }}
    >
      {!enabled && <Notice tone="info">{account.notice.banner}</Notice>}
      <div ref={topRef} tabIndex={-1} className="outline-none">
        <Stepper step={stepIndex + 1} total={steps.length} labels={steps.map((s) => c.steps[s === "details" && effectiveKind === "team" ? "owner" : s])} />
      </div>

      {restored && step !== "review" && (
        <p className="t-small -mt-3 text-dim" role="status">
          {c.restored}
        </p>
      )}

      {mode === "signup" && step !== "role" && kindName && (
        <p className="-mt-3 flex flex-wrap items-center gap-x-3 text-[15px] text-muted" data-testid="chosen-role">
          {c.chosen(kindName)}
          <button type="button" className="mono ul-draw min-h-11 hover:!text-text" onClick={() => goTo(0)}>
            {c.change}
          </button>
        </p>
      )}
      {mode === "onboarding" && lockedKind && lockedKind !== "team" && <p className="-mt-3 text-[15px] text-muted">{o.locked(c.cards[lockedKind].title)}</p>}

      {demoOn() && step !== "review" && (
        <button type="button" onClick={fillSample} className="mono ul-draw -mt-3 min-h-11 justify-self-start hover:!text-text" data-testid="fill-sample">
          {c.fill}
        </button>
      )}

      {summary && errorList.length > 0 && (
        <div ref={summaryRef} tabIndex={-1} role="alert" className="rounded-[8px] border border-err p-5 outline-none" data-testid="error-summary">
          <p className="font-medium text-text">{c.summaryTitle(errorList.length)}</p>
          <ul className="mt-3 grid gap-1.5">
            {errorList.map(([k, msg]) => (
              <li key={k}>
                <button type="button" onClick={() => focusField(k)} className="text-start text-[15px] text-err underline underline-offset-4">
                  {msg}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {step === "role" && (
        <div className="grid gap-5">
          <RoleCards
            legend={c.roleLegend}
            value={kind === "team" ? "" : kind}
            onChange={(x) => setKind(x)}
            error={e("account_type")}
            cards={[
              { value: "student", title: c.cards.student.title, text: c.cards.student.text, icon: <CapIcon /> },
              { value: "instructor", title: c.cards.instructor.title, text: c.cards.instructor.text, icon: <PresenterIcon /> },
            ]}
          />
          {mode === "signup" && (
            <p className="t-small text-dim">
              <button type="button" className="ul-draw pb-0.5 font-medium text-text hover:text-accent-text" onClick={() => { setKind("team"); goTo(1); }} data-testid="team-account">
                {c.team}
              </button>{" "}
              · {c.teamHint}
            </p>
          )}
        </div>
      )}

      {step === "account" && (
        <div className="grid gap-7">
          {process.env.NEXT_PUBLIC_AUTH_GOOGLE === "1" && <GoogleButton label={account.signup.google} orLabel={account.signup.or} next="/onboarding/" />}
          <div className="grid gap-2">
            {field("email", { label: `${effectiveKind === "recruiter" ? c.fields.workEmail : c.fields.email} *`, type: "email", autoComplete: "email", inputMode: "email" })}
            {effectiveKind === "recruiter" && isFreeEmail(v.email) && !e("email") && (
              <p className="t-small pt-5 text-warm" role="status">
                {c.freeEmail}
              </p>
            )}
          </div>
          <div>
            <PasswordInput label={`${c.fields.password} *`} name="password" value={v.password} onChange={(x) => set("password", x)} onBlur={blur("password")} error={e("password")} strength autoComplete="new-password" required />
            <p className="t-small mt-7 text-dim">{c.passwordRule}</p>
          </div>
          <PasswordInput label={`${c.fields.confirm} *`} name="confirm" value={v.confirm} onChange={(x) => set("confirm", x)} onBlur={blur("confirm")} error={e("confirm")} autoComplete="new-password" required />
        </div>
      )}

      {step === "details" && effectiveKind === "team" && (
        <div className="grid gap-7">
          {field("full_name", { autoComplete: "name" })}
          {field("phone", { type: "tel", autoComplete: "tel", inputMode: "tel" })}
        </div>
      )}

      {step === "details" && (effectiveKind === "student" || effectiveKind === "recruiter" || effectiveKind === "instructor") && (
        <div className="grid gap-7">
          {field("full_name", { autoComplete: "name" })}
          {effectiveKind === "instructor" && (
            <>
              {field("job_title", { autoComplete: "organization-title" })}
              {field("employer", { autoComplete: "organization" })}
            </>
          )}
          {effectiveKind === "recruiter" && (
            <>
              {field("job_title", { autoComplete: "organization-title" })}
              {field("company_name", { autoComplete: "organization" })}
              {field("company_website", { type: "url", inputMode: "url" })}
              <div className="grid gap-7 sm:grid-cols-2">
                {select("company_type", COMPANY_TYPES)}
                {select("company_size", COMPANY_SIZES)}
              </div>
            </>
          )}
          {field("phone", { type: "tel", autoComplete: "tel", inputMode: "tel" })}
          {effectiveKind === "student" && (
            <div className="grid gap-4">
              <Check name="whatsapp_same" checked={v.whatsapp_same} onChange={(ev) => set("whatsapp_same", ev.target.checked)} label={c.fields.whatsapp_same} />
              {!v.whatsapp_same && field("whatsapp", { type: "tel", inputMode: "tel" })}
            </div>
          )}
          <div className="grid gap-7 sm:grid-cols-2">
            {field("country", { autoComplete: "country-name" })}
            {field("city", { autoComplete: "address-level2" })}
          </div>
          {effectiveKind === "student" && (
            <>
              <DateField label={`${c.fields.date_of_birth} *`} name="date_of_birth" value={v.date_of_birth} onChange={(x) => set("date_of_birth", x)} onBlur={blur("date_of_birth")} error={e("date_of_birth")} max={maxDob()} />
              {select("current_status", STUDENT_STATUS)}
              <div className="grid gap-7 sm:grid-cols-2">
                {select("degree_field", DEGREE_FIELDS)}
                {select("degree_level", DEGREE_LEVELS)}
              </div>
              {field("university")}
              <div className="grid gap-3">
                {select("graduation_year", GRAD_YEARS)}
                {freshGradYear(v.graduation_year) && (
                  <div aria-live="polite" data-testid="fresh-notice">
                    <Tag tone="brass" className="!h-7 !px-2.5">
                      {account.signup.freshPill}
                    </Tag>
                  </div>
                )}
              </div>
              <div className="grid gap-7 sm:grid-cols-2">
                {select("experience_years", EXPERIENCE)}
                {select("revit_level", REVIT_LEVELS)}
              </div>
              {select("career_goal", CAREER_GOALS)}
              {select("preferred_format", FORMATS)}
            </>
          )}
          {effectiveKind === "instructor" && (
            <>
              <div className="grid gap-7 sm:grid-cols-2">
                {select("industry_years", INDUSTRY_YEARS)}
                {select("teaching_years", TEACHING_YEARS)}
              </div>
              <CheckGroup legend={c.fields.subjects} name="subjects" options={INSTRUCTOR_SUBJECTS} value={v.subjects} onChange={(x) => { set("subjects", x); setTouched((t) => ({ ...t, subjects: true })); }} error={e("subjects")} />
              <div className="grid gap-7 sm:grid-cols-2">
                {select("teaching_format", FORMATS)}
                {select("availability", AVAILABILITY)}
              </div>
              {field("linkedin_url", { type: "url", inputMode: "url" })}
              <div>
                <TextareaField label={c.fields.bio} name="bio" rows={5} maxLength={BIO_MAX} value={v.bio} onChange={(ev) => set("bio", ev.target.value)} onBlur={blur("bio")} error={e("bio")} required />
                <p className="mono mt-2 text-end !normal-case" aria-live="off">
                  {c.bioCount(v.bio.trim().length, BIO_MIN, BIO_MAX)}
                </p>
              </div>
            </>
          )}
          {effectiveKind === "recruiter" && (
            <>
              {field("linkedin_url", { type: "url", inputMode: "url" })}
              <CheckGroup legend={c.fields.hiring_roles} name="hiring_roles" options={HIRING_ROLES} value={v.hiring_roles} onChange={(x) => { set("hiring_roles", x); setTouched((t) => ({ ...t, hiring_roles: true })); }} error={e("hiring_roles")} />
              {select("expected_hires", EXPECTED_HIRES)}
            </>
          )}
          {select("heard_from", HEARD_FROM)}
        </div>
      )}

      {step === "review" && (
        <div className="grid gap-8">
          <Review mode={mode} kind={effectiveKind} v={v} onEdit={(s) => goTo(steps.indexOf(s))} hasRoleStep={steps.includes("role")} />
          <fieldset className="grid gap-1">
            <legend className="mono mb-2">{c.review.consent}</legend>
            {(["consent_terms", "consent_contact", ...(effectiveKind === "recruiter" || effectiveKind === "instructor" ? ["authorised_confirmed"] : [])] as (keyof V)[]).map((k) => (
              <div key={k}>
                <Check
                  name={k}
                  checked={Boolean(v[k])}
                  onChange={(ev) => { set(k, ev.target.checked as never); setTouched((t) => ({ ...t, [k]: true })); }}
                  aria-invalid={e(k) ? true : undefined}
                  label={k === "consent_terms" ? <TermsLabel /> : k === "consent_contact" ? c.consents.contact : effectiveKind === "instructor" ? c.consents.instructorInfo : c.consents.authorised}
                />
                {e(k) && (
                  <p role="alert" className="ps-7 text-[13px] leading-5 text-err">
                    {e(k)}
                  </p>
                )}
              </div>
            ))}
          </fieldset>
          <input ref={honeypot} type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden className="absolute -start-[9999px] h-0 w-0 opacity-0" />
          {mode === "signup" && (
            <div className="empty:hidden">
              <Turnstile onToken={setToken} />
            </div>
          )}
        </div>
      )}

      {failure && (
        <Notice tone="error">
          {failure}{" "}
          {failure === c.errors.exists && (
            <Link prefetch={false} href={withNext("/login/", next)} className="ul-draw pb-0.5 font-medium text-text hover:text-accent-text">
              {account.signup.login}
            </Link>
          )}
        </Notice>
      )}

      <div className="flex flex-col-reverse gap-5 border-t pt-7 sm:flex-row sm:items-center sm:justify-between" style={{ borderColor: "var(--rule)" }}>
        {stepIndex > 0 ? (
          <button type="button" onClick={() => goTo(stepIndex - 1)} className="mono inline-flex min-h-11 items-center gap-2 px-1 hover:!text-text">
            <svg aria-hidden width="16" height="12" viewBox="0 0 16 12">
              <path d="M16 6H2M7 1 2 6l5 5" fill="none" stroke="currentColor" strokeWidth="1.5" />
            </svg>
            {c.back}
          </button>
        ) : mode === "signup" ? (
          <p className="text-[15px] text-muted">
            {account.signup.haveAccount}{" "}
            <Link prefetch={false} href={withNext("/login/", next)} className="ul-draw pb-0.5 font-medium text-text hover:text-accent-text">
              {account.signup.login}
            </Link>
          </p>
        ) : (
          <span />
        )}
        <Button type="submit" disabled={phase === "sending"} className="sm:min-w-[200px]">
          {step === "review" ? (phase === "sending" ? (mode === "signup" ? c.sending : c.saving) : mode === "signup" ? c.submit : c.finish) : c.next}
        </Button>
      </div>
      <LiveStatus>{phase === "sending" ? (mode === "signup" ? c.sending : c.saving) : announce}</LiveStatus>
    </form>
  );

  return shell(mode === "onboarding" && stepIndex === 0 ? o.title : c.titles[titleKey as keyof typeof c.titles], mode === "onboarding" && stepIndex === 0 ? o.lead : c.leads[titleKey as keyof typeof c.leads], body);
}

function TermsLabel() {
  return (
    <>
      I agree to the{" "}
      <Link prefetch={false} href="/terms/" className="ul-draw pb-0.5 font-medium text-text hover:text-accent-text">
        Terms
      </Link>{" "}
      and{" "}
      <Link prefetch={false} href="/privacy/" className="ul-draw pb-0.5 font-medium text-text hover:text-accent-text">
        Privacy Policy
      </Link>
      .
    </>
  );
}

// Summary of everything, one hairline table per section with an Edit link back to its step.
function Review({ mode, kind, v, onEdit, hasRoleStep }: { mode: Mode; kind: Kind | ""; v: V; onEdit: (s: Step) => void; hasRoleStep: boolean }) {
  const rows = (pairs: [string, string][]) => (
    <dl className="mt-3 border-t text-[15px]" style={{ borderColor: "var(--rule)" }}>
      {pairs.map(([k, val]) => (
        <div key={k} className="grid grid-cols-1 gap-x-4 border-b py-2.5 sm:grid-cols-[180px_1fr]" style={{ borderColor: "var(--rule)" }}>
          <dt className="text-dim">{k}</dt>
          <dd className="break-words text-text">{val}</dd>
        </div>
      ))}
    </dl>
  );
  const section = (title: string, s: Step, pairs: [string, string][]) => (
    <section>
      <div className="flex items-center justify-between gap-4">
        <h2 className="mono !text-xs !font-normal">{title}</h2>
        <button type="button" onClick={() => onEdit(s)} className="mono ul-draw min-h-11 hover:!text-text" aria-label={c.review.edit_aria(title)}>
          {c.review.edit}
        </button>
      </div>
      {rows(pairs)}
    </section>
  );
  const kindLabel = kind === "team" ? c.team : kind ? c.cards[kind].title : "";
  const L = (k: string) => (c.fields as Record<string, string>)[k];
  const details: [string, string][] =
    kind === "team"
      ? [[L("full_name"), v.full_name], [L("phone"), v.phone]]
      : kind === "instructor"
        ? [
            [L("full_name"), v.full_name], [L("job_title"), v.job_title], [L("employer"), v.employer], [L("phone"), v.phone], [`${L("country")}, ${L("city")}`, `${v.country}, ${v.city}`],
            [L("industry_years"), labelOf(INDUSTRY_YEARS, v.industry_years)], [L("teaching_years"), labelOf(TEACHING_YEARS, v.teaching_years)],
            [L("subjects"), v.subjects.map((x) => labelOf(INSTRUCTOR_SUBJECTS, x)).join(", ")], [L("teaching_format"), labelOf(FORMATS, v.teaching_format)], [L("availability"), labelOf(AVAILABILITY, v.availability)],
            [L("linkedin_url"), v.linkedin_url], [L("bio"), v.bio], [L("heard_from"), labelOf(HEARD_FROM, v.heard_from)],
          ]
      : kind === "recruiter"
        ? [
            [L("full_name"), v.full_name], [L("job_title"), v.job_title], [L("company_name"), v.company_name], [L("company_website"), v.company_website],
            [L("company_type"), labelOf(COMPANY_TYPES, v.company_type)], [L("company_size"), labelOf(COMPANY_SIZES, v.company_size)], [L("phone"), v.phone],
            [`${L("country")}, ${L("city")}`, `${v.country}, ${v.city}`], [L("linkedin_url"), v.linkedin_url],
            [L("hiring_roles"), v.hiring_roles.map((x) => labelOf(HIRING_ROLES, x)).join(", ")], [L("expected_hires"), labelOf(EXPECTED_HIRES, v.expected_hires)], [L("heard_from"), labelOf(HEARD_FROM, v.heard_from)],
          ]
        : [
            [L("full_name"), v.full_name], [L("phone"), v.phone], ["WhatsApp", v.whatsapp_same ? v.phone : v.whatsapp], [`${L("country")}, ${L("city")}`, `${v.country}, ${v.city}`],
            [L("date_of_birth"), v.date_of_birth], [L("current_status"), labelOf(STUDENT_STATUS, v.current_status)],
            [L("degree_field"), `${labelOf(DEGREE_FIELDS, v.degree_field)}, ${labelOf(DEGREE_LEVELS, v.degree_level)}`], [L("university"), v.university], [L("graduation_year"), v.graduation_year],
            [L("experience_years"), labelOf(EXPERIENCE, v.experience_years)], [L("revit_level"), labelOf(REVIT_LEVELS, v.revit_level)], [L("career_goal"), labelOf(CAREER_GOALS, v.career_goal)],
            [L("preferred_format"), labelOf(FORMATS, v.preferred_format)], [L("heard_from"), labelOf(HEARD_FROM, v.heard_from)],
          ];
  return (
    <div className="grid gap-8" data-testid="review">
      {mode === "signup" && section(c.review.account, "account", [[c.steps.role, kindLabel], [kind === "recruiter" ? c.fields.workEmail : c.fields.email, v.email], [c.fields.password, "********"]])}
      {mode === "onboarding" && hasRoleStep && section(c.steps.role, "role", [[c.steps.role, kindLabel]])}
      {section(c.review.details, "details", details)}
    </div>
  );
}
