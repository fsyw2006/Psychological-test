import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { hasServiceRoleEnv, hasSupabaseEnv } from "@/lib/env";
import { activatePaidOrder, closeExpiredOrders } from "@/lib/payments/orders";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function noStoreJson(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate"
    }
  });
}

export async function GET(request: Request) {
  const profile = await getCurrentProfile();
  if (hasSupabaseEnv() && profile?.role !== "ADMIN") {
    return noStoreJson({ error: "无权访问" }, 403);
  }

  if (!hasServiceRoleEnv()) return noStoreJson({ orders: [] });

  await closeExpiredOrders();

  const status = new URL(request.url).searchParams.get("status");
  const supabase = createSupabaseServiceClient();
  let query = supabase
    .from("orders")
    .select("*, users(email,name)")
    .order("created_at", { ascending: false })
    .limit(100);

  if (status && status !== "ALL") query = query.eq("status", status);
  const { data, error } = await query;

  if (error) return noStoreJson({ error: error.message }, 400);
  return noStoreJson({ orders: data || [] });
}

export async function POST(request: Request) {
  const profile = await getCurrentProfile();
  if (hasSupabaseEnv() && profile?.role !== "ADMIN") {
    return noStoreJson({ error: "无权访问" }, 403);
  }

  const body = await request.json().catch(() => null);
  if (!body?.orderNo || body.action !== "markPaid") {
    return noStoreJson({ error: "订单操作参数错误" }, 400);
  }

  if (!hasServiceRoleEnv()) {
    return noStoreJson({ error: "当前环境未连接 Supabase，无法手动标记订单。" }, 400);
  }

  try {
    await activatePaidOrder({
      orderNo: body.orderNo,
      provider: body.provider === "ALIPAY" ? "ALIPAY" : "WECHAT",
      transactionId: `admin_${Date.now()}`,
      rawPayload: { manual: true, adminId: profile?.id }
    });
  } catch (error) {
    return noStoreJson(
      { error: error instanceof Error ? error.message : "订单操作失败" },
      400
    );
  }

  return noStoreJson({ ok: true });
}
