import { NextResponse, type NextRequest } from "next/server";
import { activatePaidOrder } from "@/lib/payments/orders";
import { verifyAlipayCallback } from "@/lib/payments/alipay";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const payload = Object.fromEntries(formData.entries()) as Record<string, string>;
    const verified = await verifyAlipayCallback(payload);

    if (!verified) {
      return new NextResponse("fail", { status: 400 });
    }

    if (payload.trade_status === "TRADE_SUCCESS" || payload.trade_status === "TRADE_FINISHED") {
      await activatePaidOrder({
        orderNo: payload.out_trade_no,
        provider: "ALIPAY",
        transactionId: payload.trade_no,
        rawPayload: payload
      });
    }

    return new NextResponse("success");
  } catch {
    return new NextResponse("fail", { status: 400 });
  }
}
