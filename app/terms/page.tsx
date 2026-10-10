import type { Metadata } from "next";
import { LegalPage } from "@/components/ui/Prose";

export const metadata: Metadata = { title: "Terms" };

export default function Terms() {
  return (
    <LegalPage eyebrow="Legal" title={["Terms of use"]} updated="October 2026">
      <section>
        <h2>Applications</h2>
        <p>Applying does not guarantee a seat. We review each application and reply within 1 to 2 business days. An advisor may contact you before enrollment.</p>
      </section>
      <section>
        <h2>Discounts</h2>
        <p>Discounts are pending until we verify your document. Fresh graduate: graduated within the last 24 months. Student: currently enrolled. Group: three or more people from the same company. Early bird: applying 30 or more days before the cohort starts. Discounts do not combine, except early bird with the fresh graduate discount. We can withdraw a discount if the document does not match the application.</p>
      </section>
      <section>
        <h2>Enrollment and payment</h2>
        <p>Prices, payment options and cohort dates are confirmed in your acceptance message before you pay anything.</p>
      </section>
      <section>
        <h2>Refunds</h2>
        <p>Refund terms are shared with your acceptance message, before payment.</p>
      </section>
      <section>
        <h2>Certificates</h2>
        <p>A certificate of completion from VDC Academy by Bay BIM Designs is issued when you finish a program.</p>
      </section>
    </LegalPage>
  );
}
