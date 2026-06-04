import {
  defaultAiBaseUrl,
  normalizeAiBaseUrl,
  type AiProvider,
  type AiSettings
} from "@/lib/ai-settings";

export type AiChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type OpenAiModelResponse = {
  data?: Array<{
    id?: string;
    object?: string;
  }>;
};

type OpenAiChatResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  error?: {
    message?: string;
  };
};

export function isOpenAiCompatibleProvider(provider: AiProvider) {
  return provider !== "mock" && provider !== "claude";
}

export function resolveOpenAiBaseUrl(provider: AiProvider, baseUrl?: string | null) {
  return normalizeAiBaseUrl(baseUrl || defaultAiBaseUrl(provider));
}

export function modelEndpoint(baseUrl: string) {
  return `${normalizeAiBaseUrl(baseUrl)}/models`;
}

export function chatEndpoint(baseUrl: string) {
  return `${normalizeAiBaseUrl(baseUrl)}/chat/completions`;
}

export async function fetchOpenAiCompatibleModels({
  provider,
  baseUrl,
  apiKey
}: {
  provider: AiProvider;
  baseUrl?: string | null;
  apiKey: string;
}) {
  const resolvedBaseUrl = resolveOpenAiBaseUrl(provider, baseUrl);
  if (!resolvedBaseUrl) throw new Error("请先填写 Base URL。");
  if (!apiKey) throw new Error("请先填写或保存 API Key。");

  const response = await fetch(modelEndpoint(resolvedBaseUrl), {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`
    }
  });
  const data = (await response.json().catch(() => ({}))) as OpenAiModelResponse &
    OpenAiChatResponse;

  if (!response.ok) {
    throw new Error(data.error?.message || "获取模型列表失败，请检查 Base URL 和 API Key。");
  }

  const models = (data.data || [])
    .map((item) => item.id)
    .filter((id): id is string => Boolean(id))
    .sort((a, b) => a.localeCompare(b));

  if (!models.length) throw new Error("接口没有返回可用模型。");
  return models;
}

export async function callOpenAiCompatibleChat({
  settings,
  messages,
  temperature = 0.7,
  timeoutMs = 30000
}: {
  settings: AiSettings;
  messages: AiChatMessage[];
  temperature?: number;
  timeoutMs?: number;
}) {
  const baseUrl = resolveOpenAiBaseUrl(settings.aiProvider, settings.aiBaseUrl);
  if (!baseUrl) throw new Error("AI Base URL 未配置。");
  if (!settings.aiApiKey) throw new Error("AI API Key 未配置。");

  const controller = new AbortController();
  const timeout = windowOrNodeSetTimeout(() => controller.abort(), timeoutMs);

  const response = await fetch(chatEndpoint(baseUrl), {
    method: "POST",
    signal: controller.signal,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${settings.aiApiKey}`
    },
    body: JSON.stringify({
      model: settings.aiModel,
      messages,
      temperature
    })
  }).finally(() => {
    clearTimeout(timeout);
  });
  const data = (await response.json().catch(() => ({}))) as OpenAiChatResponse;

  if (!response.ok) {
    throw new Error(data.error?.message || "AI 服务请求失败。");
  }

  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("AI 服务没有返回内容。");
  return content;
}

function windowOrNodeSetTimeout(handler: () => void, timeoutMs: number) {
  return setTimeout(handler, timeoutMs);
}
