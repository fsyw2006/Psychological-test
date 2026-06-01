import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { hasServiceRoleEnv, hasSupabaseEnv } from "@/lib/env";
import { activatePaidOrder } from "@/lib/payments/orders";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const profile = await getCurrentProfile();
  if (hasSupabaseEnv() && profile?.role !== "ADMIN") {
    return NextResponse.json({ error: "无权访问" }, { status: 403 });
  }

  if (!hasServiceRoleEnv()) return NextResponse.json({ orders: [] });

  const status = new URL(request.url).searchParams.get("status");
  const supabase = createSupabaseServiceClient();
  let query = supabase.from("orders").select("*, users(email,name)").order("created_at", { ascending: false }).limit(100);
  if (status && status !== "ALL") query = query.eq("status", status);
  const { data, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ orders: data || [] });
}

export async function POST(request: Request) {
  const profile = await getCurrentProfile();
  if (hasSupabaseEnv() && profile?.role !== "ADMIN") {
    return NextResponse.json({ error: "无权访问" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body?.orderNo || body.action !== "markPaid") {
    return NextResponse.json({ error: "订单操作参数错误" }, { status: 400 });
  }

  if (!hasServiceRoleEnv()) {
    return NextResponse.json({ error: "本地预览模式未连接 Supabase，无法手动标记订单。" }, { status: 400 });
  }

  await activatePaidOrder({
    orderNo: body.orderNo,
    provider: body.provider === "ALIPAY" ? "ALIPAY" : "WECHAT",
    transactionId: `admin_${Date.now()}`,
    rawPayload: { manual: true, adminId: profile?.id }
  });

  return NextResponse.json({ ok: true });
}
