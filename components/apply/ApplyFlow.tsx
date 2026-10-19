"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, m } from "motion/react";
import { Check, Field, SelectField } from "@/components/forms/Field";
import { FileUpload } from "@/components/forms/FileUpload";
import { Turnstile } from "@/components/forms/Turnstile";
import { SceneSlot } from "@/components/three/SceneSlot";
import { LeadForm } from "@/components/forms/LeadForm";
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
import { canSubmit, insertRow, uploadFile } from "@/lib/submit";
import { readUtm } from "@/lib/utm";
import {
  CV_TYPES, LEVELS, PROOF_TYPES, SKILLS, defaultValues, fullSchema, isFreshGrad, options, stepFields,
  type ApplyValues,
} from "@/lib/applySchema";
import { cn } from "@/lib/utils";

const c = pages.apply;
const STEPS = c.steps;
const DRAFT = "vdc-apply-draft";
const year = new Date().getFullYear();
const gradYears = Array.from({ length: 12 }, (_, i) => String(year + 1 - i));
const rule = { borderColor: "var(--rule)" } as const;
const stepTitle = "!text-[clamp(1.75rem,1.3rem+1.6vw,2.5rem)]";

function readDraft(): { values: Partial<ApplyValues>; step: number } | null {
  try {
    const d = JSON.parse(localStorage.getItem(DRAFT) ?? "null");
    return d && d.values?.email !== undefined ? d : null;
  } catch {
    return null;
  }
}

