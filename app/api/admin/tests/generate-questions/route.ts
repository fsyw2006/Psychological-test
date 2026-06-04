import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getAiSettings } from "@/lib/ai-settings";
import { callOpenAiCompatibleChat } from "@/lib/ai-openai-compatible";
import { requireAdminProfile } from "@/lib/auth";
import { getAssessmentCatalog } from "@/lib/content";
import { assessments } from "@/lib/demo-data";
import { sanitizeText } from "@/lib/security";
import type { AssessmentQuestion } from "@/lib/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const schema = z.object({
  slug: z.string().min(1),
  questionCount: z.number().int().min(3).max(30).default(8)
});

function extractJson(text: string) {
  const trimmed = text.trim();
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) return trimmed;
  const match = trimmed.match(/\[[\s\S]*\]/);
  return match?.[0] || "";
}

function safeQuestions(input: unknown, fallback: AssessmentQuestion[]) {
  const fallbackQuestions = fallback.length
    ? fallback
    : [
        {
          id: "ai-fallback-1",
          title: "面对这个主题时，你通常更接近哪种状态？",
          type: "single" as const,
          required: true,
          options: [
            { label: "比较符合", value: "1", score: 1 },
            { label: "不太符合", value: "0", score: 0 }
          ]
        }
      ];
  const list = Array.isArray(input) && input.length ? input : fallbackQuestions;

  return list
    .map((item, index): AssessmentQuestion => {
      const source = item as Partial<AssessmentQuestion>;
      const options = Array.isArray(source.options) ? source.options : [];

      return {
        id: sanitizeText(source.id || `ai-q-${index + 1}`, 40) || `ai-q-${index + 1}`,
        title:
          sanitizeText(source.title, 160) ||
          fallbackQuestions[index % fallbackQuestions.length]?.title,
        helper: sanitizeText(source.helper, 120) || undefined,
        type:
          source.type === "multiple" || source.type === "likert" ? source.type : "single",
        required: source.required ?? true,
        min: source.min,
        max: source.max,
        dimension: sanitizeText(source.dimension, 40) || undefined,
        options: options.slice(0, 7).map((option, optionIndex) => {
          const safeOption = option as AssessmentQuestion["options"][number];
          return {
            label:
              sanitizeText(safeOption.label, 120) ||
              fallbackQuestions[index % fallbackQuestions.length]?.options[optionIndex]?.label ||
              `选项 ${optionIndex + 1}`,
            value:
              sanitizeText(safeOption.value, 40) ||
              fallbackQuestions[index % fallbackQuestions.length]?.options[optionIndex]?.value ||
              String(optionIndex + 1),
            score:
              typeof safeOption.score === "number"
                ? safeOption.score
                : fallbackQuestions[index % fallbackQuestions.length]?.options[optionIndex]
                    ?.score,
            dimension:
              sanitizeText(safeOption.dimension, 40) ||
              fallbackQuestions[index % fallbackQuestions.length]?.options[optionIndex]
                ?.dimension
          };
        })
      };
    })
    .filter((question) => question.title && question.options.length >= 2);
}

function mockQuestions(testQuestions: AssessmentQuestion[], count: number) {
  return safeQuestions(testQuestions, []).slice(0, count).map((question, index) => ({
    ...question,
    id: `ai-q-${index + 1}`,
    title: `${question.title.replace(/[？?]$/g, "")}（AI 草稿）？`
  }));
}

function buildPrompt(testTitle: string, description: string, questions: AssessmentQuestion[], count: number) {
  return [
    "你是心灵小屋 Soul House 的心理测评题库助理。请生成测评题目草稿，供管理员审核后进入正式题库。",
    "必须保持原测评的评分结构稳定：题目 type、选项 score、选项 dimension 应参考示例题，不要随意创造无法评分的维度。",
    "请只返回严格 JSON 数组，不要 Markdown，不要代码块。",
    "每个题目字段：id、title、helper、type、required、min、max、dimension、options。",
    "每个 option 字段：label、value、score、dimension。",
    `测评名称：${testTitle}`,
    `测评说明：${description}`,
    `生成数量：${count}`,
    `现有题目示例：${JSON.stringify(questions.slice(0, Math.min(8, questions.length)))}`
  ].join("\n");
}

export async function POST(request: NextRequest) {
  await requireAdminProfile();

  const body = schema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: "题目生成参数错误" }, { status: 400 });
  }

  const tests = await getAssessmentCatalog();
  const test = tests.find((item) => item.slug === body.data.slug);
  if (!test) {
    return NextResponse.json({ error: "测评不存在" }, { status: 404 });
  }
  const builtInTest = assessments.find((item) => item.slug === test.slug);
  const sourceQuestions = test.questions.length
    ? test.questions
    : builtInTest?.questions || [];

  const settings = await getAiSettings();
  if (!settings.aiQuestionBankEnabled) {
    return NextResponse.json(
      { error: "题库 AI 辅助未开启，请先在后台 AI 功能设置中开启。" },
      { status: 403 }
    );
  }

  if (settings.aiProvider === "mock") {
    return NextResponse.json({
      questions: mockQuestions(sourceQuestions, body.data.questionCount),
      provider: settings.aiProvider
    });
  }

  if (settings.aiProvider === "claude") {
    return NextResponse.json(
      { error: "题库生成请优先使用 OpenAI 兼容接口服务商。" },
      { status: 501 }
    );
  }

  if (!settings.aiApiKey) {
    return NextResponse.json({ error: "AI API Key 未配置" }, { status: 400 });
  }

  try {
    const text = await callOpenAiCompatibleChat({
      settings,
      messages: [
        {
          role: "system",
          content: settings.aiSystemPrompt
        },
        {
          role: "user",
          content: buildPrompt(
            test.title,
            test.description,
            sourceQuestions,
            body.data.questionCount
          )
        }
      ],
      temperature: 0.5
    });
    const json = extractJson(text);
    const parsed = json ? JSON.parse(json) : [];

    return NextResponse.json({
      questions: safeQuestions(parsed, sourceQuestions).slice(0, body.data.questionCount),
      provider: settings.aiProvider,
      model: settings.aiModel
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "AI 题目生成失败" },
      { status: 400 }
    );
  }
}
