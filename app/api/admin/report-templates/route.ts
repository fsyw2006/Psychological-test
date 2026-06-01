import { NextResponse } from "next/server";
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
  return NextResponse.json({
    tests: tests.map((test) => ({
      slug: test.slug,
      title: test.title,
      category: test.category,
      reportTemplates: test.reportTemplates
    }))
  });
}

export async function PATCH(request: Request) {
  const profile = await getCurrentProfile();
  if (hasSupabaseEnv() && profile?.role !== "ADMIN") {
    return NextResponse.json({ error: "无权访问" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body?.slug || typeof body.reportTemplates !== "object") {
    return NextResponse.json({ error: "报告模板参数错误" }, { status: 400 });
  }

  if (!hasServiceRoleEnv()) {
    return NextResponse.json({
      ok: true,
      message: "本地预览模式不会持久化报告模板，请连接 Supabase 后保存到数据库。"
    });
  }

  const supabase = createSupabaseServiceClient();
  const { error } = await supabase
    .from("tests")
    .update({
      report_templates: body.reportTemplates
    })
    .eq("slug", body.slug);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
