import { NextResponse, type NextRequest } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { hasServiceRoleEnv } from "@/lib/env";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { safeJson } from "@/lib/utils";

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

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const profile = await getCurrentProfile();

  if (!hasServiceRoleEnv() || !profile) {
    return noStoreJson({ error: "报告不存在" }, 404);
  }

  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("results")
    .select("*, tests(title,slug,categories(name))")
    .eq("id", id)
    .single();

  if (error || !data) {
    return noStoreJson({ error: "报告不存在" }, 404);
  }

  if (data.user_id !== profile.id && profile.role !== "ADMIN") {
    return noStoreJson({ error: "无权访问该报告" }, 403);
  }

  return noStoreJson({
    result: {
      id: data.id,
      testSlug: data.tests?.slug,
      testTitle: data.tests?.title,
      category: data.tests?.categories?.name || "测评",
      score: data.score,
      maxScore: data.max_score,
      type: data.type,
      title: safeJson(data.advanced_report, { title: "高级报告" }).title,
      summary: data.summary,
      dimensions: safeJson(data.dimensions, {}),
      advanced: safeJson(data.advanced_report, {}),
      isUnlocked: data.is_unlocked,
      createdAt: data.created_at
    }
  });
}
