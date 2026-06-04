import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentProfile } from "@/lib/auth";
import { getAssessmentCatalog } from "@/lib/content";
import { hasServiceRoleEnv, hasSupabaseEnv } from "@/lib/env";
import { sanitizeText } from "@/lib/security";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

const createSchema = z.object({
  title: z.string().min(2).max(80),
  slug: z.string().min(2).max(80).optional(),
  subtitle: z.string().max(120).optional(),
  description: z.string().min(2).max(500),
  categorySlug: z.string().min(1),
  estimatedMinutes: z.number().min(1).max(60).default(5),
  tags: z.array(z.string()).default([])
});

function slugify(value: string) {
  const slug = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return slug || `test-${Date.now()}`;
}

function defaultReportTemplate(title: string) {
  return {
    默认: {
      title: `${title}成长报告`,
      summary: "这份报告会根据测评结果呈现基础画像、优势、风险提醒和行动建议。",
      traits: ["能够通过答题结果观察当前状态", "适合结合日常情境继续复盘"],
      strengths: ["愿意主动了解自己", "具备持续调整的空间"],
      risks: ["不要把单次测评结果当作固定标签", "压力较高时建议结合现实支持系统"],
      growth: ["记录一周内最明显的情绪和行为变化", "选择一个小行动持续练习"],
      careers: ["选择与当前状态匹配的工作节奏", "在协作前主动说明自己的偏好和边界"],
      relationships: ["表达需求时尽量具体", "把差异视为信息来源，而不是对错判断"]
    }
  };
}

export async function GET() {
  const profile = await getCurrentProfile();
  if (hasSupabaseEnv() && profile?.role !== "ADMIN") {
    return NextResponse.json({ error: "无权访问" }, { status: 403 });
  }
  const tests = await getAssessmentCatalog();
  return NextResponse.json({ tests });
}

export async function POST(request: NextRequest) {
  const profile = await getCurrentProfile();
  if (hasSupabaseEnv() && profile?.role !== "ADMIN") {
    return NextResponse.json({ error: "无权访问" }, { status: 403 });
  }

  const body = createSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: "新增测评参数错误" }, { status: 400 });
  }

  if (!hasServiceRoleEnv()) {
    return NextResponse.json(
      {
        error:
          "新增测评失败：Cloudflare 缺少 SUPABASE_SERVICE_ROLE_KEY，无法写入 Supabase 数据库。"
      },
      { status: 503 }
    );
  }

  const supabase = createSupabaseServiceClient();
  const { data: category, error: categoryError } = await supabase
    .from("categories")
    .select("id,name")
    .eq("slug", body.data.categorySlug)
    .eq("type", "TEST")
    .single();

  if (categoryError || !category) {
    return NextResponse.json({ error: "测评分类不存在" }, { status: 400 });
  }

  const title = sanitizeText(body.data.title, 80);
  const slug = slugify(body.data.slug || title);
  const reportTemplates = defaultReportTemplate(title);

  const { data: testRow, error: testError } = await supabase
    .from("tests")
    .insert({
      slug,
      title,
      subtitle: sanitizeText(body.data.subtitle || title, 120),
      description: sanitizeText(body.data.description, 500),
      category_id: category.id,
      estimated_minutes: body.data.estimatedMinutes,
      status: "PUBLISHED",
      is_premium: false,
      price_cents: 0,
      tags: body.data.tags.map((tag) => sanitizeText(tag, 24)).filter(Boolean),
      scoring: { kind: "sum", maxScore: 15 },
      report_templates: reportTemplates
    })
    .select("id")
    .single();

  if (testError || !testRow) {
    return NextResponse.json(
      { error: testError?.message || "新增测评失败" },
      { status: 400 }
    );
  }

  const options = [
    { label: "非常不符合", value: "1", score: 1 },
    { label: "比较不符合", value: "2", score: 2 },
    { label: "不确定", value: "3", score: 3 },
    { label: "比较符合", value: "4", score: 4 },
    { label: "非常符合", value: "5", score: 5 }
  ];

  const { error: questionError } = await supabase.from("questions").insert({
    test_id: testRow.id,
    order: 1,
    type: "SINGLE",
    title: "面对这个主题时，我能清楚感受到自己的真实状态。",
    required: true,
    options
  });

  if (questionError) {
    return NextResponse.json({ error: questionError.message }, { status: 400 });
  }

  const template = reportTemplates.默认;
  await supabase.from("report_templates").insert({
    test_id: testRow.id,
    result_type: "默认",
    basic_content: {
      title: template.title,
      summary: template.summary
    },
    premium_content: {
      traits: template.traits,
      strengths: template.strengths,
      risks: template.risks,
      growth: template.growth,
      careers: template.careers,
      relationships: template.relationships
    },
    suggestions: template.growth,
    category: category.name,
    is_active: true
  });

  revalidatePath("/");
  revalidatePath("/tests");
  revalidatePath("/admin/tests");
  revalidatePath("/admin/reports");

  return NextResponse.json({ ok: true, slug });
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
