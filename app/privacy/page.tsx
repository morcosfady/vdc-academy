import type { Metadata } from "next";
import { LegalPage } from "@/components/ui/Prose";
import { pageMeta } from "@/components/seo/meta";
import { JsonLd, breadcrumbLd } from "@/components/seo/JsonLd";
import { pages } from "@/content/copy-pages";

export const metadata: Metadata = pageMeta({ title: "Privacy Policy", description: "How VDC Academy by Bay BIM Designs handles the personal data you share on this site when you visit, create an account or apply to a program.", path: "/privacy/" });

const c = pages.privacy;

export default function Privacy() {
  return (
    <>
      <JsonLd data={breadcrumbLd([{ name: "Privacy policy", path: "/privacy/" }])} />
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
