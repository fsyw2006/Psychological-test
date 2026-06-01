import { NextResponse, type NextRequest } from "next/server";
import { activatePaidOrder } from "@/lib/payments/orders";
import { parseWechatCallback, verifyWechatCallbackSignature } from "@/lib/payments/wechat";

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const verified = await verifyWechatCallbackSignature({
      body: rawBody,
      timestamp: request.headers.get("Wechatpay-Timestamp"),
      nonce: request.headers.get("Wechatpay-Nonce"),
      signature: request.headers.get("Wechatpay-Signature")
    });
    if (!verified) {
      return NextResponse.json({ code: "FAIL", message: "验签失败" }, { status: 400 });
    }
    const payload = await parseWechatCallback(JSON.parse(rawBody));
    if (payload.trade_state === "SUCCESS") {
      await activatePaidOrder({
        orderNo: payload.out_trade_no,
        provider: "WECHAT",
        transactionId: payload.transaction_id,
        rawPayload: payload
      });
    }
    return NextResponse.json({ code: "SUCCESS", message: "成功" });
  } catch (error) {
    return NextResponse.json(
      {
        code: "FAIL",
        message: error instanceof Error ? error.message : "回调处理失败"
      },
      { status: 400 }
    );
  }
}
