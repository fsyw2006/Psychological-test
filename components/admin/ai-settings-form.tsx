"use client";

import { useState, type FormEvent } from "react";
import { Bot, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { AiSettings } from "@/lib/ai-settings";

export function AiSettingsForm({
  initialSettings,
  storage
}: {
  initialSettings: AiSettings & { aiApiKeyMasked?: string };
  storage: "database" | "memory";
}) {
  const [settings, setSettings] = useState(initialSettings);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  function update<K extends keyof AiSettings>(key: K, value: AiSettings[K]) {
    setSettings((current) => ({ ...current, [key]: value }));
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const response = await fetch("/api/admin/ai-settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings)
    });
    const data = await response.json();
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
        。默认关闭时，前台不会显示入口，`/chat` 返回 404，API 不会消耗 Token。
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
          <label className="flex items-center justify-between gap-3 rounded-md border border-border bg-background/60 px-3 py-2 text-sm font-medium">
            开启 AI 聊天
            <input
              type="checkbox"
              checked={settings.aiChatEnabled}
              onChange={(event) => update("aiChatEnabled", event.target.checked)}
              className="size-4 accent-primary"
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="ai-provider">服务商</Label>
              <select
                id="ai-provider"
                value={settings.aiProvider}
                onChange={(event) => update("aiProvider", event.target.value as AiSettings["aiProvider"])}
                className="focus-ring h-11 w-full rounded-md border border-input bg-background/70 px-3 text-sm"
              >
                <option value="mock">mock</option>
                <option value="openai">openai</option>
                <option value="deepseek">deepseek</option>
                <option value="claude">claude</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ai-model">模型名称</Label>
              <Input
                id="ai-model"
                value={settings.aiModel}
                onChange={(event) => update("aiModel", event.target.value)}
              />
            </div>
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
