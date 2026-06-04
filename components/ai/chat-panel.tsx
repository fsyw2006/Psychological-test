"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { AlertCircle, Bot, Loader2, RotateCcw, Send, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type ChatMessage = {
  id: string;
  role: "assistant" | "user" | "system";
  content: string;
};

type ChatPanelProps = {
  provider: string;
  model: string;
  freeLimit: number;
  memberLimit: number;
};

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function ChatPanel({ provider, model, freeLimit, memberLimit }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "你好，我是心灵小屋的 AI 心理陪伴。你可以从最近的一件小事、一个情绪，或一个反复出现的困扰开始说。"
    }
  ]);
  const [input, setInput] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading]);

  function resetConversation() {
    setConversationId(null);
    setInput("");
    setError("");
    setMessages([
      {
        id: "welcome",
        role: "assistant",
        content:
          "我们重新开始。你可以告诉我：现在最困扰你的是什么，或者你希望先梳理哪一种感受。"
      }
    ]);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextInput = input.trim();
    if (!nextInput || loading) return;

    const userMessage: ChatMessage = {
      id: createId(),
      role: "user",
      content: nextInput
    };

    setMessages((current) => [...current, userMessage]);
    setInput("");
    setError("");
    setLoading(true);

    const response = await fetch("/api/ai/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      cache: "no-store",
      body: JSON.stringify({
        conversationId,
        message: nextInput
      })
    });
    const data = await response.json().catch(() => ({}));
    setLoading(false);

    if (!response.ok) {
      const message =
        data.error ||
        (response.status === 401
          ? "请先登录后再使用 AI 聊天。"
          : "AI 回复失败，请稍后再试。");
      setError(message);
      setMessages((current) => [
        ...current,
        {
          id: createId(),
          role: "system",
          content: message
        }
      ]);
      return;
    }

    setConversationId(data.conversationId || conversationId);
    setMessages((current) => [
      ...current,
      {
        id: createId(),
        role: "assistant",
        content: data.reply || "我在这里。你可以继续说下去。"
      }
    ]);
  }

  return (
    <section className="section-shell">
      <div className="mx-auto grid max-w-5xl gap-4">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <p className="eyebrow">AI 心理陪伴</p>
            <h1 className="mobile-title mt-2">和 AI 一起梳理此刻的感受</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
              当前模型：{provider} / {model}。免费用户每日 {freeLimit} 次，会员每日{" "}
              {memberLimit} 次。
            </p>
          </div>
          <Button type="button" variant="outline" onClick={resetConversation}>
            <RotateCcw />
            重新开始
          </Button>
        </div>

        <div className="glass-panel grid min-h-[62vh] grid-rows-[1fr_auto] overflow-hidden rounded-lg">
          <div className="min-h-0 space-y-4 overflow-y-auto p-4 sm:p-5">
            {messages.map((message) => {
              const isUser = message.role === "user";
              const isSystem = message.role === "system";
              const Icon = isUser ? UserRound : isSystem ? AlertCircle : Bot;

              return (
                <div
                  key={message.id}
                  className={cn("flex gap-3", isUser && "justify-end")}
                >
                  {!isUser ? (
                    <span
                      className={cn(
                        "mt-1 flex size-9 shrink-0 items-center justify-center rounded-md border border-border bg-background/70",
                        isSystem && "text-destructive"
                      )}
                    >
                      <Icon className="size-4" />
                    </span>
                  ) : null}
                  <div
                    className={cn(
                      "max-w-[82%] whitespace-pre-wrap rounded-lg border px-4 py-3 text-sm leading-7 shadow-sm",
                      isUser
                        ? "border-primary/30 bg-primary text-primary-foreground"
                        : isSystem
                          ? "border-destructive/30 bg-destructive/10 text-destructive"
                          : "border-border bg-background/72"
                    )}
                  >
                    {message.content}
                  </div>
                  {isUser ? (
                    <span className="mt-1 flex size-9 shrink-0 items-center justify-center rounded-md border border-primary/30 bg-primary/10 text-primary">
                      <Icon className="size-4" />
                    </span>
                  ) : null}
                </div>
              );
            })}

            {loading ? (
              <div className="flex gap-3">
                <span className="mt-1 flex size-9 shrink-0 items-center justify-center rounded-md border border-border bg-background/70">
                  <Bot className="size-4" />
                </span>
                <div className="rounded-lg border border-border bg-background/72 px-4 py-3 text-sm text-muted-foreground shadow-sm">
                  <Loader2 className="mr-2 inline size-4 animate-spin" />
                  正在回复...
                </div>
              </div>
            ) : null}
            <div ref={bottomRef} />
          </div>

          <form
            onSubmit={submit}
            className="border-t border-border bg-background/55 p-3 backdrop-blur-xl sm:p-4"
          >
            {error ? <p className="mb-2 text-sm text-destructive">{error}</p> : null}
            <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
              <Textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="把你想聊的内容写在这里..."
                className="min-h-24 resize-none"
                maxLength={2000}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                    event.currentTarget.form?.requestSubmit();
                  }
                }}
              />
              <Button disabled={loading || !input.trim()} className="h-full min-h-24">
                {loading ? <Loader2 className="animate-spin" /> : <Send />}
                发送
              </Button>
            </div>
          </form>
        </div>

        <p className="text-center text-xs leading-5 text-muted-foreground">
          AI 回复仅用于心理健康科普和自我觉察参考，不能替代专业医疗诊断或紧急援助。
        </p>
      </div>
    </section>
  );
}
