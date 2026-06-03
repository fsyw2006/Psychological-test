import { NextResponse, type NextRequest } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { activatePaidOrder, getOrderByNo } from "@/lib/payments/orders";
import { queryWechatOrder } from "@/lib/payments/wechat";
import { rateLimited } from "@/lib/security";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PaymentProvider = "WECHAT" | "ALIPAY";

function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate"
    }
  });
}

function normalizeProvider(value: string | null): PaymentProvider {
  return value?.toLowerCase() === "alipay" ? "ALIPAY" : "WECHAT";
}

function redirectUrlForOrder(order: Awaited<ReturnType<typeof getOrderByNo>>) {
  if (order?.product_type === "REPORT_UNLOCK" && order.result_id) {
    return `/reports/${encodeURIComponent(order.result_id)}?unlocked=1`;
  }

  return "/checkout/success";
}

export async function GET(request: NextRequest) {
  const limited = rateLimited(request, "payment-query");
  if (limited) return limited;

  const orderNo = request.nextUrl.searchParams.get("orderNo");
  const provider = normalizeProvider(request.nextUrl.searchParams.get("provider"));

  if (!orderNo) {
    return json({ error: "缺少订单号。" }, 400);
  }

  const profile = await getCurrentProfile();
  if (!profile) {
    return json({ error: "请先登录后再查询订单。" }, 401);
  }

  const order = await getOrderByNo(orderNo);
  if (!order) {
    return json({ error: "订单不存在。" }, 404);
  }

  if (order.user_id !== profile.id && profile.role !== "ADMIN") {
    return json({ error: "无权查询该订单。" }, 403);
  }

  if (order.status === "PAID") {
    const paidOrder = await activatePaidOrder({
      orderNo,
      provider,
      rawPayload: { source: "local-paid-sync" }
    });

    return json({
      ok: true,
      paid: true,
      order: paidOrder || order,
      providerState: { tradeState: "SUCCESS" },
      redirectUrl: redirectUrlForOrder(paidOrder || order)
    });
  }

  if (provider === "ALIPAY") {
    return json({
      ok: true,
      paid: false,
      order,
      providerState: {
        tradeState: "QUERY_NOT_CONFIGURED",
        message: "支付宝真实查单接口尚未接入，请以后使用支付宝异步回调确认支付。"
      }
    });
  }

  const providerState = await queryWechatOrder(orderNo);
  if (providerState.tradeState === "SUCCESS") {
    const paidOrder = await activatePaidOrder({
      orderNo,
      provider: "WECHAT",
      rawPayload: providerState
    });

    return json({
      ok: true,
      paid: true,
      order: paidOrder,
      providerState,
      redirectUrl: redirectUrlForOrder(paidOrder)
    });
  }

  return json({
    ok: true,
    paid: false,
    order,
    providerState
  });
}
