import { NextResponse, type NextRequest } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { hasServiceRoleEnv } from "@/lib/env";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const profile = await getCurrentProfile();
  if (!profile || !hasServiceRoleEnv()) {
    return NextResponse.json({ error: "订单不存在" }, { status: 404 });
  }

  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase.from("orders").select("*").eq("id", id).single();
  if (error || !data || (data.user_id !== profile.id && profile.role !== "ADMIN")) {
    return NextResponse.json({ error: "订单不存在" }, { status: 404 });
  }

  return NextResponse.json({ order: data });
}
