import type { AiSettings } from "@/lib/ai-settings";
import { callOpenAiCompatibleChat } from "@/lib/ai-openai-compatible";
import { sanitizeText } from "@/lib/security";
import type {
  Assessment,
  AssessmentAnswerInput,
  AssessmentResult,
  ReportTemplate
} from "@/lib/types";

type AiReportInput = {
  settings: AiSettings;
  test: Assessment;
  answers: AssessmentAnswerInput[];
  result: AssessmentResult;
};

const REPORT_AI_TIMEOUT_MS = 45000;
const REPORT_AI_MAX_TOKENS = 1200;
const REPORT_AI_MAX_QUESTIONS = 30;

export type AiReportGeneration =
  | {
      status: "generated";
      report: ReportTemplate;
      provider: string;
      model: string;
      attemptedAt: string;
    }
  | {
      status: "failed" | "skipped";
      reason: string;
      provider: string;
      model: string;
      attemptedAt: string;
    };

function normalizeList(value: unknown, fallback: string[]) {
  const list = Array.isArray(value) ? value : fallback;
  return list
    .map((item) => sanitizeText(item, 120))
    .filter(Boolean)
    .slice(0, 6);
}

function safeReportTemplate(input: Partial<ReportTemplate>, fallback: ReportTemplate) {
  const title = sanitizeText(input.title || fallback.title, 80);

  return {
    title,
    summary: sanitizeText(input.summary || fallback.summary, 260),
    traits: normalizeList(input.traits, fallback.traits),
    strengths: normalizeList(input.strengths, fallback.strengths),
    risks: normalizeList(input.risks, fallback.risks),
    growth: normalizeList(input.growth, fallback.growth),
    careers: normalizeList(input.careers, fallback.careers),
    relationships: normalizeList(input.relationships, fallback.relationships),
    source: "ai",
    generatedByAi: true,
    generatedAt: new Date().toISOString()
  } satisfies ReportTemplate;
}

function baseStatus(settings: AiSettings) {
  return {
    provider: settings.aiProvider,
    model: settings.aiModel,
    attemptedAt: new Date().toISOString()
  };
}

function generatedStatus(settings: AiSettings, report: ReportTemplate): AiReportGeneration {
  return {
    status: "generated",
    report,
    ...baseStatus(settings)
  };
}

function failedStatus(
  settings: AiSettings,
  status: "failed" | "skipped",
  reason: string
): AiReportGeneration {
  return {
    status,
    reason,
    ...baseStatus(settings)
  };
}

function safeErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "AI 生成失败";
  if (message.toLowerCase().includes("abort")) {
    return `AI 服务在 ${Math.round(REPORT_AI_TIMEOUT_MS / 1000)} 秒内没有返回，已使用模板兜底`;
  }
  return sanitizeText(message, 160) || "AI 生成失败，已使用模板兜底";
}

function answerSummary(test: Assessment, answers: AssessmentAnswerInput[]) {
  const answerMap = new Map(answers.map((answer) => [answer.questionId, answer.values]));

  return test.questions.slice(0, REPORT_AI_MAX_QUESTIONS).map((question, index) => {
    const values = answerMap.get(question.id) || [];
    const labels = values
      .map((value) => question.options.find((option) => option.value === value)?.label || value)
      .filter(Boolean);

    return {
      order: index + 1,
      question: question.title,
      selected: labels
    };
  });
}

function extractJson(text: string) {
  const trimmed = text.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) return trimmed;
  const match = trimmed.match(/\{[\s\S]*\}/);
  return match?.[0] || "";
}

function buildPrompt({ test, answers, result }: Omit<AiReportInput, "settings">) {
  return [
    "你是心灵小屋 Soul House 的心理测评报告助手。请根据用户的测评结果和答题选择，生成个性化高级报告。",
    "必须遵守：不能诊断疾病，不能替代医疗建议，不能给出绝对化人格定论；表达要温和、具体、可执行。",
    "请只返回严格 JSON，不要 Markdown，不要代码块。",
    "JSON 字段必须包含：title、summary、traits、strengths、risks、growth、careers、relationships。",
    "traits、strengths、risks、growth、careers、relationships 都是字符串数组，每个数组 2-4 条。",
    `测评名称：${test.title}`,
    `测评简介：${test.description}`,
    `结果类型：${result.type}`,
    `总分：${result.score}/${result.maxScore}`,
    `维度分：${JSON.stringify(result.dimensions)}`,
    `用户答题：${JSON.stringify(answerSummary(test, answers))}`
  ].join("\n");
}

