import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentProfile } from "@/lib/auth";
import { hasServiceRoleEnv } from "@/lib/env";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { formatCurrency, formatDate } from "@/lib/utils";

export default async function MyOrdersPage() {
  const profile = await getCurrentProfile();
  let rows: any[] = [];

  if (profile && hasServiceRoleEnv()) {
    const supabase = createSupabaseServiceClient();
    const { data } = await supabase
      .from("orders")
      .select("*")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false });
    rows = data || [];
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
                <Badge className="w-fit" variant={row.status === "PAID" ? "soft" : "outline"}>
                  {row.status}
                </Badge>
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
