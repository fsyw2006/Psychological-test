import Link from "next/link";
import { XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CheckoutFailPage() {
  return (
    <section className="section-shell">
      <div className="glass-panel mx-auto max-w-xl rounded-lg p-8 text-center">
        <XCircle className="mx-auto size-12 text-destructive" />
        <h1 className="mt-4 text-3xl font-semibold">支付失败</h1>
        <p className="mt-3 text-muted-foreground">订单未完成扣款，可返回收银台重新尝试。</p>
        <Button asChild className="mt-6 w-full sm:w-auto">
          <Link href="/membership">返回会员中心</Link>
        </Button>
      </div>
    </section>
  );
}
