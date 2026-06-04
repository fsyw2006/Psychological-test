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

function answerSummary(test: Assessment, answers: AssessmentAnswerInput[]) {
  const answerMap = new Map(answers.map((answer) => [answer.questionId, answer.values]));

  return test.questions.slice(0, 80).map((question, index) => {
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

export async function generatePersonalizedReport({
  settings,
  test,
  answers,
  result
}: AiReportInput) {
  if (!settings.aiReportTemplateEnabled) return null;
  if (settings.aiProvider === "mock") return null;
  if (!settings.aiApiKey) return null;
  if (settings.aiProvider === "claude") return null;

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
    timeoutMs: 25000
  });
  const json = extractJson(text);
  const parsed = json ? JSON.parse(json) : {};

  return safeReportTemplate(parsed, result.advanced);
}
