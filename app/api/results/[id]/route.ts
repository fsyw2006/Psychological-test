import { NextResponse, type NextRequest } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { reportAdvancedSource } from "@/lib/ai-report";
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

  let isUnlocked = Boolean(data.is_unlocked);
  if (!isUnlocked) {
    const now = new Date().toISOString();
    const [{ data: paidOrder }, { data: membership }] = await Promise.all([
      supabase
        .from("orders")
        .select("id")
        .eq("result_id", id)
        .eq("user_id", data.user_id)
        .eq("product_type", "REPORT_UNLOCK")
        .eq("status", "PAID")
        .limit(1)
        .maybeSingle(),
      supabase
        .from("memberships")
        .select("id")
        .eq("user_id", data.user_id)
        .eq("status", "ACTIVE")
        .or(`ends_at.is.null,ends_at.gt.${now}`)
        .order("ends_at", { ascending: false, nullsFirst: true })
        .order("starts_at", { ascending: false })
        .limit(1)
        .maybeSingle()
    ]);

    if (paidOrder || membership) {
      isUnlocked = true;
      await supabase
        .from("results")
        .update({
          is_unlocked: true,
          access_type: paidOrder ? "SINGLE_PURCHASE" : "MEMBERSHIP"
        })
        .eq("id", id);
    }
  }
  const advanced = safeJson(data.advanced_report, {});

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
      advanced,
      advancedSource: reportAdvancedSource(advanced),
      isUnlocked,
      createdAt: data.created_at
    }
  });
}
