import type { Metadata } from "next";
import { LegalPage } from "@/components/ui/Prose";
import { pageMeta } from "@/components/seo/meta";
import { JsonLd, breadcrumbLd } from "@/components/seo/JsonLd";
import { pages } from "@/content/copy-pages";

export const metadata: Metadata = pageMeta({ title: "Terms of Use", description: "The terms for using the VDC Academy website, creating a student account and applying to BIM and VDC programs run by Bay BIM Designs.", path: "/terms/" });

const c = pages.terms;

export default function Terms() {
  return (
    <>
      <JsonLd data={breadcrumbLd([{ name: "Terms of use", path: "/terms/" }])} />
      <LegalPage eyebrow={pages.legal.name} sheet={c.sheet} title={[c.title]} updated={c.updated}>
        {c.sections.map((s) => (
          <section key={s.h}>
            <h2>{s.h}</h2>
            {s.p?.map((t) => <p key={t}>{t}</p>)}
            {s.items ? (
              <ul>
                {s.items.map((t) => <li key={t}>{t}</li>)}
              </ul>
            ) : null}
            {s.after?.map((t) => <p key={t}>{t}</p>)}
          </section>
        ))}
      </LegalPage>
    </>
  );
}
