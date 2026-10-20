import type { Metadata } from "next";
import Image from "next/image";
import { PageHero } from "@/components/ui/PageHero";
import { Button } from "@/components/ui/Button";
import { Slab } from "@/components/ui/Slab";
import { TeachForm } from "@/components/forms/TeachForm";
import { content, hasInstructors } from "@/content/site";
import { pages } from "@/content/copy-pages";
import { pageMeta } from "@/components/seo/meta";
import { JsonLd, breadcrumbLd } from "@/components/seo/JsonLd";

export const metadata: Metadata = pageMeta({ title: "BIM and VDC Instructors", description: "VDC Academy instructors are working BIM coordinators and VDC engineers from Bay BIM Designs. They teach what they did on real jobs that week.", path: "/instructors/", robots: hasInstructors() ? undefined : { index: false } });

const c = pages.instructors;
const rule = { borderColor: "var(--rule)" } as const;

// A line-drawn silhouette: hard hat, head and shoulders, no face. currentColor, 1.25px strokes.
function Silhouette() {
  const s = { fill: "none", stroke: "currentColor", strokeWidth: 1.25, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, vectorEffect: "non-scaling-stroke" as const };
  return (
    <svg viewBox="0 0 200 160" aria-hidden className="h-auto w-full">
      {/* hard hat: crown, brim, the ridge */}
      <path d="M66 70c0-22 15-38 34-38s34 16 34 38" {...s} />
      <path d="M54 72c6-5 24-8 46-8s40 3 46 8c-6 5-24 8-46 8s-40-3-46-8z" {...s} />
      <path d="M96 32v-6h8v6" {...s} />
      <path d="M86 44h28" {...s} opacity="0.5" />
      {/* head: a soft jaw under the brim */}
      <path d="M72 78c2 22 12 38 28 38s26-16 28-38" {...s} />
      {/* neck and shoulders */}
      <path d="M90 114v12M110 114v12" {...s} />
      <path d="M28 160c6-22 30-34 62-36h20c32 2 56 14 62 36" {...s} />
      {/* collar */}
      <path d="M90 126l10 10 10-10" {...s} />
    </svg>
  );
}

function RealProfiles() {
  return (
    <>
      <PageHero sheet={c.sheet} eyebrow={c.name} title={[c.title]} />
      <section className="theme-light section !pt-12 lg:!pt-16">
        <ul className="wrap grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {content.instructors.map((i) => (
            <li key={i.name} className="card overflow-hidden">
              {i.photo && (
                <div className="aspect-[4/5] bg-paper-2">
                  <Image src={i.photo} alt="" width={400} height={500} className="h-full w-full object-cover" />
                </div>
              )}
              <div className="p-6">
                <h2 className="!text-[1.25rem]">{i.name}</h2>
                <p className="mono mt-2">
                  {i.role}
                  {i.years ? ` · ${c.years(i.years)}` : ""}
                </p>
                {i.bio && <p className="t-small mt-4 text-muted">{i.bio}</p>}
                {i.linkedin && (
                  <p className="mt-4">
                    <a href={i.linkedin} className="ul-draw pb-0.5 text-[15px] font-medium text-text hover:text-accent-text">
                      LinkedIn
                    </a>
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

// No names yet: the profile of who teaches, three role silhouettes, and the teach-with-us form.
function Profile() {
  return (
    <>
      <PageHero sheet={c.sheet} eyebrow={c.name} title={[c.emptyTitle]} subtitle={c.emptyLead}>
        <Button href="/apply">{pages.empty.primary}</Button>
        <Button href="/programs" variant="link">
          {pages.empty.secondary}
        </Button>
      </PageHero>

      <section className="theme-light section !pt-12 lg:!pt-16" aria-labelledby="profile">
        <div className="wrap">
          <div className="grid-12 gap-y-10">
            <div className="col-span-12 lg:col-span-4">
              <h2 id="profile" className="t-h3">
                {c.profile.title}
              </h2>
            </div>
            <div className="col-span-12 grid gap-10 lg:col-span-8 lg:grid-cols-[1fr_minmax(0,260px)] lg:gap-14">
              <div className="max-w-[60ch]">
                {c.profile.text.map((p) => (
                  <p key={p.slice(0, 24)} className="t-body mt-6 text-muted first:mt-0">
                    {p}
                  </p>
                ))}
              </div>
              <div>
                <p className="mono">{c.profile.weekLabel}</p>
                <ul className="mt-3 border-t" style={rule}>
                  {c.profile.week.map((w, i) => (
                    <li key={w} className="grid grid-cols-[2rem_1fr] gap-x-2 border-b py-3 text-[15px] text-muted" style={rule}>
                      <span className="mono pt-0.5">{String(i + 1).padStart(2, "0")}</span>
                      {w}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="theme-light section !pt-0" aria-labelledby="roles">
        <div className="wrap">
          <h2 id="roles" className="t-h3">
            {c.roles.title}
          </h2>
          <ul className="mt-10 grid gap-6 sm:grid-cols-3">
            {c.roles.items.map((r, i) => (
              <Slab as="li" key={r.t} index={i} className="card overflow-hidden">
                <div className="bg-paper-2 px-10 pt-8 text-slate">
                  <Silhouette />
                </div>
                <div className="p-6">
                  <p className="mono">{String(i + 1).padStart(2, "0")}</p>
                  <h3 className="mt-2 !text-[1.25rem]">{r.t}</h3>
                  <p className="t-small mt-2 text-dim">{r.d}</p>
                </div>
              </Slab>
            ))}
          </ul>
        </div>
      </section>

      <section className="theme-light section !pt-0" aria-labelledby="teach">
        <div className="wrap">
          <Slab>
            <div className="grid gap-10 rounded-[12px] bg-paper-2 p-7 md:p-12 lg:grid-cols-12 lg:gap-6 lg:p-16">
              <div className="lg:col-span-5">
                <h2 id="teach" className="t-h2 max-w-[14ch]">
                  {c.teach.title}
                </h2>
                <p className="t-body mt-5 text-muted">{c.teach.lead}</p>
              </div>
              <div className="lg:col-span-6 lg:col-start-7">
                <TeachForm />
              </div>
            </div>
          </Slab>
        </div>
      </section>
    </>
  );
}

export default function InstructorsPage() {
  return (
    <>
      <JsonLd data={breadcrumbLd([{ name: "Instructors", path: "/instructors/" }])} />
      {hasInstructors() ? <RealProfiles /> : <Profile />}
    </>
  );
}
