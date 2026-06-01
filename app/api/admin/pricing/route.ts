import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { hasServiceRoleEnv, hasSupabaseEnv } from "@/lib/env";
import { getPricingConfig, savePricingConfig } from "@/lib/pricing";

export async function GET() {
  const profile = await getCurrentProfile();
  if (hasSupabaseEnv() && profile?.role !== "ADMIN") {
    return NextResponse.json({ error: "无权访问" }, { status: 403 });
  }

  const pricing = await getPricingConfig();
  return NextResponse.json({
    pricing,
    storage: hasServiceRoleEnv() ? "database" : "memory"
  });
}

export async function PATCH(request: Request) {
  const profile = await getCurrentProfile();
  if (hasSupabaseEnv() && profile?.role !== "ADMIN") {
    return NextResponse.json({ error: "无权访问" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const pricing = await savePricingConfig(body);
    return NextResponse.json({ ok: true, pricing });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "保存失败" },
      { status: 400 }
    );
  }
}
