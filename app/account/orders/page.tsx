import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OrderStatusBadge } from "@/components/payment/order-status-badge";
import { getCurrentProfile } from "@/lib/auth";
import { hasServiceRoleEnv } from "@/lib/env";
import { closeExpiredOrdersForUser } from "@/lib/payments/orders";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { formatCurrency, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type OrderRow = {
  id: string;
  order_no: string;
  product_name: string;
  amount_cents: number;
  status: string;
  created_at: string;
  expires_at?: string | null;
};

export default async function MyOrdersPage() {
  const profile = await getCurrentProfile();
  let rows: OrderRow[] = [];

  if (profile && hasServiceRoleEnv()) {
    try {
      await closeExpiredOrdersForUser(profile.id);
      const supabase = createSupabaseServiceClient();
      const { data } = await supabase
        .from("orders")
        .select("id,order_no,product_name,amount_cents,status,created_at,expires_at")
        .eq("user_id", profile.id)
        .order("created_at", { ascending: false });
      rows = (data || []) as OrderRow[];
    } catch (error) {
      console.error("Failed to load account orders", error);
    }
  }

  return (
    <section className="section-shell">
      <div className="mb-8">
        <p className="eyebrow">我的订单</p>
        <h1 className="mobile-title mt-2">支付记录</h1>
      </div>
      <div className="grid gap-3">
        {rows.length ? (
          rows.map((row) => (
            <Card key={row.id} className="glass-panel overflow-hidden">
              <CardHeader className="mobile-card-header">
                <div className="min-w-0">
                  <CardTitle>{row.product_name}</CardTitle>
                  <p className="mt-2 break-all text-sm text-muted-foreground">
                    {row.order_no} · {formatDate(row.created_at)}
                  </p>
                </div>
                <OrderStatusBadge status={row.status} expiresAt={row.expires_at} />
              </CardHeader>
              <CardContent className="text-lg font-semibold">
                {formatCurrency(row.amount_cents)}
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="glass-panel rounded-lg p-8 text-center text-muted-foreground">
            暂无订单记录
          </div>
        )}
      </div>
    </section>
  );
}
