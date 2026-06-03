import type { Metadata } from "next";
import { CheckoutPanel } from "@/components/payment/checkout-panel";
import { getMembershipPlans } from "@/lib/pricing";
import type { PlanSlug } from "@/lib/types";

export const metadata: Metadata = {
  title: "收银台",
  description: "微信支付与支付宝支付收银台。"
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function CheckoutPage({
  searchParams
}: {
  searchParams: Promise<{ plan?: PlanSlug; resultId?: string }>;
}) {
  const { plan = "monthly", resultId } = await searchParams;
  const safePlan: PlanSlug = ["monthly", "yearly", "single-report"].includes(plan)
    ? plan
    : "monthly";
  const plans = await getMembershipPlans();

  return (
    <section className="section-shell">
      <div className="mb-8 text-center">
        <p className="eyebrow">收银台</p>
        <h1 className="mobile-title mt-2">安全完成支付</h1>
      </div>
      <CheckoutPanel plan={safePlan} resultId={resultId} plans={plans} />
    </section>
  );
}
