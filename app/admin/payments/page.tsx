import { redirect } from "next/navigation";
import { PaymentChannelPanel } from "@/components/admin/payment-channel-panel";
import { getCurrentProfile } from "@/lib/auth";
import { hasSupabaseEnv } from "@/lib/env";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminPaymentsPage() {
  const profile = await getCurrentProfile();
  if (hasSupabaseEnv() && profile?.role !== "ADMIN") redirect("/account");

  return (
    <div>
      <div className="mb-6 max-w-2xl">
        <h2 className="text-2xl font-semibold sm:text-3xl">收款通道</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          这里可以控制微信支付和支付宝是否出现在前端收银台。关闭某个收款方式后，前端不会显示，也不能创建该方式的订单；密钥字段留空表示不修改原值。
        </p>
      </div>
      <PaymentChannelPanel />
    </div>
  );
}
