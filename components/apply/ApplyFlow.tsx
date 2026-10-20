"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, m } from "motion/react";
import { Check, Field, SelectField } from "@/components/forms/Field";
import { FileUpload } from "@/components/forms/FileUpload";
import { Turnstile } from "@/components/forms/Turnstile";
import { SceneSlot } from "@/components/three/SceneSlot";
import { LeadForm } from "@/components/forms/LeadForm";
import { ApplyGate } from "@/components/apply/ApplyGate";
import { Button } from "@/components/ui/Button";
import { Stepper } from "@/components/ds/Controls";
import { DimensionString, SheetTag } from "@/components/ds/Devices";
import { programs } from "@/content/programs";
import { content, shown } from "@/content/site";
import { pages } from "@/content/copy-pages";
import { applyCopy } from "@/content/copy-apply";
import { discounts } from "@/config/discounts";
import { calcPrice, money } from "@/lib/pricing";
import { newState } from "@/lib/modelState";
import { useAuth } from "@/lib/auth";
import { authEnabled, getSupabase } from "@/lib/supabase";
import { insertRow } from "@/lib/submit";
import { readUtm } from "@/lib/utm";
import { track, trackOnce } from "@/lib/analytics";
import {
  CV_TYPES, FILE_EXT, LEVELS, PROOF_TYPES, SKILLS, defaultValues, fullSchema, inferStep, isFreshGrad, options, profilePatch,
  rowFromValues, stepFields, valuesFromProfile, valuesFromRow, type ApplicationRow, type ApplyValues,
} from "@/lib/applySchema";
import { cn } from "@/lib/utils";
import { NoScriptNote } from "@/components/ui/NoScript";

const c = pages.apply;
const STEPS = c.steps;
const DRAFT = "vdc-apply-draft";
const RESUBMIT_MS = 10_000;
const year = new Date().getFullYear();
const gradYears = Array.from({ length: 12 }, (_, i) => String(year + 1 - i));
const rule = { borderColor: "var(--rule)" } as const;
const stepTitle = "!text-[clamp(1.75rem,1.3rem+1.6vw,2.5rem)]";

// The local draft: guest progress and the exact step. `id` is the server draft row, `userId` who it belongs to
// (a guest draft has none and is adopted by whoever logs in next on this browser).
type LocalDraft = { values: Partial<ApplyValues>; step: number; id?: string | null; userId?: string | null };

function readDraft(): LocalDraft | null {
  try {
    const d = JSON.parse(localStorage.getItem(DRAFT) ?? "null");
    return d && d.values && typeof d.values === "object" ? (d as LocalDraft) : null;
  } catch {
    return null;
  }
}
function writeDraft(d: LocalDraft) {
  try {
    localStorage.setItem(DRAFT, JSON.stringify(d));
  } catch {}
}
function clearDraft() {
  try {
    localStorage.removeItem(DRAFT);
  } catch {}
}

type Dupe = { id: string; titles: string };

