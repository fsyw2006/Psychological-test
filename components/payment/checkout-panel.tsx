"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { CreditCard, Loader2, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ORDER_EXPIRE_MINUTES } from "@/lib/order-status";
import type { MembershipPlan, PlanSlug } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

type PaymentProvider = "wechat" | "alipay";
type PaymentMode = "production" | "mock";

type PaymentChannel = {
  id: PaymentProvider;
  name: string;
  mode: PaymentMode;
};

type MockPayment = {
  orderNo: string;
  provider: "WECHAT" | "ALIPAY";
};

type RealPayment = MockPayment;

const providerIcons = {
  wechat: QrCode,
  alipay: CreditCard
};

export function CheckoutPanel({
  plan,
  resultId,
  plans,
  initialProvider
}: {
  plan: PlanSlug;
  resultId?: string;
  plans: MembershipPlan[];
  initialProvider?: PaymentProvider;
}) {
  const [channels, setChannels] = useState<PaymentChannel[]>([]);
  const [provider, setProvider] = useState<PaymentProvider | "">(initialProvider || "");
  const [channelsLoading, setChannelsLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [codeUrl, setCodeUrl] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [mockPayment, setMockPayment] = useState<MockPayment | null>(null);
  const [realPayment, setRealPayment] = useState<RealPayment | null>(null);
  const selectedPlan = plans.find((item) => item.slug === plan) || plans[0];
  const missingReportId = plan === "single-report" && !resultId;
  const activeProvider = provider || channels[0]?.id || "";
  const activeChannel = channels.find((channel) => channel.id === activeProvider);
  const successUrl =
    plan === "single-report" && resultId
      ? `/reports/${encodeURIComponent(resultId)}?unlocked=1`
      : "/checkout/success";

  useEffect(() => {
    let cancelled = false;

    async function loadChannels() {
      setChannelsLoading(true);
      setError("");

      try {
        const response = await fetch("/api/payments/channels", {
          credentials: "include",
          cache: "no-store"
        });
        const data = await response.json().catch(() => ({}));
        const nextChannels = (data.channels || []) as PaymentChannel[];

        if (cancelled) return;
        setChannels(nextChannels);
        setChannelsLoading(false);

        if (!nextChannels.length) {
          setProvider("");
          setError("后台暂未开启任何收款通道，请联系管理员。");
          return;
        }

        const preferred = initialProvider
          ? nextChannels.find((channel) => channel.id === initialProvider)?.id
          : undefined;
        setProvider(preferred || nextChannels[0].id);
      } catch {
        if (cancelled) return;
        setChannels([]);
        setChannelsLoading(false);
        setError("读取收款通道失败，请稍后再试。");
      }
    }

    loadChannels();
    return () => {
      cancelled = true;
    };
  }, [initialProvider]);

  useEffect(() => {
    if (!codeUrl) return;
    QRCode.toDataURL(codeUrl, {
      width: 220,
      margin: 1,
      color: {
        dark: "#31443a",
        light: "#fffaf1"
      }
    }).then(setQrDataUrl);
  }, [codeUrl]);

  async function pay() {
    if (missingReportId) {
      setError("单次解锁需要先选择一份测评报告，请从报告页点击“立即解锁”。");
      return;
    }

    if (!activeProvider) {
      setError("后台暂未开启任何收款通道，请联系管理员。");
      return;
    }

    setLoading(true);
    setError("");
    setCodeUrl("");
    setQrDataUrl("");
    setMockPayment(null);
    setRealPayment(null);

    const endpoint =
      activeProvider === "wechat"
        ? "/api/payments/wechat/create"
        : "/api/payments/alipay/create";
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      credentials: "include",
      cache: "no-store",
      body: JSON.stringify({
        plan,
        resultId
      })
    });
    const data = await response.json().catch(() => ({}));
    setLoading(false);

    if (!response.ok) {
      setError(data.error || "创建支付失败");
      return;
    }

    if (data.payment?.mock && data.payment.codeUrl) {
      setMockPayment({
        orderNo: data.payment.orderNo,
        provider: data.payment.provider
      });
      setCodeUrl(data.payment.codeUrl);
      return;
    }

    if (activeProvider === "alipay" && data.payment?.paymentUrl) {
      window.location.href = data.payment.paymentUrl;
      return;
    }

    if (data.payment?.codeUrl) {
      if (data.order?.order_no && data.payment.provider) {
        setRealPayment({
          orderNo: data.order.order_no,
          provider: data.payment.provider
        });
      }
      setCodeUrl(data.payment.codeUrl);
    }
  }

  async function confirmMockPayment() {
    if (!mockPayment) return;

    setLoading(true);
    setError("");
    const response = await fetch("/api/payments/mock/confirm", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      credentials: "include",
      cache: "no-store",
      body: JSON.stringify(mockPayment)
    });
    const data = await response.json().catch(() => ({}));
    setLoading(false);

    if (!response.ok) {
      setError(data.error || "模拟支付确认失败");
      return;
    }

    window.location.replace(data.redirectUrl || successUrl);
  }

  async function queryRealPayment() {
    if (!realPayment) return;

    setLoading(true);
    setError("");
    const response = await fetch(
      `/api/payments/query?provider=${realPayment.provider.toLowerCase()}&orderNo=${encodeURIComponent(
        realPayment.orderNo
      )}`,
      {
        credentials: "include",
        cache: "no-store"
      }
    );
    const data = await response.json().catch(() => ({}));
    setLoading(false);

    if (!response.ok) {
      setError(data.error || "支付状态查询失败");
      return;
    }

    if (data.paid) {
      window.location.replace(data.redirectUrl || successUrl);
      return;
    }

    setError(data.providerState?.message || "暂未查询到支付成功，请完成支付后再试。");
  }

  return (
    <Card className="glass-panel mx-auto max-w-2xl overflow-hidden">
      <CardHeader>
        <CardTitle>确认订单</CardTitle>
        <p className="text-sm leading-6 text-muted-foreground">
          {selectedPlan.name} · {selectedPlan.description}
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col gap-2 rounded-lg bg-muted/70 p-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm text-muted-foreground">应付金额</p>
            <p className="mt-1 text-2xl font-semibold sm:text-3xl">
              {formatCurrency(selectedPlan.priceCents)}
            </p>
          </div>
          <p className="text-sm text-muted-foreground">{selectedPlan.period}</p>
        </div>

        {channelsLoading ? (
          <div className="rounded-md border border-border bg-background/60 px-3 py-4 text-sm text-muted-foreground">
            正在读取后台收款通道...
          </div>
        ) : channels.length ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {channels.map((channel) => {
              const Icon = providerIcons[channel.id];
              const active = activeProvider === channel.id;

              return (
                <button
                  key={channel.id}
                  type="button"
                  onClick={() => setProvider(channel.id)}
                  className={`focus-ring rounded-md border p-4 text-left ${
                    active ? "border-primary bg-primary/10" : "bg-background/70"
                  }`}
                >
                  <Icon className="mb-2 size-5 text-primary" />
                  <p className="font-semibold">{channel.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {channel.mode === "mock" ? "模拟支付测试" : "真实收款通道"}
                  </p>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="rounded-md border border-destructive/25 bg-destructive/10 px-3 py-4 text-sm text-destructive">
            后台暂未开启任何收款通道。
          </div>
        )}

        <div className="rounded-md border border-border bg-background/60 px-3 py-2 text-xs leading-5 text-muted-foreground">
          订单创建后 {ORDER_EXPIRE_MINUTES} 分钟内未支付会自动关闭，关闭后需要重新创建订单。
        </div>

        {error ? (
          <div className="rounded-md border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        {qrDataUrl ? (
          <div className="rounded-lg border border-border bg-background/60 p-4 text-center sm:p-5">
            {/* eslint-disable-next-line @next/next/no-img-element -- QR code is generated client-side as a data URL. */}
            <img
              src={qrDataUrl}
              alt="支付二维码"
              className="mx-auto aspect-square w-full max-w-56 rounded-md"
            />
            <p className="mt-3 text-sm text-muted-foreground">
              {mockPayment
                ? "当前为模拟支付，点击下方按钮完成测试。"
                : "请扫码完成支付，支付后点击下方按钮查询状态。"}
            </p>
            {mockPayment ? (
              <Button onClick={confirmMockPayment} disabled={loading} className="mt-4 w-full">
                {loading ? <Loader2 className="animate-spin" /> : <CreditCard />}
                我已支付
              </Button>
            ) : realPayment ? (
              <Button onClick={queryRealPayment} disabled={loading} className="mt-4 w-full">
                {loading ? <Loader2 className="animate-spin" /> : <CreditCard />}
                查询支付状态
              </Button>
            ) : null}
          </div>
        ) : null}

        <Button
          onClick={pay}
          disabled={loading || channelsLoading || missingReportId || !activeProvider}
          className="w-full"
          size="lg"
        >
          {loading ? <Loader2 className="animate-spin" /> : <CreditCard />}
          {loading
            ? "创建订单中..."
            : activeChannel?.mode === "mock"
              ? "确认模拟支付"
              : "确认支付"}
        </Button>
      </CardContent>
    </Card>
  );
}
