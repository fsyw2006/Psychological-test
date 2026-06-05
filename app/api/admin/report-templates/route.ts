import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/auth";
import { getAssessmentCatalog } from "@/lib/content";
import { hasServiceRoleEnv, hasSupabaseEnv } from "@/lib/env";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import type { ReportTemplate } from "@/lib/types";

function premiumContent(template: ReportTemplate) {
  return {
    traits: template.traits || [],
    strengths: template.strengths || [],
    risks: template.risks || [],
    growth: template.growth || [],
    careers: template.careers || [],
    relationships: template.relationships || []
  };
}

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
  const { data: testRow, error: readError } = await supabase
    .from("tests")
    .select("id,categories(name)")
    .eq("slug", body.slug)
    .single();

  if (readError || !testRow) {
    return NextResponse.json(
      { error: readError?.message || "测评不存在" },
      { status: 400 }
    );
  }

  const reportTemplates = body.reportTemplates as Record<string, ReportTemplate>;
  const resultTypes = Object.keys(reportTemplates);

  const { error: updateError } = await supabase
    .from("tests")
    .update({
      report_templates: reportTemplates
    })
    .eq("slug", body.slug);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 });
  }

  const rows = Object.entries(reportTemplates).map(([resultType, template]) => ({
    test_id: testRow.id,
    result_type: resultType,
    basic_content: {
      title: template.title,
      summary: template.summary
    },
    premium_content: premiumContent(template),
    suggestions: template.growth || [],
    category:
      (testRow.categories as { name?: string } | null | undefined)?.name || "测评",
    is_active: true
  }));

  if (rows.length) {
    const { error: upsertError } = await supabase.from("report_templates").upsert(rows, {
      onConflict: "test_id,result_type"
    });

    if (upsertError) {
      return NextResponse.json({ error: upsertError.message }, { status: 400 });
    }

    const keepList = resultTypes.map((resultType) => JSON.stringify(resultType)).join(",");
    if (keepList) {
      const { error: deleteError } = await supabase
        .from("report_templates")
        .delete()
        .eq("test_id", testRow.id)
        .not("result_type", "in", `(${keepList})`);

      if (deleteError) {
        return NextResponse.json({ error: deleteError.message }, { status: 400 });
      }
    }
  } else {
    const { error: deleteError } = await supabase
      .from("report_templates")
      .delete()
      .eq("test_id", testRow.id);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 400 });
    }
  }

  revalidatePath("/admin/reports");
  revalidatePath("/admin/tests");
  revalidatePath("/tests");

  return NextResponse.json({
    ok: true,
    reportTemplates,
    resultType: resultTypes[0] || "默认"
  });
}
