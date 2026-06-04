import { redirect } from "next/navigation";
import { PricingAdminForm } from "@/components/admin/pricing-admin-form";
import { getCurrentProfile } from "@/lib/auth";
import { hasServiceRoleEnv, hasSupabaseEnv } from "@/lib/env";
import { getPricingConfig } from "@/lib/pricing";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminPricingPage() {
  const profile = await getCurrentProfile();
  if (hasSupabaseEnv() && profile?.role !== "ADMIN") redirect("/account");

  const pricing = await getPricingConfig();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">定价管理</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          修改免费权益、单次解锁、月会员、季会员和年会员价格。保存后前台价格和订单金额同步生效。
        </p>
      </div>
      <PricingAdminForm
        initialPlans={pricing.plans}
        initialDailyFreeTests={pricing.dailyFreeTests}
        storage={hasServiceRoleEnv() ? "database" : "memory"}
      />
    </div>
  );
}
