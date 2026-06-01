import {
  articles,
  assessmentCategories,
  assessments,
  membershipPlans
} from "@/lib/demo-data";
import { hasServiceRoleEnv } from "@/lib/env";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

let seedPromise: Promise<void> | null = null;

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

async function seedSystemConfigs(supabase: ReturnType<typeof createSupabaseServiceClient>) {
  const safetyPrompt =
    "你不是医生，也不能诊断疾病。你只能提供情绪支持、自我觉察建议和心理健康科普。如用户表达自伤或伤害他人风险，应建议立即联系当地急救电话、专业机构或可信赖的人。";

  await supabase.from("system_configs").upsert(
    [
      {
        key: "pricing_plans",
        value: {
          plans: membershipPlans,
          dailyFreeTests: 1
        },
        description: "会员套餐与单次解锁定价"
      },
      {
        key: "ai_settings",
        value: {
          aiChatEnabled: false,
          aiProvider: "mock",
          aiModel: "mock-companion",
          aiApiKey: "",
          aiSystemPrompt: safetyPrompt,
          freeChatLimit: 3,
          memberChatLimit: 50
        },
        description: "AI 聊天隐藏功能配置"
      },
      {
        key: "payment_channels",
        value: {
          wechat: {
            enabled: false,
            appid: "",
            mchid: "",
            apiV3Key: "",
            serialNo: "",
            privateKey: "",
            platformPublicKey: "",
            notifyUrl: ""
          },
          alipay: {
            enabled: false,
            appId: "",
            privateKey: "",
            publicKey: "",
            notifyUrl: "",
            returnUrl: "",
            gateway: "https://openapi.alipay.com/gateway.do"
          }
        },
        description: "后台收款通道配置"
      }
    ],
    {
      onConflict: "key"
    }
  );

  await supabase.from("admin_configs").upsert(
    [
      ["aiChatEnabled", false],
      ["aiProvider", "mock"],
      ["aiModel", "mock-companion"],
      ["aiApiKey", ""],
      ["aiSystemPrompt", safetyPrompt],
      ["freeChatLimit", 3],
      ["memberChatLimit", 50]
    ].map(([key, value]) => ({
      key,
      value,
      description: "AI 聊天预留配置"
    })),
    {
      onConflict: "key"
    }
  );
}

async function seedPlans(supabase: ReturnType<typeof createSupabaseServiceClient>) {
  await supabase.from("plans").upsert(
    membershipPlans.map((plan, index) => ({
      slug: plan.slug,
      name: plan.name,
      plan_type: plan.slug,
      price_cents: plan.priceCents,
      period: plan.period,
      description: plan.description,
      features: plan.features,
      is_active: true,
      sort_order: index
    })),
    {
      onConflict: "slug"
    }
  );
}

async function seedContent() {
  if (!hasServiceRoleEnv()) return;

  const supabase = createSupabaseServiceClient();
  const { count, error } = await supabase
    .from("tests")
    .select("id", { count: "exact", head: true });

  if (error) return;

  await seedSystemConfigs(supabase);
  await seedPlans(supabase);

  if (count && count > 0) return;

  const testCategoryIds = new Map<string, string>();
  for (const [index, category] of assessmentCategories.entries()) {
    const { data } = await supabase
      .from("categories")
      .upsert(
        {
          slug: category.slug,
          name: category.name,
          description: category.description,
          type: "TEST",
          sort_order: index
        },
        {
          onConflict: "slug,type"
        }
      )
      .select("id")
      .single();

    if (data?.id) testCategoryIds.set(category.slug, data.id);
  }

  const articleCategories = ["情绪管理", "人际关系", "职场成长", "自我提升"];
  const articleCategoryIds = new Map<string, string>();
  for (const [index, name] of articleCategories.entries()) {
    const { data } = await supabase
      .from("categories")
      .upsert(
        {
          slug: name,
          name,
          type: "ARTICLE",
          sort_order: index
        },
        {
          onConflict: "slug,type"
        }
      )
      .select("id")
      .single();

    if (data?.id) articleCategoryIds.set(name, data.id);
  }

  for (const test of assessments) {
    const categoryId = testCategoryIds.get(test.categorySlug);
    if (!categoryId) continue;

    const { data: testRow } = await supabase
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

    if (!testRow?.id) continue;

    await supabase.from("questions").delete().eq("test_id", testRow.id);
    await supabase.from("questions").insert(
      test.questions.map((question, index) => ({
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
      }))
    );

    await supabase.from("report_templates").delete().eq("test_id", testRow.id);
    await supabase.from("report_templates").insert(
      Object.entries(test.reportTemplates).map(([resultType, template]) => ({
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
      }))
    );
  }

  for (const article of articles) {
    const categoryId = articleCategoryIds.get(article.category);
    if (!categoryId) continue;

    await supabase.from("articles").upsert(
      {
        slug: article.slug,
        title: article.title,
        excerpt: article.excerpt,
        content: article.content,
        category_id: categoryId,
        tags: article.tags,
        reading_minutes: article.readingMinutes,
        status: "PUBLISHED",
        published_at: article.publishedAt
      },
      {
        onConflict: "slug"
      }
    );
  }
}

export async function ensureContentSeeded() {
  if (!hasServiceRoleEnv()) return;

  seedPromise ??= seedContent().catch((error) => {
    seedPromise = null;
    console.error("Soul House content bootstrap failed:", error);
  });

  await seedPromise;
}
