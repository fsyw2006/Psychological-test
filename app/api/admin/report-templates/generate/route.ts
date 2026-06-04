import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getAiSettings } from "@/lib/ai-settings";
import { callOpenAiCompatibleChat } from "@/lib/ai-openai-compatible";
import { requireAdminProfile } from "@/lib/auth";
import { getAssessmentCatalog } from "@/lib/content";
import { sanitizeText } from "@/lib/security";
import type { ReportTemplate } from "@/lib/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const schema = z.object({
  slug: z.string().min(1),
  resultType: z.string().min(1).default("默认"),
  reportTemplates: z.record(z.unknown()).default({})
});

function extractJson(text: string) {
  const trimmed = text.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) return trimmed;
  const match = trimmed.match(/\{[\s\S]*\}/);
  return match?.[0] || "";
}

function normalizeList(value: unknown, fallback: string[]) {
  const list = Array.isArray(value) ? value : fallback;
  return list
    .map((item) => sanitizeText(item, 120))
    .filter(Boolean)
    .slice(0, 6);
}

function normalizeTemplate(input: Partial<ReportTemplate>, fallback: ReportTemplate) {
  return {
    title: sanitizeText(input.title || fallback.title, 80),
    summary: sanitizeText(input.summary || fallback.summary, 260),
    traits: normalizeList(input.traits, fallback.traits),
    strengths: normalizeList(input.strengths, fallback.strengths),
    risks: normalizeList(input.risks, fallback.risks),
    growth: normalizeList(input.growth, fallback.growth),
    careers: normalizeList(input.careers, fallback.careers),
    relationships: normalizeList(input.relationships, fallback.relationships)
  } satisfies ReportTemplate;
}

function mockTemplate(testTitle: string, fallback: ReportTemplate) {
  return normalizeTemplate(
    {
      title: `${testTitle}个性化成长报告`,
      summary: "这份模板用于结合测评结果，呈现更具体的自我理解、风险提醒和行动建议。",
      traits: ["能从答题倾向中看见稳定模式", "适合结合近期情境继续观察"],
      strengths: ["具备自我觉察意愿", "能够把反馈转化为小行动"],
      risks: ["避免把测评结果当成固定标签", "压力较高时需要更多现实支持"],
      growth: ["记录一周内最消耗和最补能的场景", "选择一个低风险行为练习"],
      careers: ["优先选择反馈清晰的任务环境", "在协作前说明节奏和边界"],
      relationships: ["表达需求时使用具体事件", "把差异当作信息，而不是对错判断"]
    },
    fallback
  );
}

function buildPrompt({
  testTitle,
  category,
  resultType,
  fallback
}: {
  testTitle: string;
  category: string;
  resultType: string;
  fallback: ReportTemplate;
}) {
  return [
    "你是心灵小屋 Soul House 的心理测评报告模板编辑。请优化一份高级报告模板。",
    "要求：温和、具体、可执行；不能诊断疾病；不能替代专业医疗建议；不能制造焦虑。",
    "请只返回严格 JSON，不要 Markdown，不要代码块。",
    "JSON 字段必须包含：title、summary、traits、strengths、risks、growth、careers、relationships。",
    "traits、strengths、risks、growth、careers、relationships 都是字符串数组，每个数组 2-4 条。",
    `测评名称：${testTitle}`,
    `分类：${category}`,
    `结果类型：${resultType}`,
    `当前模板：${JSON.stringify(fallback)}`
  ].join("\n");
}

export async function POST(request: NextRequest) {
  await requireAdminProfile();

  const body = schema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: "AI 模板生成参数错误" }, { status: 400 });
  }

  const tests = await getAssessmentCatalog({ includeQuestions: false });
  const test = tests.find((item) => item.slug === body.data.slug);
  if (!test) {
    return NextResponse.json({ error: "测评不存在" }, { status: 404 });
  }

  const currentTemplates = body.data.reportTemplates as Record<string, ReportTemplate>;
  const resultType = body.data.resultType || Object.keys(currentTemplates)[0] || "默认";
  const fallback =
    currentTemplates[resultType] ||
    test.reportTemplates[resultType] ||
    Object.values(test.reportTemplates)[0];

  if (!fallback) {
    return NextResponse.json({ error: "当前测评没有可参考的报告模板" }, { status: 400 });
  }

  const settings = await getAiSettings();
  if (!settings.aiReportTemplateEnabled) {
    return NextResponse.json(
      { error: "报告模板 AI 辅助未开启，请先在后台 AI 功能设置中开启。" },
      { status: 403 }
    );
  }

  try {
    let template: ReportTemplate;

    if (settings.aiProvider === "mock") {
      template = mockTemplate(test.title, fallback);
    } else {
      if (settings.aiProvider === "claude") {
        return NextResponse.json(
          { error: "模板生成请优先使用 OpenAI 兼容接口服务商。" },
          { status: 501 }
        );
      }

      if (!settings.aiApiKey) {
        return NextResponse.json({ error: "AI API Key 未配置" }, { status: 400 });
      }

      const text = await callOpenAiCompatibleChat({
        settings,
        messages: [
          {
            role: "system",
            content: settings.aiSystemPrompt
          },
          {
            role: "user",
            content: buildPrompt({
              testTitle: test.title,
              category: test.category,
              resultType,
              fallback
            })
          }
        ],
        temperature: 0.55,
        timeoutMs: 30000
      });
      const json = extractJson(text);
      const parsed = json ? JSON.parse(json) : {};
      template = normalizeTemplate(parsed, fallback);
    }

    return NextResponse.json({
      reportTemplates: {
        ...currentTemplates,
        [resultType]: template
      },
      resultType,
      provider: settings.aiProvider,
      model: settings.aiModel
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "AI 模板生成失败" },
      { status: 400 }
    );
  }
}
