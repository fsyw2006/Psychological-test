import Link from "next/link";
import type React from "react";
import {
  BarChart3,
  CreditCard,
  FileText,
  LayoutGrid,
  ReceiptText,
  Settings,
  Tags,
  Users
} from "lucide-react";

const nav = [
  { href: "/admin", label: "统计", icon: BarChart3 },
  { href: "/admin/tests", label: "测评", icon: LayoutGrid },
  { href: "/admin/reports", label: "报告", icon: FileText },
  { href: "/admin/articles", label: "文章", icon: FileText },
  { href: "/admin/pricing", label: "定价", icon: Tags },
  { href: "/admin/payments", label: "收款通道", icon: CreditCard },
  { href: "/admin/orders", label: "订单", icon: ReceiptText },
  { href: "/admin/memberships", label: "会员", icon: Users },
  { href: "/admin/users", label: "用户", icon: Users },
  { href: "/admin/settings", label: "设置", icon: Settings }
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <section className="section-shell">
      <div className="mb-6 sm:mb-8">
        <p className="eyebrow">管理后台</p>
        <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">Soul House Admin</h1>
      </div>
      <div className="mb-8 grid grid-cols-3 gap-2 sm:flex sm:flex-wrap">
        {nav.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex h-10 min-w-0 items-center justify-center gap-2 rounded-md border border-border bg-background/60 px-2 text-sm font-medium sm:shrink-0 sm:justify-start sm:px-3"
            >
              <Icon className="size-4" />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>
      {children}
    </section>
  );
}
