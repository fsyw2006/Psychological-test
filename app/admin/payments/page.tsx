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
          这里可以填写微信支付和支付宝的生产收款参数。私钥和 API Key 会由服务端保存，页面只显示脱敏状态；留空密钥字段表示不修改原值。
        </p>
      </div>
      <PaymentChannelPanel />
    </div>
  );
}
