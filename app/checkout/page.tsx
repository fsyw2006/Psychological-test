import type { Metadata } from "next";
import Link from "next/link";
import { AlertCircle, FileText, Sparkles } from "lucide-react";
import { CheckoutPanel } from "@/components/payment/checkout-panel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getMembershipPlans } from "@/lib/pricing";
import type { PlanSlug } from "@/lib/types";

type PaymentProvider = "wechat" | "alipay";

export const metadata: Metadata = {
  title: "收银台",
  description: "微信支付与支付宝支付收银台。"
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function CheckoutPage({
  searchParams
}: {
  searchParams: Promise<{ plan?: PlanSlug; resultId?: string; provider?: PaymentProvider }>;
}) {
  const { plan = "monthly", resultId, provider } = await searchParams;
  const safePlan: PlanSlug = ["monthly", "yearly", "single-report"].includes(plan)
    ? plan
    : "monthly";
  const safeProvider: PaymentProvider | undefined =
    provider === "wechat" || provider === "alipay" ? provider : undefined;
  const plans = await getMembershipPlans();
  const missingSingleReport = safePlan === "single-report" && !resultId;

  return (
    <section className="section-shell">
      <div className="mb-8 text-center">
        <p className="eyebrow">收银台</p>
        <h1 className="mobile-title mt-2">安全完成支付</h1>
      </div>

      {missingSingleReport ? (
        <Card className="glass-panel mx-auto max-w-2xl overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="size-5 text-primary" />
              单次解锁需要先选择报告
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <p className="text-sm leading-6 text-muted-foreground">
              单次解锁只会解锁当前某一份测评报告。请先进入“我的报告”选择需要解锁的报告，或先完成一次测评。
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Button asChild>
                <Link href="/account/reports">
                  <FileText />
                  查看我的报告
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/tests">
                  <Sparkles />
                  去完成测评
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <CheckoutPanel
          plan={safePlan}
          resultId={resultId}
          plans={plans}
          initialProvider={safeProvider}
        />
      )}
    </section>
  );
}
