"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Clock3,
  Loader2,
  Mail,
  MessageSquareReply,
  RefreshCw,
  Send,
  UserRound
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { supportStatusLabel, supportTopicLabel } from "@/lib/support";
import { cn, formatDate } from "@/lib/utils";

type SupportMessageRow = {
  id: string;
  ticket_id: string;
  sender: "user" | "admin";
  content: string;
  created_at: string;
};

type SupportTicketRow = {
  id: string;
  topic: string;
  contact_name?: string | null;
  contact_value?: string | null;
  status: "OPEN" | "REPLIED" | "RESOLVED";
  last_message_at: string;
  created_at: string;
  user?: {
    email?: string | null;
    name?: string | null;
  } | null;
  messages: SupportMessageRow[];
  lastMessage?: SupportMessageRow | null;
};

const statusOptions = [
  { value: "ALL", label: "全部工单" },
  { value: "OPEN", label: "待回复" },
  { value: "REPLIED", label: "已回复" },
  { value: "RESOLVED", label: "已处理" }
];

function statusBadgeVariant(status: string) {
  return status === "OPEN" ? "outline" : "soft";
}

export function SupportInbox({ initialTickets }: { initialTickets: SupportTicketRow[] }) {
  const [tickets, setTickets] = useState(initialTickets);
  const [selectedId, setSelectedId] = useState(initialTickets[0]?.id || "");
  const [status, setStatus] = useState("ALL");
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");

  const selectedTicket = useMemo(
    () => tickets.find((ticket) => ticket.id === selectedId) || tickets[0] || null,
    [selectedId, tickets]
  );

  async function load(nextStatus = status) {
    setLoading(true);
    const response = await fetch(`/api/admin/support?status=${nextStatus}`, {
      credentials: "include",
      cache: "no-store"
    });
    const data = await response.json().catch(() => ({}));
    setLoading(false);

    if (!response.ok) {
      setMessage(data.error || "读取客服工单失败");
      return;
    }

    const nextTickets = (data.tickets || []) as SupportTicketRow[];
    setTickets(nextTickets);
    setSelectedId((current) =>
      nextTickets.some((ticket) => ticket.id === current) ? current : nextTickets[0]?.id || ""
    );
    if (data.error) setMessage(data.error);
  }

  useEffect(() => {
    const timer = window.setInterval(() => load(), 15000);
    return () => window.clearInterval(timer);
  });

  async function sendReply(markResolved = false) {
    if (!selectedTicket || !reply.trim()) return;

    setSending(true);
    setMessage("");
    const response = await fetch(`/api/admin/support/${selectedTicket.id}/reply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      cache: "no-store",
      body: JSON.stringify({
        message: reply,
        status: markResolved ? "RESOLVED" : "REPLIED"
      })
    });
    const data = await response.json().catch(() => ({}));
    setSending(false);

    if (!response.ok) {
      setMessage(data.error || "回复失败");
      return;
    }

    setReply("");
    setMessage(markResolved ? "已回复并标记为已处理" : "回复已发送给用户");
    await load();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <select
          value={status}
          onChange={(event) => {
            setStatus(event.target.value);
            load(event.target.value);
          }}
          className="focus-ring h-11 rounded-md border border-input bg-background/70 px-3 text-sm"
        >
          {statusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <Button type="button" variant="outline" onClick={() => load()} disabled={loading}>
          {loading ? <Loader2 className="animate-spin" /> : <RefreshCw />}
          刷新
        </Button>
      </div>

      {message ? (
        <div className="rounded-md border border-primary/20 bg-primary/10 px-3 py-2 text-sm text-primary">
          {message}
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
        <div className="space-y-3">
          {tickets.length ? (
            tickets.map((ticket) => (
              <button
                key={ticket.id}
                type="button"
                onClick={() => setSelectedId(ticket.id)}
                className={cn(
                  "block w-full rounded-lg border p-4 text-left transition-colors",
                  ticket.id === selectedTicket?.id
                    ? "border-primary bg-primary/10"
                    : "border-border bg-background/60 hover:bg-muted/70"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold">{supportTopicLabel(ticket.topic)}</p>
                    <p className="mt-1 truncate text-sm text-muted-foreground">
                      {ticket.contact_name || ticket.user?.name || ticket.user?.email || "未留称呼"}
                    </p>
                  </div>
                  <Badge
                    variant={statusBadgeVariant(ticket.status)}
                    className="w-fit shrink-0"
                  >
                    {supportStatusLabel(ticket.status)}
                  </Badge>
                </div>
                <p className="mt-3 line-clamp-2 text-sm leading-6 text-muted-foreground">
                  {ticket.lastMessage?.content || "暂无消息内容"}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {formatDate(ticket.last_message_at)}
                </p>
              </button>
            ))
          ) : (
            <div className="glass-panel rounded-lg p-8 text-center text-muted-foreground">
              暂无客服工单
            </div>
          )}
        </div>

        <Card className="glass-panel min-h-[620px] overflow-hidden">
          {selectedTicket ? (
            <CardContent className="flex h-full min-h-[620px] flex-col p-0">
              <div className="border-b border-border p-4 sm:p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-lg font-semibold">
                      {supportTopicLabel(selectedTicket.topic)}
                    </p>
                    <div className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                      <span className="flex items-center gap-2">
                        <UserRound className="size-4 text-primary" />
                        {selectedTicket.contact_name ||
                          selectedTicket.user?.name ||
                          "未填写称呼"}
                      </span>
                      <span className="flex items-center gap-2 break-all">
                        <Mail className="size-4 text-primary" />
                        {selectedTicket.contact_value ||
                          selectedTicket.user?.email ||
                          "未填写联系方式"}
                      </span>
                      <span className="flex items-center gap-2">
                        <Clock3 className="size-4 text-primary" />
                        {formatDate(selectedTicket.created_at)}
                      </span>
                      <span className="flex items-center gap-2">
                        <MessageSquareReply className="size-4 text-primary" />
                        {selectedTicket.messages.length} 条消息
                      </span>
                    </div>
                  </div>
                  <Badge
                    variant={statusBadgeVariant(selectedTicket.status)}
                    className="w-fit shrink-0"
                  >
                    {supportStatusLabel(selectedTicket.status)}
                  </Badge>
                </div>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto p-4 sm:p-5">
                {selectedTicket.messages.map((item) => {
                  const isAdmin = item.sender === "admin";
                  return (
                    <div
                      key={item.id}
                      className={cn("flex", isAdmin ? "justify-end" : "justify-start")}
                    >
                      <div
                        className={cn(
                          "max-w-[88%] rounded-lg px-4 py-3 text-sm leading-6 sm:max-w-[72%]",
                          isAdmin
                            ? "bg-primary text-primary-foreground"
                            : "border border-border bg-background/75"
                        )}
                      >
                        <p className="break-words">{item.content}</p>
                        <p
                          className={cn(
                            "mt-1 text-xs",
                            isAdmin ? "text-primary-foreground/75" : "text-muted-foreground"
                          )}
                        >
                          {isAdmin ? "客服" : "用户"} · {formatDate(item.created_at)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="border-t border-border bg-background/55 p-4">
                <Textarea
                  value={reply}
                  onChange={(event) => setReply(event.target.value)}
                  placeholder="输入回复内容，用户回到客服页就能看到"
                  className="min-h-28 resize-none"
                />
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <Button
                    type="button"
                    onClick={() => sendReply(false)}
                    disabled={!reply.trim() || sending}
                  >
                    {sending ? <Loader2 className="animate-spin" /> : <Send />}
                    发送回复
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => sendReply(true)}
                    disabled={!reply.trim() || sending}
                  >
                    <CheckCircle2 />
                    回复并标记已处理
                  </Button>
                </div>
              </div>
            </CardContent>
          ) : (
            <CardContent className="flex min-h-[460px] items-center justify-center text-muted-foreground">
              选择左侧工单后即可回复
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}
