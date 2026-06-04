import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdminProfile } from "@/lib/auth";
import { hasServiceRoleEnv } from "@/lib/env";
import { sanitizeText } from "@/lib/security";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const optionSchema = z.object({
  label: z.string().min(1),
  value: z.string().min(1),
  score: z.number().optional(),
  dimension: z.string().optional()
});

const questionSchema = z.object({
  title: z.string().min(2),
  helper: z.string().optional().nullable(),
  type: z.enum(["single", "multiple", "likert"]),
  required: z.boolean().optional(),
  min: z.number().nullable().optional(),
  max: z.number().nullable().optional(),
  dimension: z.string().optional().nullable(),
  options: z.array(optionSchema).min(2)
});

const schema = z.object({
  slug: z.string().min(1),
  questions: z.array(questionSchema).min(3).max(60)
});

function dbQuestionType(type: "single" | "multiple" | "likert") {
  if (type === "multiple") return "MULTIPLE";
  if (type === "likert") return "LIKERT";
  return "SINGLE";
}

export async function PATCH(request: NextRequest) {
  await requireAdminProfile();

  const body = schema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: "题目保存参数错误" }, { status: 400 });
  }

  if (!hasServiceRoleEnv()) {
    return NextResponse.json(
      {
        error:
          "题目保存失败：Cloudflare 缺少 SUPABASE_SERVICE_ROLE_KEY，无法写入 Supabase 数据库。"
      },
      { status: 503 }
    );
  }

  const supabase = createSupabaseServiceClient();
  const { data: test, error: testError } = await supabase
    .from("tests")
    .select("id")
    .eq("slug", body.data.slug)
    .single();

  if (testError || !test) {
    return NextResponse.json({ error: "测评不存在" }, { status: 404 });
  }

  const rows = body.data.questions.map((question, index) => ({
    test_id: test.id,
    order: index + 1,
    type: dbQuestionType(question.type),
    title: sanitizeText(question.title, 180),
    helper: sanitizeText(question.helper, 160) || null,
    required: question.required ?? true,
    min: question.min ?? null,
    max: question.max ?? null,
    dimension: sanitizeText(question.dimension, 40) || null,
    options: question.options.map((option) => ({
      label: sanitizeText(option.label, 120),
      value: sanitizeText(option.value, 40),
      score: option.score,
      dimension: sanitizeText(option.dimension, 40) || undefined
    }))
  }));

  const { error } = await supabase.from("questions").upsert(rows, {
    onConflict: "test_id,order"
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await supabase
    .from("questions")
    .delete()
    .eq("test_id", test.id)
    .gt("order", rows.length);

  revalidatePath("/tests");
  revalidatePath(`/tests/${body.data.slug}`);
  revalidatePath("/admin/tests");

  return NextResponse.json({ ok: true, questionCount: rows.length });
}
