"use client";

import { FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  Bot,
  Clock3,
  CreditCard,
  FileText,
  Headphones,
  LifeBuoy,
  Loader2,
  MessageSquareText,
  RotateCcw,
  Send,
  Sparkles,
  UserRound
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type SupportTopic = "account" | "membership" | "payment" | "report" | "assessment" | "ai";

type SupportMessage = {
  id: string;
  role: "agent" | "user";
  content: string;
  createdAt: string;
};

const STORAGE_KEY = "soul-house-support-messages";
const CONTACT_KEY = "soul-house-support-contact";

const topics: Array<{
  key: SupportTopic;
  label: string;
  icon: typeof UserRound;
}> = [
  { key: "account", label: "账号登录", icon: UserRound },
  { key: "membership", label: "会员权益", icon: Sparkles },
  { key: "payment", label: "支付订单", icon: CreditCard },
  { key: "report", label: "报告问题", icon: FileText },
  { key: "assessment", label: "测评题库", icon: MessageSquareText },
  { key: "ai", label: "AI 功能", icon: Bot }
];

const quickQuestions = [
  "会员已开通但没有生效",
  "支付后订单仍显示未支付",
  "报告没有显示 AI 个性化",
  "测评提交失败或题目为空",
  "想联系人工客服"
];

function uid() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function nowTime() {
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date());
}

function createMessage(role: SupportMessage["role"], content: string): SupportMessage {
  return {
    id: uid(),
    role,
    content,
    createdAt: nowTime()
  };
}

function welcomeMessage() {
  return createMessage(
    "agent",
    "您好，我是心灵小屋客服。请描述你遇到的问题，我会先帮你定位账号、会员、支付、报告或 AI 设置相关原因。"
  );
}

function topicReply(topic: SupportTopic) {
  const replies: Record<SupportTopic, string> = {
    account:
      "账号问题我会优先确认登录状态、邮箱是否一致，以及当前页面是否读取到用户资料。",
    membership:
      "会员问题通常需要核对会员状态、到期时间和订单是否支付成功。你可以告诉我购买的是月卡、年卡还是单次报告。",
    payment:
      "支付问题我会先看订单号、支付通道和订单状态。若已扣款但未生效，通常需要重新查询支付状态。",
    report:
      "报告问题我会先区分模板报告、AI 个性化报告和未解锁报告。你可以把报告页显示的提示发给我。",
    assessment:
      "测评题库问题通常和题库初始化、分类绑定或后台题库保存有关。你可以告诉我是哪个分类或哪个测评。",
    ai:
      "AI 功能问题我会优先确认服务商、模型、API Key、Base URL，以及页面显示的失败原因。"
  };

  return replies[topic];
}

function inferReply(content: string, topic: SupportTopic, hasContact: boolean) {
  const text = content.toLowerCase();

  if (/会员|权益|开通|生效|无限/.test(content)) {
    return "如果你已经开通会员但功能没生效，请先确认当前登录邮箱和付款账号是否一致。后台可核对 memberships 是否为 ACTIVE、ends_at 是否未过期。";
  }

  if (/支付|订单|微信|支付宝|扣款|未支付|付款/.test(content)) {
    return "支付问题建议先记录订单号和支付方式。若页面显示未支付但已经扣款，可以在后台订单里查询支付状态，必要时重新触发支付查询接口。";
  }

  if (/ai|AI|个性化|json|超时|模板/.test(content)) {
    return "AI 报告需要模型真实返回合法 JSON 才会显示 AI 个性化。若失败，结果页会显示原因；失败后等待 30 秒可以重试，成功后同一份报告不能再次生成。";
  }

  if (/报告|解锁|高级分析|模板报告/.test(content)) {
    return "报告问题要先看高级分析右上角标签：AI 个性化表示生成成功，AI未成功表示模型调用失败，模板报告表示当前使用固定模板。";
  }

  if (/题|题库|测评|分类|0 项|提交/.test(content)) {
    return "测评题库问题通常先去后台测评管理点击分批恢复内置题库，再刷新首页和测评中心确认数量。";
  }

  if (/人工|客服|联系|电话|微信|qq|QQ/.test(content)) {
    return hasContact
      ? "我已经记录了你的联系方式。当前是预接待回复，后续可以接入后台工单或人工客服通知。"
      : "可以先在左侧留下联系方式，我会把当前问题和联系方式一起整理为待处理信息。";
  }

  return `${topicReply(topic)} 你可以继续补充具体页面、报错文字或操作步骤，我会按这个方向帮你排查。`;
}

function readMessages() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    const parsed = saved ? (JSON.parse(saved) as SupportMessage[]) : null;
    return Array.isArray(parsed) && parsed.length ? parsed : [welcomeMessage()];
  } catch {
    return [welcomeMessage()];
  }
}

