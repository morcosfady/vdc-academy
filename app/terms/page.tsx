import type { Metadata } from "next";
import { LegalPage } from "@/components/ui/Prose";
import { pages } from "@/content/copy-pages";

export const metadata: Metadata = { title: "Terms" };

const c = pages.terms;

export default function Terms() {
  return (
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
  );
}
