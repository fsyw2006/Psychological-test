import { NextResponse, type NextRequest } from "next/server";
import { getOrderByNo } from "@/lib/payments/orders";
import { queryWechatOrder } from "@/lib/payments/wechat";

export async function GET(request: NextRequest) {
  const orderNo = request.nextUrl.searchParams.get("orderNo");
  const provider = request.nextUrl.searchParams.get("provider") || "wechat";

  if (!orderNo) {
    return NextResponse.json({ error: "缺少订单号" }, { status: 400 });
  }

  const order = await getOrderByNo(orderNo);
  const providerState = provider === "wechat" ? await queryWechatOrder(orderNo) : null;
  return NextResponse.json({
    order,
    providerState
  });
}
