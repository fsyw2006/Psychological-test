import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentProfile } from "@/lib/auth";
import { hasServiceRoleEnv, hasSupabaseEnv } from "@/lib/env";
import { closeExpiredOrdersForUser, createCheckoutOrder } from "@/lib/payments/orders";
import { rateLimited } from "@/lib/security";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const orderSchema = z.object({
  plan: z.enum(["monthly", "quarterly", "yearly", "single-report"]),
  resultId: z.string().optional().nullable()
});

function noStoreJson(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate"
    }
  });
}

export async function POST(request: NextRequest) {
  const limited = rateLimited(request, "create-order");
  if (limited) return limited;

  const profile = await getCurrentProfile();
  if (hasSupabaseEnv() && !profile) {
    return noStoreJson({ error: "请先登录" }, 401);
  }

  const body = orderSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return noStoreJson({ error: "订单参数错误" }, 400);
  }

  if (body.data.plan === "single-report" && !body.data.resultId) {
    return noStoreJson(
      { error: "单次解锁需要先选择一份测评报告，请从报告页点击“立即解锁”。" },
      400
    );
  }

  try {
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

    return noStoreJson({ order });
  } catch (error) {
    return noStoreJson(
      { error: error instanceof Error ? error.message : "创建订单失败" },
      400
    );
  }
}

export async function GET() {
  const profile = await getCurrentProfile();
  if (!profile) {
    return noStoreJson({ orders: [] });
  }

  if (!hasServiceRoleEnv()) {
    return noStoreJson({ orders: [] });
  }

  await closeExpiredOrdersForUser(profile.id);

  const supabase = createSupabaseServiceClient();
  const { data } = await supabase
    .from("orders")
    .select("*")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false });

  return noStoreJson({ orders: data || [] });
}