export function ApplyFlow() {
  const router = useRouter();
  const sp = useSearchParams();
  const [step, setStep] = useState(0);
  const [proof, setProof] = useState<File | null>(null);
  const [cv, setCv] = useState<File | null>(null);
  const [token, setToken] = useState("");
  const [sending, setSending] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [draft, setDraft] = useState<{ values: Partial<ApplyValues>; step: number } | null>(null);
  const [fallback, setFallback] = useState(false);
  const honeypot = useRef<HTMLInputElement>(null);
  const state = useRef(newState({ lod: 300, sim: 1 / 6, mood: 0 }));
  const email = shown(content.contact.email);

  const form = useForm<ApplyValues>({
    resolver: zodResolver(fullSchema),
    defaultValues,
    mode: "onBlur",
  });
  const { register, watch, trigger, setValue, getValues, formState: { errors } } = form;
  const v = watch();

  // Prefill from the URL (?program=slug&status=freshGrad), then offer to resume a saved draft.
  useEffect(() => {
    const slug = sp.get("program");
    if (slug && programs.some((p) => p.slug === slug)) setValue("programs", [slug]);
    if (sp.get("status") === "freshGrad") setValue("currentStatus", "Fresh graduate");
    setDraft(readDraft());
  }, [sp, setValue]);

  // Autosave (never throws, storage can be blocked).
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        if (v.email || v.fullName) localStorage.setItem(DRAFT, JSON.stringify({ values: v, step }));
      } catch {}
    }, 500);
    return () => clearTimeout(t);
  }, [v, step]);

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

  const next = useCallback(async () => {
    const ok = await trigger(stepFields[step] as never);
    if (ok) {
      setStep((s) => Math.min(4, s + 1));
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [step, trigger]);

  function finish(d: ApplyValues) {
    state.current.sim = 1;
    try {
      localStorage.removeItem(DRAFT);
      sessionStorage.setItem("vdc-applied", JSON.stringify({ name: d.fullName.split(" ")[0], program: chosen[0]?.title ?? "", discount: discountType }));
    } catch {}
    router.push("/apply/success/");
  }

  async function submit() {
    const ok = await trigger();
    if (!ok) return;
    setSending(true);
    setSubmitError("");
    const d = getValues();
    // Honeypot: a hidden field only bots fill. Nothing is sent; the bot sees the success page anyway.
    if (honeypot.current?.value) return finish(d);
    // Not connected yet (no keys in this build): be honest instead of failing silently.
    if (!canSubmit()) {
      setSending(false);
      setFallback(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    const [proofPath, cvPath] = await Promise.all([proof ? uploadFile(proof, "proof") : null, cv ? uploadFile(cv, "cv") : null]);
    if ((proof && !proofPath) || (cv && !cvPath)) {
      setSending(false);
      setSubmitError("A file could not be uploaded. Please try again.");
      return;
    }
    const utm = readUtm();
    const r = await insertRow("applications", {
      full_name: d.fullName,
      email: d.email,
      phone: d.phone,
      whatsapp: d.whatsappSame ? d.phone : d.whatsapp || null,
      country: d.country,
      city: d.city,
      dob_or_age: d.ageRange || null,
      language: d.language,
      current_status: d.currentStatus,
      degree: d.degree,
      university: d.university,
      graduation_year: Number(d.gradYear),
      gpa: d.gpa || null,
      experience_years: d.experience,
      job_title: d.jobTitle || null,
      company: d.company || null,
      software_skills: d.skills,
      career_goal: d.goal,
      linkedin_url: d.linkedin || null,
      portfolio_url: d.portfolio || null,
      programs: d.programs,
      format: d.format,
      schedule: d.schedule,
      start_pref: d.start,
      has_laptop: d.laptop,
      source: d.source || null,
      discount_type: discountType,
      discount_percent: price.percent,
      discount_verified: false,
      proof_file_path: proofPath,
      cv_file_path: cvPath,
      consent_privacy: true,
      consent_contact: true,
      newsletter: d.newsletter,
      utm_source: utm.source,
      utm_medium: utm.medium,
      utm_campaign: utm.campaign,
      turnstile_token: token || null,
    });
    if (d.newsletter) await insertRow("newsletter_subscribers", { email: d.email, name: d.fullName });
    setSending(false);
    if (!r.ok) return setSubmitError(r.message);
    finish(d);
  }

  const e = (k: keyof ApplyValues) => (errors[k]?.message as string | undefined);

  return (
    <section className="theme-light pt-[72px]">
      <div className="wrap">
        <div className="grid-12 gap-y-12 pb-24 pt-14 lg:pb-32 lg:pt-20">
          {fallback ? (
            // Submit pressed without a backend: say so plainly and take an email instead. Nothing was saved.
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
              <p className="t-small mt-4 text-dim">{applyCopy.fallback.note}</p>
              <div className="mt-10">
                <LeadForm topic={c.fallback.topic} button={c.fallback.button} />
              </div>
              <div className="mt-12 flex flex-wrap items-center gap-x-8 gap-y-4">
                <button type="button" onClick={() => setFallback(false)} className="mono ul-draw min-h-11 hover:!text-text">
                  {applyCopy.fallback.back}
                </button>
                <Button href="/programs" variant="link">
                  {c.fallback.explore}
                </Button>
              </div>
            </div>
          ) : (
          <div className="col-span-12 lg:col-span-7">
            <SheetTag sheet={c.sheet} name={c.name} />
            <Stepper className="mt-8" step={step + 1} total={STEPS.length} labels={STEPS} />

            {draft && step === 0 && !v.email && (
              <div className="card mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 px-5 py-3 text-[15px]" role="status">
                <span className="text-text">{c.resume.q}</span>
                <button
                  type="button"
                  className="ul-draw min-h-11 font-medium text-text hover:text-accent-text"
                  onClick={() => {
                    Object.entries(draft.values).forEach(([k, val]) => setValue(k as keyof ApplyValues, val as never));
                    setStep(draft.step);
                    setDraft(null);
                  }}
                >
                  {c.resume.yes}
                </button>
                <button
                  type="button"
                  className="ul-draw min-h-11 text-dim hover:text-text"
                  onClick={() => {
                    try {
                      localStorage.removeItem(DRAFT);
                    } catch {}
                    setDraft(null);
                  }}
                >
                  {c.resume.no}
                </button>
              </div>
            )}

            <form
              className="mt-12"
              onSubmit={(ev) => {
                ev.preventDefault();
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
                      <FileUpload label="CV (optional)" hint="PDF or DOC, up to 5 MB" accept=".pdf,.doc,.docx" types={CV_TYPES} file={cv} onFile={setCv} />
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
                                <input type="checkbox" value={p.slug} className="mt-1 size-4 shrink-0 accent-[var(--accent)]" {...register("programs")} />
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
                <Button type="submit" disabled={sending}>
                  {step === 4 ? (sending ? c.sending : c.submit) : c.next}
                </Button>
              </div>
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