export function SupportChat() {
  const [topic, setTopic] = useState<SupportTopic>("report");
  const [messages, setMessages] = useState<SupportMessage[]>([welcomeMessage()]);
  const [value, setValue] = useState("");
  const [replying, setReplying] = useState(false);
  const [contactName, setContactName] = useState("");
  const [contact, setContact] = useState("");
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const activeTopic = useMemo(
    () => topics.find((item) => item.key === topic) || topics[0],
    [topic]
  );

  useEffect(() => {
    setMessages(readMessages());
    try {
      const savedContact = localStorage.getItem(CONTACT_KEY);
      if (savedContact) {
        const parsed = JSON.parse(savedContact) as { name?: string; contact?: string };
        setContactName(parsed.name || "");
        setContact(parsed.contact || "");
      }
    } catch {
      // Ignore broken local drafts.
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, replying]);

  function pushAgentReply(content: string) {
    setReplying(true);
    window.setTimeout(() => {
      setMessages((current) => [...current, createMessage("agent", content)]);
      setReplying(false);
    }, 550);
  }

  function sendMessage(content: string) {
    const trimmed = content.trim();
    if (!trimmed || replying) return;

    setMessages((current) => [...current, createMessage("user", trimmed)]);
    setValue("");
    pushAgentReply(inferReply(trimmed, topic, Boolean(contact.trim())));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    sendMessage(value);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage(value);
    }
  }

  function chooseTopic(nextTopic: SupportTopic) {
    setTopic(nextTopic);
    const next = topics.find((item) => item.key === nextTopic);
    if (!next) return;

    setMessages((current) => [
      ...current,
      createMessage("user", `我想咨询：${next.label}`)
    ]);
    pushAgentReply(topicReply(nextTopic));
  }

  function saveContact() {
    const cleanName = contactName.trim();
    const cleanContact = contact.trim();
    if (!cleanName && !cleanContact) return;

    localStorage.setItem(
      CONTACT_KEY,
      JSON.stringify({
        name: cleanName,
        contact: cleanContact
      })
    );
    setMessages((current) => [
      ...current,
      createMessage(
        "agent",
        `已记录联系方式：${cleanName || "未填写称呼"} / ${cleanContact || "未填写联系方式"}。`
      )
    ]);
  }

  function resetChat() {
    const nextMessages = [welcomeMessage()];
    setMessages(nextMessages);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextMessages));
    setReplying(false);
    setValue("");
  }

  return (
    <section className="section-shell py-8 sm:py-12">
      <div className="mx-auto grid max-w-6xl gap-5 lg:grid-cols-[320px_1fr]">
        <aside className="space-y-4">
          <div className="glass-panel rounded-lg p-5">
            <div className="flex size-12 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Headphones className="size-6" />
            </div>
            <h1 className="mt-5 text-2xl font-semibold sm:text-3xl">在线客服</h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              登录、会员、支付、测评、报告和 AI 功能都可以先在这里说明。
            </p>
            <div className="mt-5 grid gap-2 text-sm">
              <div className="flex items-center gap-2 rounded-md border border-border bg-background/60 px-3 py-2">
                <Clock3 className="size-4 text-primary" />
                <span>当前为智能预接待</span>
              </div>
              <div className="flex items-center gap-2 rounded-md border border-border bg-background/60 px-3 py-2">
                <LifeBuoy className="size-4 text-primary" />
                <span>问题会按类型整理</span>
              </div>
            </div>
          </div>

          <div className="glass-panel rounded-lg p-4">
            <p className="font-semibold">问题类型</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {topics.map((item) => {
                const Icon = item.icon;
                const active = item.key === topic;

                return (
                  <Button
                    key={item.key}
                    type="button"
                    variant={active ? "default" : "outline"}
                    size="sm"
                    onClick={() => chooseTopic(item.key)}
                    className="justify-start px-3"
                  >
                    <Icon />
                    {item.label}
                  </Button>
                );
              })}
            </div>
          </div>

          <div className="glass-panel rounded-lg p-4">
            <p className="font-semibold">联系方式</p>
            <div className="mt-3 space-y-2">
              <Input
                value={contactName}
                onChange={(event) => setContactName(event.target.value)}
                placeholder="称呼"
                aria-label="客服称呼"
              />
              <Input
                value={contact}
                onChange={(event) => setContact(event.target.value)}
                placeholder="手机号 / 邮箱 / QQ"
                aria-label="客服联系方式"
              />
              <Button
                type="button"
                variant="outline"
                onClick={saveContact}
                className="w-full"
                disabled={!contactName.trim() && !contact.trim()}
              >
                保存联系方式
              </Button>
            </div>
          </div>
        </aside>

        <div className="glass-panel flex min-h-[680px] min-w-0 flex-col overflow-hidden rounded-lg">
          <div className="flex flex-col gap-3 border-b border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div>
              <p className="font-semibold">心灵小屋客服</p>
              <p className="text-sm text-muted-foreground">当前主题：{activeTopic.label}</p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={resetChat}
              className="w-full sm:w-auto"
            >
              <RotateCcw />
              清空记录
            </Button>
          </div>

          <div className="border-b border-border bg-background/40 px-4 py-3 sm:px-5">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {quickQuestions.map((question) => (
                <button
                  key={question}
                  type="button"
                  onClick={() => sendMessage(question)}
                  className="shrink-0 rounded-full border border-border bg-background/75 px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  {question}
                </button>
              ))}
            </div>
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
                      "max-w-[88%] rounded-lg px-4 py-3 text-sm leading-6 shadow-sm sm:max-w-[74%]",
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
            <Textarea
              value={value}
              onChange={(event) => setValue(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="请输入你的问题"
              aria-label="客服消息"
              disabled={replying}
              className="min-h-12 resize-none"
            />
            <Button
              type="submit"
              disabled={!value.trim() || replying}
              className="w-full self-end sm:w-auto"
            >
              <Send />
              发送
            </Button>
          </form>
        </div>
      </div>
    </section>
  );
}
