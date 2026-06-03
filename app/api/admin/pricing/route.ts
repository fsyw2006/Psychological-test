import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { hasServiceRoleEnv, hasSupabaseEnv } from "@/lib/env";
import { getPricingConfig, savePricingConfig } from "@/lib/pricing";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function noStoreJson(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store"
    }
  });
}

export async function GET() {
  const profile = await getCurrentProfile();
  if (hasSupabaseEnv() && profile?.role !== "ADMIN") {
    return noStoreJson({ error: "无权访问" }, 403);
  }

  const pricing = await getPricingConfig();
  return noStoreJson({
    pricing,
    storage: hasServiceRoleEnv() ? "database" : "memory"
  });
}

export async function PATCH(request: Request) {
  const profile = await getCurrentProfile();
  if (hasSupabaseEnv() && profile?.role !== "ADMIN") {
    return noStoreJson({ error: "无权访问" }, 403);
  }

  try {
    const body = await request.json();
    const pricing = await savePricingConfig(body);
    return noStoreJson({ ok: true, pricing });
  } catch (error) {
    return noStoreJson(
      { error: error instanceof Error ? error.message : "保存失败" },
      400
    );
  }
}
