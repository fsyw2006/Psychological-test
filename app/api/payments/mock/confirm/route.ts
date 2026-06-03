import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentProfile } from "@/lib/auth";
import { hasServiceRoleEnv, hasSupabaseEnv } from "@/lib/env";
import { isMockPaymentEnabled } from "@/lib/payments/mock";
import { activatePaidOrder, getOrderByNo } from "@/lib/payments/orders";
import { rateLimited } from "@/lib/security";

const schema = z.object({
  orderNo: z.string().min(6),
  provider: z.enum(["WECHAT", "ALIPAY"]).default("WECHAT")
});

export async function POST(request: NextRequest) {
  const limited = rateLimited(request, "mock-payment-confirm");
  if (limited) return limited;

  if (!isMockPaymentEnabled()) {
    return NextResponse.json({ error: "Mock payment is disabled." }, { status: 404 });
  }

  const profile = await getCurrentProfile();
  if (hasSupabaseEnv() && !profile) {
    return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
  }

  const body = schema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: "Invalid mock payment payload." }, { status: 400 });
  }

  if (!hasServiceRoleEnv()) {
    return NextResponse.json(
      { error: "支付服务未完成配置：缺少 SUPABASE_SERVICE_ROLE_KEY。" },
      { status: 500 }
    );
  }

  const order = await getOrderByNo(body.data.orderNo);
  if (!order) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }

  if (profile && order.user_id !== profile.id && profile.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  try {
    const paidOrder = await activatePaidOrder({
      orderNo: body.data.orderNo,
      provider: body.data.provider,
      transactionId: `mock_${Date.now()}`,
      rawPayload: { mock: true }
    });

    const redirectUrl =
      paidOrder?.product_type === "REPORT_UNLOCK" && paidOrder.result_id
        ? `/reports/${encodeURIComponent(paidOrder.result_id)}?unlocked=1`
        : "/checkout/success";

    return NextResponse.json({
      ok: true,
      order: paidOrder,
      redirectUrl
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Payment confirmed but entitlement failed."
      },
      { status: 400 }
    );
  }
}
