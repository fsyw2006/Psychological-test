"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Copy,
  CreditCard,
  Loader2,
  QrCode,
  Save,
  ShieldCheck,
  XCircle
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

type PaymentField = {
  label: string;
  configured: boolean;
  value: string | null;
};

type PaymentChannel = {
  id: "wechat" | "alipay";
  name: string;
  enabled: boolean;
  mode: "production" | "disabled";
  callbackUrl: string;
  editable: Record<string, string | boolean>;
  fields: PaymentField[];
};

type PaymentResponse = {
  storage: "database" | "memory";
  channels: PaymentChannel[];
};

const channelInputs = {
  wechat: [
    { key: "appid", label: "App ID" },
    { key: "mchid", label: "商户号 MCH ID" },
    { key: "serialNo", label: "商户证书序列号" },
    { key: "notifyUrl", label: "微信支付回调地址" },
    { key: "apiV3Key", label: "API v3 Key", secret: true },
    { key: "privateKey", label: "商户私钥", secret: true, textarea: true },
    { key: "platformPublicKey", label: "微信平台公钥", secret: true, textarea: true }
  ],
  alipay: [
    { key: "appId", label: "App ID" },
    { key: "notifyUrl", label: "支付宝异步回调地址" },
    { key: "returnUrl", label: "支付完成返回地址" },
    { key: "gateway", label: "支付宝网关" },
    { key: "privateKey", label: "应用私钥", secret: true, textarea: true },
    { key: "publicKey", label: "支付宝公钥", secret: true, textarea: true }
  ]
};

