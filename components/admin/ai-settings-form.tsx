"use client";

import { useState, type FormEvent } from "react";
import { Bot, Loader2, RefreshCw, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { AiSettings } from "@/lib/ai-settings";

const providerBaseUrls: Record<AiSettings["aiProvider"], string> = {
  mock: "",
  openai: "https://api.openai.com/v1",
  deepseek: "https://api.deepseek.com",
  "xiaomi-mimo": "https://token-plan-cn.xiaomimimo.com/v1",
  "custom-openai": "",
  claude: "https://api.anthropic.com/v1"
};

export function AiSettingsForm({
  initialSettings,
  storage
}: {
  initialSettings: AiSettings & { aiApiKeyMasked?: string };
  storage: "database" | "memory";
}) {
  const [settings, setSettings] = useState(initialSettings);
  const [saving, setSaving] = useState(false);
  const [loadingModels, setLoadingModels] = useState(false);
  const [models, setModels] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const canFetchModels = !["mock", "claude"].includes(settings.aiProvider);

  function update<K extends keyof AiSettings>(key: K, value: AiSettings[K]) {
    setSettings((current) => ({ ...current, [key]: value }));
  }

  function changeProvider(provider: AiSettings["aiProvider"]) {
    setModels([]);
    setSettings((current) => {
      const oldDefaultBaseUrl = providerBaseUrls[current.aiProvider];
      const shouldUseProviderDefault =
        !current.aiBaseUrl || current.aiBaseUrl === oldDefaultBaseUrl;
      const nextBaseUrl = shouldUseProviderDefault
        ? providerBaseUrls[provider]
        : current.aiBaseUrl;

      return {
        ...current,
        aiProvider: provider,
        aiBaseUrl: provider === "mock" ? "" : nextBaseUrl,
        aiModel: provider === "mock" ? "mock-companion" : current.aiModel
      };
    });
  }

  async function fetchModels() {
    setLoadingModels(true);
    setMessage("");

    const response = await fetch("/api/admin/ai-settings/models", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      cache: "no-store",
      body: JSON.stringify({
        aiProvider: settings.aiProvider,
        aiBaseUrl: settings.aiBaseUrl,
        aiApiKey: settings.aiApiKey
      })
    });
    const data = await response.json().catch(() => ({}));
    setLoadingModels(false);

    if (!response.ok) {
      setModels([]);
      setMessage(data.error || "获取模型列表失败");
      return;
    }

    const nextModels = (data.models || []) as string[];
    setModels(nextModels);
    setSettings((current) => ({
      ...current,
      aiBaseUrl: data.baseUrl || current.aiBaseUrl,
      aiModel:
        current.aiModel && current.aiModel !== "mock-companion"
          ? current.aiModel
          : nextModels[0] || current.aiModel
    }));
    setMessage(`已获取 ${nextModels.length} 个模型`);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");

    const response = await fetch("/api/admin/ai-settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      cache: "no-store",
      body: JSON.stringify(settings)
    });
    const data = await response.json().catch(() => ({}));

    setSaving(false);
    setMessage(response.ok ? "AI 功能设置已保存" : data.error || "保存失败");
    if (response.ok) setSettings(data.settings);
  }

  return (
    <form className="space-y-5" onSubmit={save}>
      <div className="glass-panel rounded-lg p-4 text-sm leading-6 text-muted-foreground">
        当前保存位置：
        <span className="font-semibold text-foreground">
          {storage === "database" ? "Supabase SystemConfig 数据库" : "本地预览内存"}
        </span>
        。默认关闭时，前台不显示 AI 入口，相关 API 不会调用模型，也不会消耗 Token。
      </div>

      {message ? (
        <div className="rounded-md border border-primary/20 bg-primary/10 px-3 py-2 text-sm text-primary">
          {message}
        </div>
      ) : null}

      <Card className="glass-panel max-w-4xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="size-5 text-primary" />
            AI 功能设置
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3">
            <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-background/60 px-3 py-3 text-sm font-medium">
              <div>
                <p>开启 AI 聊天</p>
                <p className="mt-1 text-xs font-normal text-muted-foreground">
                  默认关闭；开启后才显示聊天入口和聊天 API。
                </p>
              </div>
              <Switch
                checked={settings.aiChatEnabled}
                onChange={(event) => update("aiChatEnabled", event.target.checked)}
                aria-label="开启 AI 聊天"
              />
            </div>

            <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-background/60 px-3 py-3 text-sm font-medium">
              <div>
                <p>开启题库 AI 辅助</p>
                <p className="mt-1 text-xs font-normal text-muted-foreground">
                  默认关闭；用于以后在后台辅助生成或优化题目。
                </p>
              </div>
              <Switch
                checked={settings.aiQuestionBankEnabled}
                onChange={(event) => update("aiQuestionBankEnabled", event.target.checked)}
                aria-label="开启题库 AI 辅助"
              />
            </div>

            <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-background/60 px-3 py-3 text-sm font-medium">
              <div>
                <p>开启报告模板 AI 辅助</p>
                <p className="mt-1 text-xs font-normal text-muted-foreground">
                  默认关闭；用于以后在后台辅助生成报告模板，不影响用户结果页。
                </p>
              </div>
              <Switch
                checked={settings.aiReportTemplateEnabled}
                onChange={(event) =>
                  update("aiReportTemplateEnabled", event.target.checked)
                }
                aria-label="开启报告模板 AI 辅助"
              />
            </div>

            <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-background/60 px-3 py-3 text-sm font-medium">
              <div>
                <p>开启文章 AI 生成</p>
                <p className="mt-1 text-xs font-normal text-muted-foreground">
                  默认关闭；开启后后台文章页才允许生成文章草稿。
                </p>
              </div>
              <Switch
                checked={settings.aiArticleEnabled}
                onChange={(event) => update("aiArticleEnabled", event.target.checked)}
                aria-label="开启文章 AI 生成"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="ai-provider">服务商</Label>
              <select
                id="ai-provider"
                value={settings.aiProvider}
                onChange={(event) =>
                  changeProvider(event.target.value as AiSettings["aiProvider"])
                }
                className="focus-ring h-11 w-full rounded-md border border-input bg-background/70 px-3 text-sm"
              >
                <option value="mock">Mock 测试模式</option>
                <option value="openai">OpenAI</option>
                <option value="deepseek">DeepSeek</option>
                <option value="xiaomi-mimo">小米 Mimo</option>
                <option value="custom-openai">自定义 OpenAI 兼容接口</option>
                <option value="claude">Claude（旧 Anthropic 协议）</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ai-model">模型名称</Label>
              {models.length ? (
                <select
                  id="ai-model"
                  value={settings.aiModel}
                  onChange={(event) => update("aiModel", event.target.value)}
                  className="focus-ring h-11 w-full rounded-md border border-input bg-background/70 px-3 text-sm"
                >
                  {models.map((model) => (
                    <option key={model} value={model}>
                      {model}
                    </option>
                  ))}
                </select>
              ) : (
                <Input
                  id="ai-model"
                  value={settings.aiModel}
                  onChange={(event) => update("aiModel", event.target.value)}
                />
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ai-base-url">Base URL（OpenAI 兼容接口）</Label>
            <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
              <Input
                id="ai-base-url"
                value={settings.aiBaseUrl}
                disabled={settings.aiProvider === "mock"}
                placeholder="例如：https://token-plan-cn.xiaomimimo.com/v1"
                onChange={(event) => update("aiBaseUrl", event.target.value)}
              />
              <Button
                type="button"
                variant="outline"
                onClick={fetchModels}
                disabled={!canFetchModels || loadingModels}
                className="w-full sm:w-auto"
              >
                {loadingModels ? <Loader2 className="animate-spin" /> : <RefreshCw />}
                获取模型列表
              </Button>
            </div>
            <p className="text-xs leading-5 text-muted-foreground">
              填写到 /v1 即可，系统会按 OpenAI 协议请求 /models 和
              /chat/completions。小米 Mimo 默认使用 OpenAI 兼容协议。
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ai-key">API Key</Label>
            <Input
              id="ai-key"
              type="password"
              value={settings.aiApiKey}
              placeholder={settings.aiApiKeyMasked || "留空则不修改已配置密钥"}
              onChange={(event) => update("aiApiKey", event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ai-prompt">System Prompt</Label>
            <Textarea
              id="ai-prompt"
              value={settings.aiSystemPrompt}
              onChange={(event) => update("aiSystemPrompt", event.target.value)}
              className="min-h-40"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="free-chat-limit">免费用户每日聊天次数</Label>
              <Input
                id="free-chat-limit"
                type="number"
                min={0}
                value={settings.freeChatLimit}
                onChange={(event) => update("freeChatLimit", Number(event.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="member-chat-limit">会员每日聊天次数</Label>
              <Input
                id="member-chat-limit"
                type="number"
                min={0}
                value={settings.memberChatLimit}
                onChange={(event) => update("memberChatLimit", Number(event.target.value))}
              />
            </div>
          </div>

          <Button disabled={saving} className="w-full sm:w-auto">
            {saving ? <Loader2 className="animate-spin" /> : <Save />}
            保存 AI 设置
          </Button>
        </CardContent>
      </Card>
    </form>
  );
}