export function reportAdvancedSource(advanced?: Partial<ReportTemplate> | null) {
  return advanced?.generatedByAi || advanced?.source === "ai" ? "ai" : "template";
}

function mockPersonalizedReport({ test, result }: Omit<AiReportInput, "settings" | "answers">) {
  return safeReportTemplate(
    {
      title: `${result.type} 个性化分析`,
      summary: `结合你在「${test.title}」中的得分和结果类型，你当前更适合用温和、可执行的小步骤推进自我理解。`,
      traits: [
        `你的结果更接近「${result.type}」，说明当前模式有相对稳定的倾向。`,
        "在熟悉场景中更容易发挥优势，面对变化时需要给自己一点缓冲。",
        "适合把感受、想法和行动拆开观察，减少一次性判断。"
      ],
      strengths: [
        "能从经历中提炼线索，适合建立自己的成长记录。",
        "当目标清晰时，更容易持续完成小规模行动。",
        "对自我状态有觉察空间，适合做阶段性复盘。"
      ],
      risks: [
        "压力较高时可能把暂时状态误认为固定能力。",
        "如果只看单次测评结果，容易忽略环境和近期事件的影响。",
        "遇到复杂问题时，可能需要外部反馈帮助校准判断。"
      ],
      growth: [
        "未来一周记录 3 个让你感到消耗或充电的具体场景。",
        "为一个主要困扰设计一个 10 分钟以内的小行动。",
        "复盘时同时写下事实、感受和下一步，不急着给自己下结论。"
      ],
      careers: [
        "优先选择目标边界清楚、反馈周期稳定的任务。",
        "把大目标拆成可检查的小节点，减少启动压力。",
        "需要协作时提前说明自己的节奏和信息偏好。"
      ],
      relationships: [
        "表达需求时尽量使用具体场景，而不是笼统评价。",
        "遇到分歧时先确认彼此理解，再进入解决方案。",
        "给重要关系保留稳定沟通频率，避免只在压力高时沟通。"
      ]
    },
    result.advanced
  );
}

export async function generatePersonalizedReportDetailed({
  settings,
  test,
  answers,
  result
}: AiReportInput): Promise<AiReportGeneration> {
  if (!settings.aiReportTemplateEnabled) {
    return failedStatus(settings, "skipped", "后台未开启报告模板 AI 辅助");
  }

  if (settings.aiProvider === "mock") {
    return generatedStatus(settings, mockPersonalizedReport({ test, result }));
  }

  if (!settings.aiApiKey) {
    return failedStatus(settings, "failed", "AI API Key 未配置，已使用模板兜底");
  }

  if (settings.aiProvider === "claude") {
    return failedStatus(
      settings,
      "failed",
      "当前报告生成仅支持 OpenAI 兼容接口，Claude 已使用模板兜底"
    );
  }

  try {
    const prompt = buildPrompt({ test, answers, result });
    const text = await callOpenAiCompatibleChat({
      settings,
      messages: [
        {
          role: "system",
          content: settings.aiSystemPrompt
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.55,
      maxTokens: REPORT_AI_MAX_TOKENS,
      timeoutMs: REPORT_AI_TIMEOUT_MS
    });
    const json = extractJson(text);
    if (!json) {
      return failedStatus(settings, "failed", "AI 返回内容不是有效 JSON，已使用模板兜底");
    }

    const parsed = JSON.parse(json);
    return generatedStatus(settings, safeReportTemplate(parsed, result.advanced));
  } catch (error) {
    return failedStatus(settings, "failed", safeErrorMessage(error));
  }
}

export async function generatePersonalizedReport(input: AiReportInput) {
  const generation = await generatePersonalizedReportDetailed(input);
  return generation.status === "generated" ? generation.report : null;
}
