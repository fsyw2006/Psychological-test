import Link from "next/link";
import { ClipboardList, Crown, FileText, ReceiptText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentProfile } from "@/lib/auth";

const items = [
  {
    href: "/account/tests",
    title: "我的测评",
    text: "查看历史测评进度与完成记录",
    icon: ClipboardList
  },
  {
    href: "/account/reports",
    title: "我的报告",
    text: "查看已生成和已解锁报告",
    icon: FileText
  },
  {
    href: "/account/orders",
    title: "我的订单",
    text: "查看支付记录和退款状态",
    icon: ReceiptText
  },
  {
    href: "/account/membership",
    title: "会员中心",
    text: "查看会员状态并续费",
    icon: Crown
  }
];

export default async function AccountPage() {
  const profile = await getCurrentProfile();

  return (
    <section className="section-shell">
      <div className="mb-8">
        <p className="eyebrow">用户中心</p>
        <h1 className="mobile-title mt-2">
          {profile?.name || "Soul House 用户"}，欢迎回来
        </h1>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Link href={item.href} key={item.href}>
              <Card className="glass-panel h-full transition-transform hover:-translate-y-1">
                <CardHeader>
                  <Icon className="mb-3 size-6 text-primary" />
                  <CardTitle>{item.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-6 text-muted-foreground">{item.text}</p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
