import type { Metadata } from "next";
import { LegalPage } from "@/components/ui/Prose";

export const metadata: Metadata = { title: "Privacy" };

export default function Privacy() {
  return (
    <LegalPage eyebrow="Legal" sheet="L-001" title={["Privacy policy"]} updated="October 2026">
      <section>
        <h2>What we collect</h2>
        <p>When you apply we collect: your name, email, phone, WhatsApp, country and city; your education and graduation details; your experience and software skills; the programs you want; and files you choose to upload (proof of graduation or student status, and optionally a CV). Messages and interest forms collect your name, email and message.</p>
      </section>
      <section>
        <h2>Why we collect it</h2>
        <ul>
          <li>To review your application and contact you about it.</li>
          <li>To check discount eligibility (fresh graduate, student, group).</li>
          <li>To plan cohorts and tell you about start dates.</li>
        </ul>
      </section>
      <section>
        <h2>How we protect it</h2>
        <p>Uploaded files are stored in a private bucket and are only opened by VDC Academy staff. We do not sell your data. We hash network addresses and never put personal data in analytics.</p>
      </section>
      <section>
        <h2>How long we keep it</h2>
        <p>We keep application data only as long as needed to process your application and enrollment. You can ask us to delete it at any time.</p>
      </section>
      <section>
        <h2>Your choices</h2>
        <p>To see, correct or delete your data, or to stop emails, use the contact page and tell us what you need. We reply within a few business days.</p>
      </section>
    </LegalPage>
  );
}
