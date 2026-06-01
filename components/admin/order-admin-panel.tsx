"use client";

import { useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/utils";

type OrderRow = {
  id: string;
  order_no: string;
  product_name: string;
  amount_cents: number;
  status: string;
  created_at: string;
  users?: {
    email?: string;
    name?: string | null;
  } | null;
};

export function OrderAdminPanel({ initialOrders }: { initialOrders: OrderRow[] }) {
  const [orders, setOrders] = useState(initialOrders);
  const [status, setStatus] = useState("ALL");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function load(nextStatus = status) {
    setLoading(true);
    const response = await fetch(`/api/admin/orders?status=${nextStatus}`);
    const data = await response.json();
    setOrders(data.orders || []);
    setLoading(false);
  }

  async function markPaid(orderNo: string) {
    setLoading(true);
    setMessage("");
    const response = await fetch("/api/admin/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "markPaid", orderNo, provider: "WECHAT" })
    });
    const data = await response.json();
    setMessage(response.ok ? "订单已标记支付成功" : data.error || "操作失败");
    await load();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <select
          value={status}
          onChange={(event) => {
            setStatus(event.target.value);
            load(event.target.value);
          }}
          className="focus-ring h-11 rounded-md border border-input bg-background/70 px-3 text-sm"
        >
          <option value="ALL">全部状态</option>
          <option value="PENDING">待支付</option>
          <option value="PAID">已支付</option>
          <option value="FAILED">失败</option>
          <option value="REFUNDED">已退款</option>
        </select>
        {loading ? <Loader2 className="size-5 animate-spin text-primary" /> : null}
      </div>

      {message ? (
        <div className="rounded-md border border-primary/20 bg-primary/10 px-3 py-2 text-sm text-primary">
          {message}
        </div>
      ) : null}

      <div className="grid gap-3">
        {orders.length ? (
          orders.map((order) => (
            <Card key={order.id} className="glass-panel overflow-hidden">
              <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <CardTitle>{order.product_name}</CardTitle>
                  <p className="mt-2 break-all text-sm text-muted-foreground">
                    {order.order_no} · {order.users?.email || "未知用户"} · {formatDate(order.created_at)}
                  </p>
                </div>
                <Badge className="w-fit" variant={order.status === "PAID" ? "soft" : "outline"}>
                  {order.status}
                </Badge>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <span className="font-semibold">{formatCurrency(order.amount_cents)}</span>
                {order.status !== "PAID" ? (
                  <Button type="button" variant="outline" onClick={() => markPaid(order.order_no)}>
                    <CheckCircle2 />
                    手动标记支付成功
                  </Button>
                ) : null}
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="glass-panel rounded-lg p-8 text-center text-muted-foreground">
            暂无订单
          </div>
        )}
      </div>
    </div>
  );
}
