import type { Metadata } from "next";
import { PageHero } from "@/components/ui/PageHero";
import { Faq } from "@/components/home/Closing";
import { faqs } from "@/content/faqs";

export const metadata: Metadata = { title: "FAQ", description: "Answers about VDC Academy programs, discounts and applying." };

const more = [
  { q: "How do I apply?", a: "Use the Apply button. It takes five short steps: about you, your education, your experience, the program you want, and a review." },
  { q: "What files can I upload?", a: "Your graduation certificate or student ID, and optionally a CV. PDF, JPG or PNG for proof, PDF or DOC for a CV, up to 5 MB each." },
  { q: "Are programs online or in person?", a: "Formats are being confirmed per program. The application lets you choose online, in person in Fort Worth, TX, or hybrid." },
  { q: "Do you issue a certificate?", a: "Yes. You receive a certificate of completion from VDC Academy by Bay BIM Designs." },
  { q: "Can my company train a team?", a: "Yes. See the For Companies page or contact us." },
];

export default function FaqPage() {
  return (
    <>
      <PageHero eyebrow="FAQ" title={["Questions,", "answered."]} />
      <section className="mx-auto max-w-4xl px-5 pb-32 md:px-10">
        <Faq items={[...faqs, ...more]} />
      </section>
    </>
  );
}
