import { addMonths, addYears } from "date-fns";
import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { hasServiceRoleEnv, hasSupabaseEnv } from "@/lib/env";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export async function GET() {
  const profile = await getCurrentProfile();
  if (hasSupabaseEnv() && profile?.role !== "ADMIN") {
    return NextResponse.json({ error: "无权访问" }, { status: 403 });
  }

  if (!hasServiceRoleEnv()) {
    return NextResponse.json({ memberships: [] });
  }

  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("memberships")
    .select("*, users(email,name)")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ memberships: data || [] });
}

export async function POST(request: Request) {
  const profile = await getCurrentProfile();
  if (hasSupabaseEnv() && profile?.role !== "ADMIN") {
    return NextResponse.json({ error: "无权访问" }, { status: 403 });
  }

  if (!hasServiceRoleEnv()) {
    return NextResponse.json({ error: "本地预览模式未连接 Supabase，无法手动调整会员。" }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const supabase = createSupabaseServiceClient();

  if (body?.action === "cancel" && body.membershipId) {
    const { error } = await supabase
      .from("memberships")
      .update({ status: "CANCELLED" })
      .eq("id", body.membershipId);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  }

  if (body?.action === "open" && body.email) {
    const plan = body.plan === "YEARLY" ? "YEARLY" : "MONTHLY";
    const now = new Date();
    const endsAt = plan === "YEARLY" ? addYears(now, 1) : addMonths(now, 1);
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("email", String(body.email).trim())
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 });
    }

    const { error } = await supabase.from("memberships").insert({
      user_id: user.id,
      plan,
      status: "ACTIVE",
      starts_at: now.toISOString(),
      ends_at: endsAt.toISOString()
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "会员操作参数错误" }, { status: 400 });
}
