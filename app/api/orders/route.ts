import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentProfile } from "@/lib/auth";
import { hasServiceRoleEnv, hasSupabaseEnv } from "@/lib/env";
import { createCheckoutOrder } from "@/lib/payments/orders";
import { rateLimited } from "@/lib/security";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

const orderSchema = z.object({
  plan: z.enum(["monthly", "yearly", "single-report"]),
  resultId: z.string().optional().nullable()
});

export async function POST(request: NextRequest) {
  const limited = rateLimited(request, "create-order");
  if (limited) return limited;

  const profile = await getCurrentProfile();
  if (hasSupabaseEnv() && !profile) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const body = orderSchema.safeParse(await request.json());
  if (!body.success) {
    return NextResponse.json({ error: "订单参数错误" }, { status: 400 });
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

  return NextResponse.json({ order });
}

export async function GET() {
  const profile = await getCurrentProfile();
  if (!profile) {
    return NextResponse.json({ orders: [] });
  }

  if (!hasServiceRoleEnv()) {
    return NextResponse.json({ orders: [] });
  }

  const supabase = createSupabaseServiceClient();
  const { data } = await supabase
    .from("orders")
    .select("*")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false });

  return NextResponse.json({ orders: data || [] });
}
