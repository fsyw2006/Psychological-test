import { hasServiceRoleEnv } from "@/lib/env";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export const AI_PROVIDERS = [
  "mock",
  "openai",
  "deepseek",
  "xiaomi-mimo",
  "custom-openai",
  "claude"
] as const;

export type AiProvider = (typeof AI_PROVIDERS)[number];

export type AiSettings = {
  aiChatEnabled: boolean;
  aiQuestionBankEnabled: boolean;
  aiReportTemplateEnabled: boolean;
  aiArticleEnabled: boolean;
  aiProvider: AiProvider;
  aiBaseUrl: string;
  aiModel: string;
  aiApiKey: string;
  aiSystemPrompt: string;
  freeChatLimit: number;
  memberChatLimit: number;
};

export type AiSettingsInput = Partial<AiSettings>;

const CONFIG_KEY = "ai_settings";
let memoryAiSettings: AiSettings | null = null;

const safetyPrompt =
  "你不是医生，也不能诊断疾病。你只能提供情绪支持、自我觉察建议和心理健康科普。如用户表达自伤或伤害他人风险，应建议立即联系当地急救电话、专业机构或可信赖的人。";

export function isAiProvider(value: unknown): value is AiProvider {
  return typeof value === "string" && AI_PROVIDERS.includes(value as AiProvider);
}

export function defaultAiBaseUrl(provider: AiProvider) {
  if (provider === "openai") return "https://api.openai.com/v1";
  if (provider === "deepseek") return "https://api.deepseek.com";
  if (provider === "xiaomi-mimo") return "https://token-plan-cn.xiaomimimo.com/v1";
  if (provider === "claude") return "https://api.anthropic.com/v1";
  return "";
}

export function normalizeAiBaseUrl(value?: string | null) {
  const trimmed = (value || "").trim();
  if (!trimmed) return "";

  try {
    const url = new URL(trimmed);
    url.pathname = url.pathname
      .replace(/\/+$/g, "")
      .replace(/\/chat\/completions$/i, "")
      .replace(/\/models$/i, "");
    url.search = "";
    url.hash = "";
    return url.toString().replace(/\/+$/g, "");
  } catch {
    return trimmed.replace(/\/+$/g, "");
  }
}

export function defaultAiSettings(): AiSettings {
  return {
    aiChatEnabled: false,
    aiQuestionBankEnabled: false,
    aiReportTemplateEnabled: false,
    aiArticleEnabled: false,
    aiProvider: "mock",
    aiBaseUrl: "",
    aiModel: "mock-companion",
    aiApiKey: "",
    aiSystemPrompt: safetyPrompt,
    freeChatLimit: 3,
    memberChatLimit: 50
  };
}

function normalizeAiSettings(input?: AiSettingsInput | null): AiSettings {
  const base = defaultAiSettings();
  const provider = isAiProvider(input?.aiProvider) ? input.aiProvider : base.aiProvider;
  const systemPrompt = input?.aiSystemPrompt || base.aiSystemPrompt;
  const baseUrl = normalizeAiBaseUrl(input?.aiBaseUrl || defaultAiBaseUrl(provider));

  return {
    aiChatEnabled: Boolean(input?.aiChatEnabled ?? base.aiChatEnabled),
    aiQuestionBankEnabled: Boolean(
      input?.aiQuestionBankEnabled ?? base.aiQuestionBankEnabled
    ),
    aiReportTemplateEnabled: Boolean(
      input?.aiReportTemplateEnabled ?? base.aiReportTemplateEnabled
    ),
    aiArticleEnabled: Boolean(input?.aiArticleEnabled ?? base.aiArticleEnabled),
    aiProvider: provider,
    aiBaseUrl: provider === "mock" ? "" : baseUrl,
    aiModel: input?.aiModel || base.aiModel,
    aiApiKey: input?.aiApiKey || "",
    aiSystemPrompt: systemPrompt.includes("你不是医生")
      ? systemPrompt
      : `${safetyPrompt}\n\n${systemPrompt}`,
    freeChatLimit: Math.max(0, Math.round(Number(input?.freeChatLimit ?? base.freeChatLimit))),
    memberChatLimit: Math.max(
      0,
      Math.round(Number(input?.memberChatLimit ?? base.memberChatLimit))
    )
  };
}

async function loadStoredAiSettings() {
  if (!hasServiceRoleEnv()) return memoryAiSettings;

  const supabase = createSupabaseServiceClient();
  const { data } = await supabase
    .from("system_configs")
    .select("value")
    .eq("key", CONFIG_KEY)
    .maybeSingle();

  return data?.value ? normalizeAiSettings(data.value as AiSettingsInput) : null;
}

export async function getAiSettings() {
  return normalizeAiSettings((await loadStoredAiSettings()) || defaultAiSettings());
}

export async function saveAiSettings(input: AiSettingsInput) {
  const current = await getAiSettings();
  const next = normalizeAiSettings({
    ...current,
    ...input,
    aiApiKey: input.aiApiKey === "" ? current.aiApiKey : input.aiApiKey
  });

  if (!hasServiceRoleEnv()) {
    memoryAiSettings = next;
    return next;
  }

  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.from("system_configs").upsert(
    {
      key: CONFIG_KEY,
      value: next,
      description: "AI 隐藏功能配置"
    },
    {
      onConflict: "key"
    }
  );

  if (error) throw new Error(error.message);
  return next;
}

export function maskAiKey(value?: string) {
  if (!value) return "";
  if (value.length <= 8) return "********";
  return `${value.slice(0, 4)}****${value.slice(-4)}`;
}
