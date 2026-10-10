import { discounts, earlyBird, earlyBirdStacksWithFreshGrad, type DiscountId } from "@/config/discounts";

export type PriceResult = {
  percent: number;
  final: number | null; // null while the base price is a placeholder
  saving: number | null;
  applied: string[];
};

// Discounts do not stack, except early bird + fresh grad (configurable).
export function calcPrice(base: number | null, status: DiscountId | null, early: boolean): PriceResult {
  let percent = status ? discounts[status].percent : 0;
  const applied = status ? [discounts[status].label] : [];
  if (early) {
    if (status === "freshGrad" && earlyBirdStacksWithFreshGrad) {
      percent += earlyBird.percent;
      applied.push(earlyBird.label);
    } else if (earlyBird.percent > percent) {
      percent = earlyBird.percent;
      applied.length = 0;
      applied.push(earlyBird.label);
    }
  }
  if (base === null) return { percent, final: null, saving: null, applied };
  const saving = Math.round((base * percent) / 100);
  return { percent, final: base - saving, saving, applied };
}

export const money = (n: number) => `$${n.toLocaleString("en-US")}`;