export function ApplyFlow() {
  const router = useRouter();
  const sp = useSearchParams();
  const { enabled, ready, user, profile, refreshProfile } = useAuth();
  const preview = sp.get("preview") === "1";

  const [step, setStep] = useState(0);
  const [proof, setProof] = useState<File | null>(null);
  const [cv, setCv] = useState<File | null>(null);
  const [token, setToken] = useState("");
  const [sending, setSending] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [fallback, setFallback] = useState(false);
  const [needLogin, setNeedLogin] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [profileWaited, setProfileWaited] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [restored, setRestored] = useState(false);
  const [save, setSave] = useState<"idle" | "saving" | "saved" | "failed">("idle");
  const [dupe, setDupe] = useState<Dupe | null>(null);
  const honeypot = useRef<HTMLInputElement>(null);
  const lastSubmit = useRef(0);
  const state = useRef(newState({ lod: 300, sim: 1 / 6, mood: 0 }));
  const email = shown(content.contact.email);

  const form = useForm<ApplyValues>({ resolver: zodResolver(fullSchema), defaultValues, mode: "onBlur" });
  const { register, watch, trigger, getValues, reset, formState: { errors } } = form;
  const v = watch();

  const userId = user?.id ?? null;
  const profileId = profile?.id ?? null;

  // A new session (login, logout, another user) starts the load again.
  useEffect(() => {
    setLoaded(false);
    setProfileWaited(false);
    setDraftId(null);
    setRestored(false);
    setDupe(null);
    setNeedLogin(false);
  }, [userId]);

  // Prefill and resume, once the session is known: profile -> server draft -> local draft (the most recent typing wins),
  // then the URL hints (?program=slug&status=freshGrad) for anything still empty.
  useEffect(() => {
    if (!ready || loaded) return;
    if (enabled && !userId && !preview) return; // the gate renders, nothing to load
    if (enabled && userId && !profileId && !profileWaited) {
      // the provider loads the profile right after the session; give it a moment, never wait forever
      const t = setTimeout(() => setProfileWaited(true), 1500);
      return () => clearTimeout(t);
    }
    let active = true;
    (async () => {
      const local = readDraft();
      const localOk = local && (!local.userId || local.userId === userId) ? local : null;
      let row: ApplicationRow | null = null;
      const sb = userId ? getSupabase() : null;
      if (sb && userId) {
        const { data } = await sb.from("applications").select("*").eq("user_id", userId).eq("status", "draft").order("updated_at", { ascending: false }).limit(1);
        row = (data?.[0] as ApplicationRow | undefined) ?? null;
        if (localOk?.id && row && row.id !== localOk.id) {
          const { data: byId } = await sb.from("applications").select("*").eq("id", localOk.id).eq("status", "draft").maybeSingle();
          if (byId) row = byId as ApplicationRow;
        }
      }
      if (!active) return;
      const merged: Partial<ApplyValues> = { ...valuesFromProfile(profile, user?.email), ...(row ? valuesFromRow(row) : {}), ...(localOk?.values ?? {}) };
      if (userId && user?.email && !merged.email) merged.email = user.email;
      const slug = sp.get("program");
      if (slug && programs.some((p) => p.slug === slug) && !(merged.programs?.length)) merged.programs = [slug];
      if (sp.get("status") === "freshGrad" && !merged.currentStatus) merged.currentStatus = "Fresh graduate";
      reset({ ...defaultValues, ...merged, skills: { ...defaultValues.skills, ...(merged.skills ?? {}) } });
      setDraftId(row ? String(row.id) : null);
      setStep(Math.min(4, Math.max(0, localOk?.step ?? (row ? inferStep(row) : 0))));
      setRestored(Boolean(row || (localOk && (localOk.values.email || localOk.values.fullName))));
      setLoaded(true);
    })();
    return () => {
      active = false;
    };
  }, [ready, enabled, preview, userId, profileId, profileWaited, loaded, profile, user, sp, reset]);

  // Local autosave (never throws, storage can be blocked). Only after the load, so an empty form never overwrites a draft.
  useEffect(() => {
    if (!loaded) return;
    const t = setTimeout(() => {
      if (v.email || v.fullName) writeDraft({ values: v, step, id: draftId, userId });
    }, 500);
    return () => clearTimeout(t);
  }, [v, step, draftId, userId, loaded]);

  // The form itself (not the gate or the fallback) is in front of a logged-in user.
  useEffect(() => {
    if (loaded && userId && enabled && !fallback) trackOnce("apply_started");
  }, [loaded, userId, enabled, fallback]);

  // The building gains one floor per completed step.
  useEffect(() => {
    state.current.sim = (step + 1) / 6;
  }, [step]);

  const grad = isFreshGrad(v.gradYear) && v.currentStatus !== "Current student";
  const discountType = grad ? "freshGrad" : v.currentStatus === "Current student" ? "student" : null;

  const chosen = useMemo(() => programs.filter((p) => v.programs.includes(p.slug)), [v.programs]);
  const prices = chosen.map((p) => p.priceFull);
  const base = chosen.length > 0 && prices.every((x) => x !== null) ? (prices as number[]).reduce((a, b) => a + b, 0) : null;
  const price = calcPrice(base, discountType, false);

  // ---- server draft: one applications row per attempt, status draft, upserted on every Continue.
  const writeRow = useCallback(
    async (row: ApplicationRow): Promise<string | null> => {
      const sb = getSupabase();
      if (!sb || !userId) return null;
      let id = draftId;
      if (id) {
        const { data, error } = await sb.from("applications").update(row).eq("id", id).eq("status", "draft").select("id");
        if (error || !data?.length) id = null; // gone, or no longer a draft: start a fresh row
      }
      if (!id) {
        const { data, error } = await sb.from("applications").insert(row).select("id").single();
        if (error || !data) return null;
        id = String((data as { id: string }).id);
        setDraftId(id);
      }
      return id;
    },
    [draftId, userId],
  );

  const syncProfile = useCallback(
    async (values: Partial<ApplyValues>) => {
      const sb = getSupabase();
      if (!sb || !userId) return;
      const patch = profilePatch(values);
      if (Object.keys(patch).length === 0) return;
      const { error } = await sb.from("profiles").upsert({ id: userId, ...patch });
      if (!error) void refreshProfile();
    },
    [userId, refreshProfile],
  );

  // `at` is the step the local draft should remember (Continue passes the step it advances to, so a reload right
  // after lands there even before the debounced autosave runs).
  const saveDraft = useCallback(
    async (at: number = step): Promise<string | null> => {
      if (!userId) return null;
      setSave("saving");
      const values = getValues();
      const id = await writeRow({ ...rowFromValues(values), status: "draft" });
      setSave(id ? "saved" : "failed");
      if (id) {
        writeDraft({ values, step: at, id, userId });
        void syncProfile(values);
      }
      return id;
    },
    [userId, getValues, writeRow, step, syncProfile],
  );

  // One live application per program: anything submitted and not rejected blocks a second one.
  const findDuplicate = useCallback(
    async (slugs: string[]): Promise<Dupe | null> => {
      const sb = getSupabase();
      if (!sb || !userId || slugs.length === 0) return null;
      const { data } = await sb.from("applications").select("id,status,programs").eq("user_id", userId).neq("status", "draft");
      const hit = ((data ?? []) as { id: string; status: string; programs: string[] | null }[]).find((a) => a.status !== "rejected" && (a.programs ?? []).some((p) => slugs.includes(p)));
      if (!hit) return null;
      const titles = programs.filter((p) => (hit.programs ?? []).includes(p.slug) && slugs.includes(p.slug)).map((p) => p.title);
      return { id: hit.id, titles: titles.join(", ") || "this program" };
    },
    [userId],
  );

  const next = useCallback(async () => {
    const ok = await trigger(stepFields[step] as never);
    if (!ok) return;
    if (step === 3) {
      const d = await findDuplicate(getValues("programs"));
      setDupe(d);
      if (d) return;
    }
    track("apply_step_completed", { step: step + 1 });
    const to = Math.min(4, step + 1);
    setSending(true);
    await saveDraft(to);
    setSending(false);
    setStep(to);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step, trigger, findDuplicate, getValues, saveDraft]);

  async function finishLater() {
    setSending(true);
    const id = await saveDraft();
    setSending(false);
    if (id) router.push("/account/");
  }

  async function startOver() {
    const sb = getSupabase();
    if (sb && userId && draftId) await sb.from("applications").delete().eq("id", draftId).eq("status", "draft");
    clearDraft();
    reset({ ...defaultValues, ...valuesFromProfile(profile, user?.email) });
    setDraftId(null);
    setStep(0);
    setRestored(false);
    setDupe(null);
    setProof(null);
    setCv(null);
  }

  function finish(d: ApplyValues, id: string | null) {
    state.current.sim = 1;
    clearDraft();
    try {
      sessionStorage.setItem("vdc-applied", JSON.stringify({ name: d.fullName.split(" ")[0], program: chosen[0]?.title ?? "", discount: discountType, id }));
    } catch {}
    router.push("/apply/success/");
  }

  async function upload(file: File): Promise<string | null> {
    const sb = getSupabase();
    if (!sb || !userId) return null;
    const ext = FILE_EXT[file.type];
    if (!ext) return null;
    const path = `${userId}/${crypto.randomUUID()}.${ext}`;
    const { error } = await sb.storage.from("documents").upload(path, file, { contentType: file.type, upsert: false });
    return error ? null : path;
  }

  async function submit() {
    const ok = await trigger();
    if (!ok) return;
    setSubmitError("");
    const d = getValues();
    // Honeypot: a hidden field only bots fill. Nothing is sent; the bot sees the success page anyway.
    if (honeypot.current?.value) return finish(d, null);
    // Not connected (no keys in this build, no mock): say so instead of failing silently.
    if (!authEnabled()) {
      setFallback(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    const sb = getSupabase();
    if (!sb || !userId) {
      // preview without an account: the answers stay in the local draft and come back after login
      setNeedLogin(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (Date.now() - lastSubmit.current < RESUBMIT_MS) return setSubmitError(applyCopy.submit.tooFast);
    lastSubmit.current = Date.now();
    setSending(true);

    const existing = await findDuplicate(d.programs);
    if (existing) {
      setDupe(existing);
      setSending(false);
      setStep(3);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    const [proofPath, cvPath] = await Promise.all([proof ? upload(proof) : null, cv ? upload(cv) : null]);
    if ((proof && !proofPath) || (cv && !cvPath)) {
      setSending(false);
      return setSubmitError(applyCopy.submit.upload);
    }
    const id = await writeRow({
      ...rowFromValues(d),
      status: "submitted",
      discount_type: discountType,
      discount_percent: price.percent,
      proof_file_path: proofPath,
      cv_file_path: cvPath,
      consent_privacy: true,
      consent_contact: true,
      newsletter: d.newsletter,
      utm: readUtm(),
      turnstile_token: token || null,
    });
    if (!id) {
      setSending(false);
      return setSubmitError(applyCopy.submit.failed);
    }
    await syncProfile(d);
    if (d.newsletter) await insertRow("newsletter_subscribers", { email: d.email, name: d.fullName });
    // Confirmation emails run in an Edge Function. A failure there must not fail the application, and nothing personal is logged.
    try {
      await sb.functions.invoke("on-application-submitted", { body: { application_id: id } });
    } catch {}
    setSending(false);
    track("apply_submitted", { programs_count: d.programs.length, discount: discountType ?? "none" });
    finish(d, id);
  }

  const e = (k: keyof ApplyValues) => (errors[k]?.message as string | undefined);

  // ---- which screen
  if (!ready) {
    return (
      <section className="theme-light pt-[72px]" aria-busy="true">
        <div className="wrap">
          <div className="grid-12 pb-24 pt-14 lg:pb-32 lg:pt-20">
            <div className="col-span-12 min-h-[60vh] lg:col-span-7">
              <SheetTag sheet={c.sheet} name={c.name} />
              <NoScriptNote className="!mt-8" />
            </div>
          </div>
        </div>
      </section>
    );
  }
  if (enabled && !userId && (!preview || needLogin)) return <ApplyGate note={needLogin ? applyCopy.gate.submitFirst : undefined} />;
  const showFallback = fallback || (!enabled && !preview);

  return (
    <section className="theme-light pt-[72px]">
      <div className="wrap">
        <div className="grid-12 gap-y-12 pb-24 pt-14 lg:pb-32 lg:pt-20">
          {showFallback ? (
            // No backend in this build: say so plainly and take an email instead. Nothing was saved.
            <div className="col-span-12 lg:col-span-7">
              <SheetTag sheet={c.sheet} name={c.name} />
              <h1 className="t-h1 mt-8">{applyCopy.fallback.title}</h1>
              <p className="t-lead mt-6" role="status">
                {applyCopy.fallback.lead}
                {email ? (
                  <>
                    {" "}
                    You can also write to{" "}
                    <a className="underline underline-offset-4" href={`mailto:${email}`}>
                      {email}
                    </a>
                    .
                  </>
                ) : null}
              </p>
              <p className="t-small mt-4 text-dim">{fallback ? applyCopy.fallback.note : applyCopy.fallback.noteIdle}</p>
              <div className="mt-10">
                <LeadForm topic={c.fallback.topic} button={c.fallback.button} />
              </div>
              <div className="mt-12 flex flex-wrap items-center gap-x-8 gap-y-4">
                {fallback && (
                  <button type="button" onClick={() => setFallback(false)} className="mono ul-draw min-h-11 hover:!text-text">
                    {applyCopy.fallback.back}
                  </button>
                )}
                <Button href="/programs" variant="link">
                  {c.fallback.explore}
                </Button>
              </div>
            </div>
          ) : (
          <div className="col-span-12 lg:col-span-7">
            <SheetTag sheet={c.sheet} name={c.name} />
            <Stepper className="mt-8" step={step + 1} total={STEPS.length} labels={STEPS} />

            {restored && (
              <div className="card mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 px-5 py-3 text-[15px]" role="status">
                <span className="text-text">{applyCopy.draft.restored}</span>
                <button type="button" className="ul-draw min-h-11 text-dim hover:text-text" onClick={startOver}>
                  {applyCopy.draft.startOver}
                </button>
              </div>
            )}

            <form
              className="mt-12"
              onSubmit={(ev) => {
                ev.preventDefault();
                if (!loaded) return; // the profile and draft are still loading: a click now would validate empty fields
                if (sending) return;
                if (step === 4) submit();
                else next();
              }}
              noValidate
            >
              {/* initial={false}: Motion's features load after the first interaction, so the first step must render visible without an entrance. */}
              <AnimatePresence mode="wait" initial={false}>
                <m.div key={step} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }} className="space-y-7">
                  {step === 0 && (
                    <>
                      <h1 className={stepTitle}>Tell us about you.</h1>
                      <Field label="Full name" required autoComplete="name" error={e("fullName")} {...register("fullName")} />
                      <Field label="Email" type="email" required autoComplete="email" error={e("email")} {...register("email")} />
                      <Field label="Phone with country code" type="tel" required autoComplete="tel" error={e("phone")} {...register("phone")} />
                      <Check label="My WhatsApp number is the same" {...register("whatsappSame")} />
                      {!v.whatsappSame && <Field label="WhatsApp number" type="tel" error={e("whatsapp")} {...register("whatsapp")} />}
                      <div className="grid gap-7 sm:grid-cols-2">
                        <Field label="Country" required autoComplete="country-name" error={e("country")} {...register("country")} />
                        <Field label="City" required autoComplete="address-level2" error={e("city")} {...register("city")} />
                      </div>
                      <div className="grid gap-7 sm:grid-cols-2">
                        <SelectField label="Age range" options={options.ageRange} {...register("ageRange")} />
                        <SelectField label="Preferred language" required options={options.language} error={e("language")} {...register("language")} />
                      </div>
                    </>
                  )}

                  {step === 1 && (
                    <>
                      <h1 className={stepTitle}>Your education.</h1>
                      <SelectField label="Current status" required options={options.status} error={e("currentStatus")} {...register("currentStatus")} />
                      <SelectField label="Degree" required options={options.degree} error={e("degree")} {...register("degree")} />
                      <Field label="University" required error={e("university")} {...register("university")} />
                      <div className="grid gap-7 sm:grid-cols-2">
                        <SelectField label="Graduation year" required options={gradYears} error={e("gradYear")} {...register("gradYear")} />
                        <Field label="GPA or grade (optional)" {...register("gpa")} />
                      </div>
                      <AnimatePresence>
                        {grad && (
                          <m.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden" role="status">
                            <p className="border-s-2 border-brass ps-5 text-[15px] text-warm">
                              You qualify for the fresh graduate discount ({discounts.freshGrad.percent}%), pending verification. Upload your proof below.
                            </p>
                          </m.div>
                        )}
                      </AnimatePresence>
                      <FileUpload label="Proof for your discount (certificate, transcript or student ID)" hint="PDF, JPG or PNG, up to 5 MB" accept=".pdf,.jpg,.jpeg,.png" types={PROOF_TYPES} file={proof} onFile={setProof} highlight={grad} />
                    </>
                  )}

                  {step === 2 && (
                    <>
                      <h1 className={stepTitle}>Experience and goals.</h1>
                      <SelectField label="Years of experience" required options={options.experience} error={e("experience")} {...register("experience")} />
                      <div className="grid gap-7 sm:grid-cols-2">
                        <Field label="Current job title (optional)" {...register("jobTitle")} />
                        <Field label="Company (optional)" {...register("company")} />
                      </div>
                      <fieldset>
                        <legend className="mono mb-3">Your skill level in each tool</legend>
                        <div className="grid gap-3 sm:grid-cols-2">
                          {SKILLS.map((s) => (
                            <label key={s} className="flex min-h-14 items-center justify-between gap-4 rounded-[4px] border px-4 text-[15px] text-text" style={rule}>
                              {s}
                              <select aria-label={`${s} skill level`} className="h-11 bg-transparent text-end text-[15px] text-muted outline-none focus-visible:text-text" {...register(`skills.${s}` as never)}>
                                {LEVELS.map((l) => (
                                  <option key={l} className="bg-white text-[#0a1d23]">
                                    {l}
                                  </option>
                                ))}
                              </select>
                            </label>
                          ))}
                        </div>
                      </fieldset>
                      <SelectField label="Career goal" required options={options.goal} error={e("goal")} {...register("goal")} />
                      <FileUpload label="CV (optional)" hint="PDF, JPG or PNG, up to 5 MB" accept=".pdf,.jpg,.jpeg,.png" types={CV_TYPES} file={cv} onFile={setCv} />
                      <Field label="LinkedIn link (optional)" type="url" error={e("linkedin")} {...register("linkedin")} />
                      <Field label="Portfolio link (optional)" type="url" error={e("portfolio")} {...register("portfolio")} />
                    </>
                  )}

                  {step === 3 && (
                    <>
                      <h1 className={stepTitle}>Choose your program.</h1>
                      <fieldset>
                        <legend className="mono mb-3">Programs you are interested in *</legend>
                        <div className="grid gap-3 sm:grid-cols-2">
                          {programs.map((p) => {
                            const on = v.programs.includes(p.slug);
                            return (
                              <label key={p.slug} className={cn("flex cursor-pointer items-start gap-3 rounded-[4px] border p-4 text-[15px] transition-colors duration-200", on ? "border-accent bg-mist/40" : "hover:border-[color:var(--text-dim)]")} style={on ? undefined : rule}>
                                <input type="checkbox" value={p.slug} className="mt-1 size-4 shrink-0 accent-[var(--accent)]" {...register("programs", { onChange: () => setDupe(null) })} />
                                <span className="text-text">
                                  {p.title}
                                  <span className="mono mt-1 block">{p.level}</span>
                                </span>
                              </label>
                            );
                          })}
                        </div>
                        {e("programs") && (
                          <p role="alert" className="mt-2 text-[13px] text-err">
                            {e("programs")}
                          </p>
                        )}
                      </fieldset>

                      {dupe && (
                        <div className="rounded-[4px] border-s-2 border-brass bg-paper-2 p-5" role="alert">
                          <p className="text-[1.0625rem] font-medium text-text">{applyCopy.duplicate.title}</p>
                          <p className="mt-2 text-[15px] text-muted">{applyCopy.duplicate.lead(dupe.titles)}</p>
                          <p className="t-small mt-2 text-dim">{applyCopy.duplicate.change}</p>
                          <div className="mt-4">
                            <Button href={`/account/application/?id=${dupe.id}`} variant="link">
                              {applyCopy.duplicate.view}
                            </Button>
                          </div>
                        </div>
                      )}

                      <div className="grid gap-7 sm:grid-cols-2">
                        <SelectField label="Preferred format" required options={options.format} error={e("format")} {...register("format")} />
                        <SelectField label="Preferred schedule" required options={options.schedule} error={e("schedule")} {...register("schedule")} />
                        <SelectField label="Preferred start" required options={options.start} error={e("start")} {...register("start")} />
                        <SelectField label="Laptop that can run Revit?" required options={options.laptop} error={e("laptop")} {...register("laptop")} />
                      </div>
                      <p className="t-small text-dim">Not sure about your laptop? Revit needs a recent multi-core processor, 16 GB of RAM and a dedicated graphics card. We will help you check it.</p>
                      <SelectField label="How did you hear about us?" options={options.source} {...register("source")} />

                      <div className="card p-6" aria-live="polite">
                        <p className="mono">Your estimate</p>
                        {chosen.length === 0 ? (
                          <p className="mt-3 text-muted">Choose a program to see your estimate.</p>
                        ) : (
                          <>
                            <ul className="mt-3 space-y-1 text-[15px] text-muted">
                              {chosen.map((p) => (
                                <li key={p.slug}>{p.title}</li>
                              ))}
                            </ul>
                            <p className="mt-4 text-[2rem] font-semibold leading-none tracking-tight text-text">{price.final !== null ? money(price.final) : "Price will be sent with your acceptance"}</p>
                            {price.percent > 0 && (
                              <p className="t-small mt-3 text-warm">
                                Discount: {price.percent}% ({price.applied.join(", ")}), pending verification
                              </p>
                            )}
                          </>
                        )}
                      </div>
                    </>
                  )}

                  {step === 4 && (
                    <>
                      <h1 className={stepTitle}>Review and submit.</h1>
                      {[
                        { n: 0, t: "About you", rows: [["Name", v.fullName], ["Email", v.email], ["Phone", v.phone], ["Location", `${v.city}, ${v.country}`]] },
                        { n: 1, t: "Education", rows: [["Status", v.currentStatus], ["Degree", v.degree], ["University", v.university], ["Graduation", v.gradYear], ["Proof", proof?.name ?? "Not added"]] },
                        { n: 2, t: "Experience", rows: [["Experience", v.experience], ["Goal", v.goal], ["CV", cv?.name ?? "Not added"]] },
                        { n: 3, t: "Program", rows: [["Programs", chosen.map((p) => p.title).join(", ")], ["Format", v.format], ["Schedule", v.schedule], ["Start", v.start]] },
                      ].map((s) => (
                        <section key={s.t} className="rounded-[4px] border p-5" style={rule}>
                          <div className="mb-4 flex items-center justify-between gap-4">
                            <h2 className="!text-base !font-medium !tracking-normal">
                              <span className="mono me-3">{String(s.n + 1).padStart(2, "0")}</span>
                              {s.t}
                            </h2>
                            <button type="button" onClick={() => setStep(s.n)} className="mono ul-draw min-h-11 hover:!text-text">
                              Edit
                            </button>
                          </div>
                          <dl className="grid gap-x-6 gap-y-3 text-[15px] sm:grid-cols-2">
                            {s.rows.map(([k, val]) => (
                              <div key={k}>
                                <dt className="mono">{k}</dt>
                                <dd className="mt-0.5 text-text">{val || "Not added"}</dd>
                              </div>
                            ))}
                          </dl>
                        </section>
                      ))}
                      {price.percent > 0 && (
                        <p className="border-s-2 border-brass ps-5 text-[15px] text-warm" role="status">
                          Discount: {price.percent}% ({price.applied.join(", ")}), pending verification{price.final !== null ? `. Your estimate: ${money(price.final)}.` : "."}
                        </p>
                      )}
                      <div className="space-y-1">
                        <Check
                          label={
                            <>
                              I agree to the{" "}
                              <a href="/privacy/" target="_blank" className="underline underline-offset-4">
                                Privacy Policy
                              </a>{" "}
                              and{" "}
                              <a href="/terms/" target="_blank" className="underline underline-offset-4">
                                Terms
                              </a>
                              . *
                            </>
                          }
                          {...register("consentPrivacy")}
                        />
                        {e("consentPrivacy") && (
                          <p role="alert" className="text-[13px] text-err">
                            {e("consentPrivacy")}
                          </p>
                        )}
                        <Check label="I agree to be contacted by email, phone or WhatsApp about my application. *" {...register("consentContact")} />
                        {e("consentContact") && (
                          <p role="alert" className="text-[13px] text-err">
                            {e("consentContact")}
                          </p>
                        )}
                        <Check label="Send me news about new cohorts (optional)." {...register("newsletter")} />
                      </div>
                      <input ref={honeypot} type="text" name={applyCopy.honeypot} tabIndex={-1} autoComplete="off" aria-hidden className="absolute -start-[9999px] h-0 w-0 opacity-0" />
                      <Turnstile onToken={setToken} />
                      {submitError && (
                        <p role="alert" className="text-[13px] text-err">
                          {submitError}
                        </p>
                      )}
                    </>
                  )}
                </m.div>
              </AnimatePresence>

              <div className="mt-12 flex items-center justify-between gap-4 border-t pt-8" style={rule}>
                <button type="button" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0} className="mono inline-flex min-h-11 items-center gap-2 px-1 hover:!text-text disabled:opacity-30">
                  <svg aria-hidden width="16" height="12" viewBox="0 0 16 12">
                    <path d="M16 6H2M7 1 2 6l5 5" fill="none" stroke="currentColor" strokeWidth="1.5" />
                  </svg>
                  {c.back}
                </button>
                <Button type="submit" disabled={!loaded || sending || Boolean(dupe && step === 3)}>
                  {step === 4 ? (sending ? c.sending : c.submit) : sending ? applyCopy.draft.saving : c.next}
                </Button>
              </div>

              {userId && (
                <div className="mt-6 flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
                  <button type="button" onClick={finishLater} disabled={sending} className="mono ul-draw min-h-11 hover:!text-text disabled:opacity-40">
                    {applyCopy.draft.later}
                  </button>
                  <p className="mono" role="status" aria-live="polite">
                    {save === "saving" && applyCopy.draft.saving}
                    {save === "saved" && (
                      <>
                        {applyCopy.draft.saved} ·{" "}
                        <Link prefetch={false} href="/account/" className="ul-draw hover:!text-text">
                          Dashboard
                        </Link>
                      </>
                    )}
                    {save === "failed" && <span className="!text-err">{applyCopy.draft.failed}</span>}
                  </p>
                </div>
              )}
            </form>
          </div>
          )}

          <aside className="relative hidden lg:col-span-4 lg:col-start-9 lg:block" aria-hidden>
            <div className="sticky top-24">
              <SceneSlot stateRef={state} autoRotate rotateSpeed={0.07} fit={0.95} label={c.modelAlt} className="aspect-[4/5] w-full" />
              <DimensionString label={c.floors(step + 1)} className="mt-4" />
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
