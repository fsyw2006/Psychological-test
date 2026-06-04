import { getPlanBySlug } from "@/lib/pricing";
import type { PlanSlug } from "@/lib/types";

export type CheckoutProduct = {
  productType:
    | "MEMBERSHIP_MONTHLY"
    | "MEMBERSHIP_QUARTERLY"
    | "MEMBERSHIP_YEARLY"
    | "REPORT_UNLOCK";
  productName: string;
  amountCents: number;
  plan: PlanSlug;
};

export async function productForPlan(plan: PlanSlug): Promise<CheckoutProduct> {
  const item = await getPlanBySlug(plan);

  if (!item) {
    throw new Error("Unknown checkout plan.");
  }

  if (plan === "monthly") {
    return {
      productType: "MEMBERSHIP_MONTHLY",
      productName: item.name,
      amountCents: item.priceCents,
      plan
    };
  }

  if (plan === "quarterly") {
    return {
      productType: "MEMBERSHIP_QUARTERLY",
      productName: item.name,
      amountCents: item.priceCents,
      plan
    };
  }

  if (plan === "yearly") {
    return {
      productType: "MEMBERSHIP_YEARLY",
      productName: item.name,
      amountCents: item.priceCents,
      plan
    };
  }

  if (plan === "single-report") {
    return {
      productType: "REPORT_UNLOCK",
      productName: item.name,
      amountCents: item.priceCents,
      plan
    };
  }

  return {
    productType: "REPORT_UNLOCK",
    productName: "免费版",
    amountCents: 0,
    plan
  };
}
