import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CheckoutSuccessPage() {
  return (
    <section className="section-shell">
      <div className="glass-panel mx-auto max-w-xl rounded-lg p-8 text-center">
        <CheckCircle2 className="mx-auto size-12 text-primary" />
        <h1 className="mt-4 text-3xl font-semibold">支付成功</h1>
        <p className="mt-3 text-muted-foreground">会员权益或报告解锁已自动处理。</p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <Button asChild className="w-full sm:w-auto">
            <Link href="/account">用户中心</Link>
          </Button>
          <Button asChild variant="glass" className="w-full sm:w-auto">
            <Link href="/tests">继续测评</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