export function PaymentChannelPanel() {
  const [channels, setChannels] = useState<PaymentChannel[]>([]);
  const [storage, setStorage] = useState<"database" | "memory">("memory");
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  async function load() {
    const response = await fetch("/api/admin/payments", {
      credentials: "include",
      cache: "no-store"
    });
    const data = (await response.json().catch(() => ({}))) as PaymentResponse;
    setChannels(data.channels || []);
    setStorage(data.storage || "memory");
  }

  useEffect(() => {
    load();
  }, []);

  function updateChannel(id: PaymentChannel["id"], key: string, value: string | boolean) {
    setChannels((current) =>
      current.map((channel) =>
        channel.id === id
          ? {
              ...channel,
              editable: {
                ...channel.editable,
                [key]: value
              }
            }
          : channel
      )
    );
  }

  async function save(event: FormEvent<HTMLFormElement>, channel: PaymentChannel) {
    event.preventDefault();
    setSaving(channel.id);
    setMessage("");

    const response = await fetch("/api/admin/payments", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      credentials: "include",
      cache: "no-store",
      body: JSON.stringify({
        [channel.id]: channel.editable
      })
    });
    const data = await response.json().catch(() => ({}));

    setSaving(null);
    setMessage(response.ok ? "收款通道配置已保存" : data.error || "保存失败");
    if (response.ok) await load();
  }

  return (
    <div className="max-w-full space-y-5 overflow-hidden">
      <div className="glass-panel rounded-lg p-4 text-sm leading-6 text-muted-foreground">
        当前保存位置：
        <span className="font-semibold text-foreground">
          {storage === "database" ? "Supabase SystemConfig 数据库" : "本地预览内存"}
        </span>
        。生产环境连接 Supabase 后会持久化保存；本地预览内存会在服务重启后丢失。
      </div>

      {message ? (
        <div className="rounded-md border border-primary/20 bg-primary/10 px-3 py-2 text-sm text-primary">
          {message}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        {channels.map((channel) => {
          const Icon = channel.id === "wechat" ? QrCode : CreditCard;
          const complete = channel.fields.every((field) => field.configured);
          const inputs = channelInputs[channel.id];

          return (
            <Card key={channel.id} className="glass-panel min-w-0 overflow-hidden">
              <CardHeader>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <Icon className="mb-3 size-6 text-primary" />
                    <CardTitle>{channel.name}</CardTitle>
                  </div>
                  <Badge
                    variant={channel.enabled ? "soft" : "outline"}
                    className="w-fit shrink-0"
                  >
                    {channel.enabled ? "生产收款" : "未启用"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="rounded-lg border border-border bg-background/60 p-4">
                  <div className="mb-2 flex items-center gap-2 font-medium">
                    <ShieldCheck className="size-4 text-primary" />
                    通道状态
                  </div>
                  <p className="text-sm leading-6 text-muted-foreground">
                    {complete
                      ? "必要参数已配置。启用开关打开后会调用真实支付网关。"
                      : "部分必要参数未配置。请先完善参数，确认无误后再启用真实收款。"}
                  </p>
                </div>

                <div className="space-y-2">
                  {channel.fields.map((field) => (
                    <div
                      key={field.label}
                      className="flex min-w-0 flex-col gap-1 rounded-md bg-background/60 px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between sm:gap-3"
                    >
                      <span className="text-muted-foreground">{field.label}</span>
                      <span className="flex min-w-0 items-center gap-2 break-all font-medium sm:justify-end">
                        {field.configured ? (
                          <CheckCircle2 className="size-4 text-primary" />
                        ) : (
                          <XCircle className="size-4 text-muted-foreground" />
                        )}
                        {field.value || "未配置"}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="rounded-md bg-muted/70 p-3">
                  <p className="text-xs text-muted-foreground">回调地址</p>
                  <div className="mt-2 flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                    <code className="min-w-0 break-all rounded bg-background/50 px-2 py-1">
                      {channel.callbackUrl}
                    </code>
                    <Button
                      variant="ghost"
                      size="icon"
                      title="复制回调地址"
                      onClick={() => navigator.clipboard.writeText(channel.callbackUrl)}
                      className="shrink-0"
                    >
                      <Copy />
                    </Button>
                  </div>
                </div>

                <form className="space-y-4" onSubmit={(event) => save(event, channel)}>
                  <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-background/60 px-3 py-3 text-sm font-medium">
                    <div>
                      <p>启用真实收款</p>
                      <p className="mt-1 text-xs font-normal text-muted-foreground">
                        开启后会调用真实支付网关，参数未完整时请保持关闭。
                      </p>
                    </div>
                    <Switch
                      checked={Boolean(channel.editable.enabled)}
                      onChange={(event) =>
                        updateChannel(channel.id, "enabled", event.target.checked)
                      }
                      aria-label={`启用 ${channel.name} 真实收款`}
                    />
                  </div>

                  {inputs.map((input) => {
                    const value = String(channel.editable[input.key] || "");
                    return (
                      <div key={input.key} className="space-y-2">
                        <Label htmlFor={`${channel.id}-${input.key}`}>{input.label}</Label>
                        {input.textarea ? (
                          <Textarea
                            id={`${channel.id}-${input.key}`}
                            value={value}
                            placeholder={input.secret ? "留空则不修改已配置密钥" : ""}
                            onChange={(event) =>
                              updateChannel(channel.id, input.key, event.target.value)
                            }
                            className="min-h-24"
                          />
                        ) : (
                          <Input
                            id={`${channel.id}-${input.key}`}
                            type={input.secret ? "password" : "text"}
                            value={value}
                            placeholder={input.secret ? "留空则不修改已配置密钥" : ""}
                            onChange={(event) =>
                              updateChannel(channel.id, input.key, event.target.value)
                            }
                          />
                        )}
                      </div>
                    );
                  })}

                  <div className="grid gap-2 sm:grid-cols-3">
                    <Button disabled={saving === channel.id} className="w-full">
                      {saving === channel.id ? <Loader2 className="animate-spin" /> : <Save />}
                      保存配置
                    </Button>
                    <Button asChild variant="glass" className="w-full">
                      <Link href={`/checkout?plan=monthly&provider=${channel.id}`}>
                        创建收款订单
                      </Link>
                    </Button>
                    <Button asChild variant="outline" className="w-full">
                      <Link href="/admin/orders">查看订单</Link>
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
