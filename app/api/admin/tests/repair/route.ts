import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdminProfile } from "@/lib/auth";
import { assessmentCategories, assessments } from "@/lib/demo-data";
import { hasServiceRoleEnv } from "@/lib/env";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function questionType(type: string) {
  if (type === "multiple") return "MULTIPLE";
  if (type === "likert") return "LIKERT";
  return "SINGLE";
}

function premiumContent(template: Record<string, unknown>) {
  return {
    traits: template.traits || [],
    strengths: template.strengths || [],
    risks: template.risks || [],
    growth: template.growth || [],
    careers: template.careers || [],
    relationships: template.relationships || []
  };
}

const BATCH_SIZE = 3;

export async function POST(request: NextRequest) {
  await requireAdminProfile();

  if (!hasServiceRoleEnv()) {
    return NextResponse.json(
      {
        error:
          "题库恢复失败：Cloudflare 缺少 SUPABASE_SERVICE_ROLE_KEY，无法写入 Supabase 数据库。"
      },
      { status: 503 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const cursor = Math.max(0, Number(body?.cursor || 0));
  const batch = assessments.slice(cursor, cursor + BATCH_SIZE);
  const supabase = createSupabaseServiceClient();

  const { error: categoryError } = await supabase.from("categories").upsert(
    assessmentCategories.map((category, index) => ({
      slug: category.slug,
      name: category.name,
      description: category.description,
      type: "TEST",
      sort_order: index
    })),
    {
      onConflict: "slug,type"
    }
  );

  if (categoryError) {
    return NextResponse.json({ error: categoryError.message }, { status: 400 });
  }

  const { data: categoryRows, error: categoryReadError } = await supabase
    .from("categories")
    .select("id,slug")
    .eq("type", "TEST");

  if (categoryReadError) {
    return NextResponse.json({ error: categoryReadError.message }, { status: 400 });
  }

  const categoryIds = new Map((categoryRows || []).map((category) => [category.slug, category.id]));

  let repairedTests = 0;
  let repairedQuestions = 0;
  let repairedTemplates = 0;

  for (const test of batch) {
    const categoryId = categoryIds.get(test.categorySlug);
    if (!categoryId) continue;

    const { data: testRow, error: testError } = await supabase
      .from("tests")
      .upsert(
        {
          slug: test.slug,
          title: test.title,
          subtitle: test.subtitle,
          description: test.description,
          category_id: categoryId,
          estimated_minutes: test.estimatedMinutes,
          status: "PUBLISHED",
          is_premium: Boolean(test.isPremium),
          price_cents: test.priceCents || 0,
          tags: test.tags,
          scoring: test.scoring,
          report_templates: test.reportTemplates
        },
        {
          onConflict: "slug"
        }
      )
      .select("id")
      .single();

    if (testError || !testRow?.id) {
      return NextResponse.json(
        { error: testError?.message || `${test.title} 恢复失败` },
        { status: 400 }
      );
    }

    repairedTests += 1;

    const questionRows = test.questions.map((question, index) => ({
      test_id: testRow.id,
      order: index + 1,
      type: questionType(question.type),
      title: question.title,
      helper: question.helper || null,
      required: question.required ?? true,
      min: question.min || null,
      max: question.max || null,
      dimension: question.dimension || null,
      options: question.options
    }));

    const { error: questionError } = await supabase.from("questions").upsert(questionRows, {
      onConflict: "test_id,order"
    });

    if (questionError) {
      return NextResponse.json({ error: questionError.message }, { status: 400 });
    }

    await supabase
      .from("questions")
      .delete()
      .eq("test_id", testRow.id)
      .gt("order", questionRows.length);

    repairedQuestions += questionRows.length;

    const templateRows = Object.entries(test.reportTemplates).map(([resultType, template]) => ({
      test_id: testRow.id,
      result_type: resultType,
      basic_content: {
        title: template.title,
        summary: template.summary
      },
      premium_content: premiumContent(template),
      suggestions: template.growth,
      category: test.category,
      is_active: true
    }));

    const { error: templateError } = await supabase
      .from("report_templates")
      .upsert(templateRows, {
        onConflict: "test_id,result_type"
      });

    if (templateError) {
      return NextResponse.json({ error: templateError.message }, { status: 400 });
    }

    repairedTemplates += templateRows.length;
  }

  revalidatePath("/");
  revalidatePath("/tests");
  revalidatePath("/admin/tests");

  return NextResponse.json({
    ok: true,
    cursor,
    nextCursor: cursor + batch.length < assessments.length ? cursor + batch.length : null,
    totalTests: assessments.length,
    repairedTests,
    repairedQuestions,
    repairedTemplates
  });
}
