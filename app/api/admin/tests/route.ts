import { NextResponse, type NextRequest } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { getAssessmentCatalog } from "@/lib/content";
import { hasServiceRoleEnv, hasSupabaseEnv } from "@/lib/env";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export async function GET() {
  const profile = await getCurrentProfile();
  if (hasSupabaseEnv() && profile?.role !== "ADMIN") {
    return NextResponse.json({ error: "无权访问" }, { status: 403 });
  }
  const tests = await getAssessmentCatalog();
  return NextResponse.json({ tests });
}

export async function PATCH(request: NextRequest) {
  const profile = await getCurrentProfile();
  if (hasSupabaseEnv() && profile?.role !== "ADMIN") {
    return NextResponse.json({ error: "无权访问" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body?.slug) {
    return NextResponse.json({ error: "缺少测评标识" }, { status: 400 });
  }

  if (!hasServiceRoleEnv()) {
    return NextResponse.json({
      ok: true,
      message: "本地预览模式不会持久化测评配置，请连接 Supabase 后保存到数据库。"
    });
  }

  const supabase = createSupabaseServiceClient();
  let categoryId: string | null = null;

  if (body.categorySlug) {
    const { data: category } = await supabase
      .from("categories")
      .select("id")
      .eq("slug", body.categorySlug)
      .eq("type", "TEST")
      .single();
    categoryId = category?.id || null;
  }

  const patch: Record<string, unknown> = {
    estimated_minutes: Number(body.estimatedMinutes || 5),
    tags: Array.isArray(body.tags) ? body.tags : [],
    status: body.enabled ? "PUBLISHED" : "ARCHIVED"
  };

  if (categoryId) patch.category_id = categoryId;

  const { error } = await supabase.from("tests").update(patch).eq("slug", body.slug);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
