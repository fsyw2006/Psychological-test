import { hasServiceRoleEnv } from "@/lib/env";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export type AiProvider = "openai" | "deepseek" | "claude" | "mock";

export type AiSettings = {
  aiChatEnabled: boolean;
  aiQuestionBankEnabled: boolean;
  aiReportTemplateEnabled: boolean;
  aiProvider: AiProvider;
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

export function defaultAiSettings(): AiSettings {
  return {
    aiChatEnabled: false,
    aiQuestionBankEnabled: false,
    aiReportTemplateEnabled: false,
    aiProvider: "mock",
    aiModel: "mock-companion",
    aiApiKey: "",
    aiSystemPrompt: safetyPrompt,
    freeChatLimit: 3,
    memberChatLimit: 50
  };
}

function normalizeAiSettings(input?: AiSettingsInput | null): AiSettings {
  const base = defaultAiSettings();
  const provider = input?.aiProvider || base.aiProvider;
  const systemPrompt = input?.aiSystemPrompt || base.aiSystemPrompt;

  return {
    aiChatEnabled: Boolean(input?.aiChatEnabled ?? base.aiChatEnabled),
    aiQuestionBankEnabled: Boolean(
      input?.aiQuestionBankEnabled ?? base.aiQuestionBankEnabled
    ),
    aiReportTemplateEnabled: Boolean(
      input?.aiReportTemplateEnabled ?? base.aiReportTemplateEnabled
    ),
    aiProvider: ["openai", "deepseek", "claude", "mock"].includes(provider)
      ? provider
      : "mock",
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
