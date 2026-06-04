"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { Headphones, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type SupportMessage = {
  id: string;
  role: "agent" | "user";
  content: string;
  createdAt: string;
};

const autoReplies = [
  "您好，我是客服，请问有什么可以帮您？",
  "我已经收到您的问题了。您可以补充一下遇到问题的页面或操作步骤。",
  "如果是会员、支付或报告问题，请告诉我订单状态或测评名称，我会继续帮您梳理。",
  "感谢您的反馈。当前是模拟客服回复，后续可以接入真实人工客服或后台消息记录。"
];

function nowTime() {
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date());
}

function createMessage(role: SupportMessage["role"], content: string): SupportMessage {
  return {
    id: crypto.randomUUID(),
    role,
    content,
    createdAt: nowTime()
  };
}

export function SupportChat() {
  const [messages, setMessages] = useState<SupportMessage[]>([
    createMessage("agent", "您好，我是客服，请问有什么可以帮您？")
  ]);
  const [value, setValue] = useState("");
  const [replying, setReplying] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, replying]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const content = value.trim();
    if (!content || replying) return;

    const replyIndex = Math.min(messages.filter((item) => item.role === "user").length + 1, autoReplies.length - 1);
    setMessages((current) => [...current, createMessage("user", content)]);
    setValue("");
    setReplying(true);

    window.setTimeout(() => {
      setMessages((current) => [...current, createMessage("agent", autoReplies[replyIndex])]);
      setReplying(false);
    }, 650);
  }

  return (
    <section className="section-shell py-8 sm:py-12">
      <div className="mx-auto grid max-w-5xl gap-5 lg:grid-cols-[280px_1fr]">
        <aside className="glass-panel rounded-lg p-5">
          <div className="flex size-12 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Headphones className="size-6" />
          </div>
          <h1 className="mt-5 text-2xl font-semibold sm:text-3xl">在线客服</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            可以咨询登录、会员、测评、报告和支付相关问题。
          </p>
          <div className="mt-6 rounded-md border border-border bg-background/60 p-3 text-sm text-muted-foreground">
            当前为模拟客服回复，消息仅保留在当前页面。
          </div>
        </aside>

        <div className="glass-panel flex min-h-[620px] min-w-0 flex-col overflow-hidden rounded-lg">
          <div className="border-b border-border px-4 py-3 sm:px-5">
            <p className="font-semibold">心灵小屋客服</p>
            <p className="text-sm text-muted-foreground">通常会立即回复</p>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-5 sm:px-5">
            {messages.map((message) => {
              const isUser = message.role === "user";

              return (
                <div
                  key={message.id}
                  className={cn("flex", isUser ? "justify-end" : "justify-start")}
                >
                  <div
                    className={cn(
                      "max-w-[86%] rounded-lg px-4 py-3 text-sm leading-6 shadow-sm sm:max-w-[72%]",
                      isUser
                        ? "bg-primary text-primary-foreground"
                        : "border border-border bg-background/75 text-foreground"
                    )}
                  >
                    <p className="break-words">{message.content}</p>
                    <p
                      className={cn(
                        "mt-1 text-xs",
                        isUser ? "text-primary-foreground/75" : "text-muted-foreground"
                      )}
                    >
                      {message.createdAt}
                    </p>
                  </div>
                </div>
              );
            })}

            {replying ? (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-lg border border-border bg-background/75 px-4 py-3 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />
                  正在回复
                </div>
              </div>
            ) : null}
            <div ref={bottomRef} />
          </div>

          <form
            onSubmit={handleSubmit}
            className="grid gap-2 border-t border-border bg-background/55 p-3 sm:grid-cols-[1fr_auto] sm:p-4"
          >
            <Input
              value={value}
              onChange={(event) => setValue(event.target.value)}
              placeholder="请输入您的问题"
              aria-label="客服消息"
              disabled={replying}
            />
            <Button type="submit" disabled={!value.trim() || replying} className="w-full sm:w-auto">
              <Send />
              发送
            </Button>
          </form>
        </div>
      </div>
    </section>
  );
}
