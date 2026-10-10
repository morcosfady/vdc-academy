// All discount rules live here. Percentages and rules are DEFAULTS until the owner confirms them.
export type DiscountId = "freshGrad" | "student" | "group";

export type Discount = {
  id: DiscountId;
  emoji: string;
  label: string;
  percent: number;
  who: string;
  proof: string;
};

export const discounts: Record<DiscountId, Discount> = {
  freshGrad: { id: "freshGrad", emoji: "🎓", label: "Fresh Graduate", percent: 40, who: "Graduated within the last 24 months", proof: "Graduation certificate or transcript" },
  student: { id: "student", emoji: "📚", label: "Current student", percent: 25, who: "Enrolled in engineering, architecture or construction", proof: "Student ID" },
  group: { id: "group", emoji: "👥", label: "Group / company", percent: 15, who: "3 or more people from the same company", proof: "Approved by an admin" },
};

export const earlyBird = { emoji: "⏰", label: "Early bird", percent: 10, daysBeforeStart: 30, who: "Apply 30+ days before the cohort starts" };

// Early bird can stack with the fresh grad discount. Every other combination takes the single best discount.
export const earlyBirdStacksWithFreshGrad = true;

export const freshGradMonths = 24;
