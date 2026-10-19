import { faqs, type FaqItem } from "@/content/faqs";
import { Accordion } from "./Controls";

// Questions and answers as a drawing index. Defaults to the site FAQ, used on /pricing and /fresh-graduates (/faq uses FaqBrowser).
export function Faq({ items = faqs, className }: { items?: Pick<FaqItem, "q" | "a">[]; className?: string }) {
  return <Accordion className={className} items={items.map((f) => ({ q: f.q, a: <p className="max-w-[60ch]">{f.a}</p> }))} />;
}
