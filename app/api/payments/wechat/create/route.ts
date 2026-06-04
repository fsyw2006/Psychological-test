import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentProfile } from "@/lib/auth";
import { hasSupabaseEnv } from "@/lib/env";
import {
  getPaymentConfig,
  isPaymentChannelEnabled,
  shouldUseMockPayment
} from "@/lib/payments/config";
import { createMockPayment } from "@/lib/payments/mock";
import { createCheckoutOrder } from "@/lib/payments/orders";
import {
  createWechatNativePayment,
  ensureWechatPaymentReady
} from "@/lib/payments/wechat";
import { rateLimited } from "@/lib/security";

const schema = z.object({
  plan: z.enum(["monthly", "yearly", "single-report"]),
  resultId: z.string().optional().nullable()
});

export async function POST(request: NextRequest) {
  const limited = rateLimited(request, "wechat-create");
  if (limited) return limited;

  const json = await request.json().catch(() => null);
  const body = schema.safeParse(json);
  if (!body.success) {
    return NextResponse.json({ error: "支付参数错误" }, { status: 400 });
  }

  const profile = await getCurrentProfile();
  if (hasSupabaseEnv() && !profile) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  try {
    const paymentConfig = await getPaymentConfig();
    const useMockPayment = shouldUseMockPayment(paymentConfig, "wechat");

    if (!useMockPayment && !isPaymentChannelEnabled(paymentConfig, "wechat")) {
      return NextResponse.json(
        { error: "微信收款通道已关闭，请选择其他支付方式。" },
        { status: 400 }
      );
    }

    if (!useMockPayment) {
      await ensureWechatPaymentReady();
    }

    const order = await createCheckoutOrder({
      profile:
        profile ||
        {
          id: "00000000-0000-4000-8000-000000000001",
          email: "demo@soul-house.local",
          role: "USER"
        },
      plan: body.data.plan,
      resultId: body.data.resultId
    });

    if (useMockPayment) {
      return NextResponse.json({ order, payment: createMockPayment(order, "WECHAT") });
    }

    const payment = await createWechatNativePayment(order);
    return NextResponse.json({ order, payment });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "创建微信支付失败" },
      { status: 400 }
    );
  }
}
