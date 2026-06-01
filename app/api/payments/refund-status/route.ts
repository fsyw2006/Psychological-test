import { NextResponse, type NextRequest } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { hasServiceRoleEnv } from "@/lib/env";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const orderNo = request.nextUrl.searchParams.get("orderNo");
  const profile = await getCurrentProfile();
  if (!orderNo || !profile || !hasServiceRoleEnv()) {
    return NextResponse.json({ status: "UNKNOWN" });
  }

  const supabase = createSupabaseServiceClient();
  const { data } = await supabase
    .from("orders")
    .select("id,user_id,payments(status,refunded_cents)")
    .eq("order_no", orderNo)
    .single();

  if (!data || (data.user_id !== profile.id && profile.role !== "ADMIN")) {
    return NextResponse.json({ status: "UNKNOWN" });
  }

  return NextResponse.json({
    status: data.payments?.[0]?.status || "PENDING",
    refundedCents: data.payments?.[0]?.refunded_cents || 0
  });
}
