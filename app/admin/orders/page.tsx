import { redirect } from "next/navigation";
import { OrderAdminPanel } from "@/components/admin/order-admin-panel";
import { getCurrentProfile } from "@/lib/auth";
import { hasServiceRoleEnv, hasSupabaseEnv } from "@/lib/env";
import { closeExpiredOrders } from "@/lib/payments/orders";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminOrdersPage() {
  const profile = await getCurrentProfile();
  if (hasSupabaseEnv() && profile?.role !== "ADMIN") redirect("/account");

  let orders: any[] = [];

  if (hasServiceRoleEnv()) {
    await closeExpiredOrders();
    const supabase = createSupabaseServiceClient();
    const { data } = await supabase
      .from("orders")
      .select("*, users(email,name)")
      .order("created_at", { ascending: false })
      .limit(100);
    orders = data || [];
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">订单管理</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          查看订单列表、筛选支付状态，15 分钟未支付的订单会自动关闭，也支持人工核验后手动标记支付成功。
        </p>
      </div>
      <OrderAdminPanel initialOrders={orders} />
    </div>
  );
}
