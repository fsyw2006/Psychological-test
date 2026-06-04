"use client";

import {
  FormEvent,
  KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import {
  Bot,
  CheckCircle2,
  Clock3,
  CreditCard,
  FileText,
  Headphones,
  LifeBuoy,
  Loader2,
  MessageSquareText,
  RefreshCw,
  RotateCcw,
  Send,
  Sparkles,
  UserRound
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  supportStatusLabel,
  supportTopicLabel,
  supportTopics,
  type SupportStatus,
  type SupportTopic
} from "@/lib/support";
import { cn, formatDate } from "@/lib/utils";

type SupportMessage = {
  id: string;
  sender: "user" | "admin";
  content: string;
  created_at: string;
};

type SupportTicket = {
  id: string;
  topic: SupportTopic;
  contact_name?: string | null;
  contact_value?: string | null;
  status: SupportStatus;
  created_at: string;
  updated_at: string;
};

const VISITOR_KEY = "soul-house-support-visitor-id";
const TICKET_KEY = "soul-house-support-ticket-id";
const CONTACT_KEY = "soul-house-support-contact";

const topicIcons: Record<SupportTopic, typeof UserRound> = {
  account: UserRound,
  membership: Sparkles,
  payment: CreditCard,
  report: FileText,
  assessment: MessageSquareText,
  ai: Bot,
  other: LifeBuoy
};

const quickQuestions = [
  "会员已开通但没有生效",
  "支付后订单仍显示未支付",
  "报告没有显示 AI 个性化",
  "测评提交失败或题目为空",
  "想联系人工客服"
];

function createVisitorId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function readVisitorId() {
  const saved = localStorage.getItem(VISITOR_KEY);
  if (saved) return saved;

  const next = createVisitorId();
  localStorage.setItem(VISITOR_KEY, next);
  return next;
}

function readContactDraft() {
  try {
    const saved = localStorage.getItem(CONTACT_KEY);
    return saved ? (JSON.parse(saved) as { name?: string; contact?: string }) : {};
  } catch {
    return {};
  }
}

export function SupportChat() {
  const [topic, setTopic] = useState<SupportTopic>("report");
  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [visitorId, setVisitorId] = useState("");
  const [ticketId, setTicketId] = useState("");
  const [value, setValue] = useState("");
  const [contactName, setContactName] = useState("");
  const [contact, setContact] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const activeTopic = useMemo(
    () => supportTopics.find((item) => item.key === topic) || supportTopics[0],
    [topic]
  );
  const status = ticket?.status || "OPEN";

  const loadMessages = useCallback(async (nextTicketId = ticketId, nextVisitorId = visitorId) => {
    if (!nextVisitorId) return;

    setLoading(true);
    const params = new URLSearchParams({ visitorId: nextVisitorId });
    if (nextTicketId) params.set("ticketId", nextTicketId);

    const response = await fetch(`/api/support/messages?${params.toString()}`, {
      credentials: "include",
      cache: "no-store"
    });
    const data = await response.json().catch(() => ({}));
    setLoading(false);

    if (!response.ok) {
      setError(data.error || "读取客服消息失败");
      return;
    }

    setError("");
    setTicket(data.ticket || null);
    setMessages(data.messages || []);

    if (data.ticket?.id) {
      setTicketId(data.ticket.id);
      localStorage.setItem(TICKET_KEY, data.ticket.id);
      if (data.ticket.topic) setTopic(data.ticket.topic);
      if (data.ticket.contact_name) setContactName(data.ticket.contact_name);
      if (data.ticket.contact_value) setContact(data.ticket.contact_value);
    }
  }, [ticketId, visitorId]);

  useEffect(() => {
    const nextVisitorId = readVisitorId();
    const savedTicketId = localStorage.getItem(TICKET_KEY) || "";
    const draft = readContactDraft();

    setVisitorId(nextVisitorId);
    setTicketId(savedTicketId);
    setContactName(draft.name || "");
    setContact(draft.contact || "");
    loadMessages(savedTicketId, nextVisitorId);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Initial local storage hydration only.
  }, []);

  useEffect(() => {
    if (!ticketId || !visitorId) return;
    const timer = window.setInterval(() => loadMessages(ticketId, visitorId), 12000);
    return () => window.clearInterval(timer);
  }, [loadMessages, ticketId, visitorId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, sending]);

  async function sendMessage(content: string) {
    const trimmed = content.trim();
    if (!trimmed || sending) return;

    const currentVisitorId = visitorId || readVisitorId();
    setVisitorId(currentVisitorId);
    setSending(true);
    setError("");
    setNotice("");

    localStorage.setItem(
      CONTACT_KEY,
      JSON.stringify({
        name: contactName.trim(),
        contact: contact.trim()
      })
    );

    const response = await fetch("/api/support/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      cache: "no-store",
      body: JSON.stringify({
        ticketId: ticketId || null,
        visitorId: currentVisitorId,
        topic,
        contactName,
        contact,
        message: trimmed
      })
    });
    const data = await response.json().catch(() => ({}));
    setSending(false);

    if (!response.ok) {
      setError(data.error || "发送失败，请稍后再试。");
      return;
    }

    setValue("");
    setTicket(data.ticket || null);
    setMessages(data.messages || []);
    if (data.ticket?.id) {
      setTicketId(data.ticket.id);
      localStorage.setItem(TICKET_KEY, data.ticket.id);
    }
    setNotice("消息已发送到客服后台。");
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

  function saveContact() {
    localStorage.setItem(
      CONTACT_KEY,
      JSON.stringify({
        name: contactName.trim(),
        contact: contact.trim()
      })
    );
    setNotice("联系方式已保存。");
  }

  function resetChat() {
    localStorage.removeItem(TICKET_KEY);
    setTicket(null);
    setMessages([]);
    setTicketId("");
    setNotice("已开始新的客服会话。");
    setError("");
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
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge variant={status === "OPEN" ? "outline" : "soft"}>
                {supportStatusLabel(status)}
              </Badge>
              {ticketId ? <Badge variant="outline">工单已创建</Badge> : null}
            </div>
          </div>

          <div className="glass-panel rounded-lg p-4">
            <p className="font-semibold">问题类型</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {supportTopics.map((item) => {
                const Icon = topicIcons[item.key];
                const active = item.key === topic;

                return (
                  <Button
                    key={item.key}
                    type="button"
                    variant={active ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTopic(item.key)}
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
                <CheckCircle2 />
                保存联系方式
              </Button>
            </div>
          </div>
        </aside>

        <div className="glass-panel flex min-h-[680px] min-w-0 flex-col overflow-hidden rounded-lg">
          <div className="flex flex-col gap-3 border-b border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div>
              <p className="font-semibold">心灵小屋客服</p>
              <p className="text-sm text-muted-foreground">
                当前主题：{supportTopicLabel(activeTopic.key)}
              </p>
            </div>
            <div className="grid gap-2 sm:flex">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => loadMessages()}
                disabled={loading}
              >
                {loading ? <Loader2 className="animate-spin" /> : <RefreshCw />}
                刷新回复
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={resetChat}>
                <RotateCcw />
                新会话
              </Button>
            </div>
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
            {!messages.length ? (
              <div className="rounded-lg border border-border bg-background/75 px-4 py-3 text-sm leading-6 text-muted-foreground">
                您好，我是心灵小屋客服。发送消息后，后台客服可以直接回复，你回来刷新即可看到回复。
              </div>
            ) : null}

            {messages.map((message) => {
              const isUser = message.sender === "user";

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
                      {isUser ? "我" : "客服"} · {formatDate(message.created_at)}
                    </p>
                  </div>
                </div>
              );
            })}

            {sending ? (
              <div className="flex justify-end">
                <div className="flex items-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm text-primary-foreground">
                  <Loader2 className="size-4 animate-spin" />
                  正在发送
                </div>
              </div>
            ) : null}
            <div ref={bottomRef} />
          </div>

          <div className="space-y-2 border-t border-border bg-background/55 p-3 sm:p-4">
            {notice ? (
              <div className="rounded-md border border-primary/20 bg-primary/10 px-3 py-2 text-sm text-primary">
                {notice}
              </div>
            ) : null}
            {error ? (
              <div className="rounded-md border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            ) : null}
            <form onSubmit={handleSubmit} className="grid gap-2 sm:grid-cols-[1fr_auto]">
              <Textarea
                value={value}
                onChange={(event) => setValue(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="请输入你的问题"
                aria-label="客服消息"
                disabled={sending}
                className="min-h-12 resize-none"
              />
              <Button
                type="submit"
                disabled={!value.trim() || sending}
                className="w-full self-end sm:w-auto"
              >
                {sending ? <Loader2 className="animate-spin" /> : <Send />}
                发送
              </Button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
