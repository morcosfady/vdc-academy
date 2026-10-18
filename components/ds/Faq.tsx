import { faqs, type FaqItem } from "@/content/faqs";
import { Accordion } from "./Controls";

// Questions and answers as a drawing index. Defaults to the site FAQ, used on /faq, /pricing and /fresh-graduates.
export function Faq({ items = faqs, className }: { items?: FaqItem[]; className?: string }) {
  return <Accordion className={className} items={items.map((f) => ({ q: f.q, a: <p className="max-w-[60ch]">{f.a}</p> }))} />;
}
