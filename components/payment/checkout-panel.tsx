"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { CreditCard, Loader2, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { MembershipPlan, PlanSlug } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

type PaymentProvider = "wechat" | "alipay";
type MockPayment = {
  orderNo: string;
  provider: "WECHAT" | "ALIPAY";
};

export function CheckoutPanel({
  plan,
  resultId,
  plans
}: {
  plan: PlanSlug;
  resultId?: string;
  plans: MembershipPlan[];
}) {
  const [provider, setProvider] = useState<PaymentProvider>("wechat");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [codeUrl, setCodeUrl] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [mockPayment, setMockPayment] = useState<MockPayment | null>(null);
  const selectedPlan = plans.find((item) => item.slug === plan) || plans[0];

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
    setLoading(true);
    setError("");
    setCodeUrl("");
    setQrDataUrl("");
    setMockPayment(null);

    const endpoint =
      provider === "wechat" ? "/api/payments/wechat/create" : "/api/payments/alipay/create";
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
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

    if (provider === "alipay" && data.payment?.paymentUrl) {
      window.location.href = data.payment.paymentUrl;
      return;
    }

    if (data.payment?.codeUrl) {
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
      body: JSON.stringify(mockPayment)
    });
    const data = await response.json().catch(() => ({}));
    setLoading(false);

    if (!response.ok) {
      setError(data.error || "模拟支付确认失败");
      return;
    }

    window.location.href = "/checkout/success";
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

        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setProvider("wechat")}
            className={`focus-ring rounded-md border p-4 text-left ${
              provider === "wechat" ? "border-primary bg-primary/10" : "bg-background/70"
            }`}
          >
            <QrCode className="mb-2 size-5 text-primary" />
            <p className="font-semibold">微信支付</p>
          </button>
          <button
            type="button"
            onClick={() => setProvider("alipay")}
            className={`focus-ring rounded-md border p-4 text-left ${
              provider === "alipay" ? "border-primary bg-primary/10" : "bg-background/70"
            }`}
          >
            <CreditCard className="mb-2 size-5 text-primary" />
            <p className="font-semibold">支付宝支付</p>
          </button>
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
              {mockPayment ? "当前为模拟支付，点击下方按钮完成测试。" : "请扫码完成支付。"}
            </p>
            {mockPayment ? (
              <Button onClick={confirmMockPayment} disabled={loading} className="mt-4 w-full">
                {loading ? <Loader2 className="animate-spin" /> : <CreditCard />}
                我已支付
              </Button>
            ) : null}
          </div>
        ) : null}

        <Button onClick={pay} disabled={loading} className="w-full" size="lg">
          {loading ? <Loader2 className="animate-spin" /> : <CreditCard />}
          {loading ? "创建订单中" : "确认支付"}
        </Button>
      </CardContent>
    </Card>
  );
}
