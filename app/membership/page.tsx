import type { Metadata } from "next";
import { PricingCards } from "@/components/payment/pricing-cards";
import { getMembershipPlans } from "@/lib/pricing";

export const metadata: Metadata = {
  title: "会员中心",
  description: "开通月会员、年会员，或单次解锁当前心理测评报告。"
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function MembershipPage() {
  const plans = await getMembershipPlans();

  return (
    <section className="section-shell">
      <div className="mb-8 max-w-2xl">
        <p className="eyebrow">会员中心</p>
        <h1 className="mobile-title mt-2">高级报告、历史记录与成长档案</h1>
        <p className="mt-4 leading-7 text-muted-foreground">
          免费版每日 1 次测评。会员可无限测评并查看高级报告，也可以单次解锁当前报告。
        </p>
      </div>
      <PricingCards plans={plans} />
    </section>
  );
}
