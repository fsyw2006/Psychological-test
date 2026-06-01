"use client";

import { useEffect, useRef } from "react";
import * as echarts from "echarts";
import { Crown, ReceiptText, TrendingUp, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

export type AdminStats = {
  userTotal: number;
  todayNewUsers: number;
  todayRevenue: number;
  orderCount: number;
  membershipCount: number;
  completionRate: number;
  hotTests: { name: string; value: number }[];
};

export function AdminDashboard({ stats }: { stats: AdminStats }) {
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartRef.current) return;
    const chart = echarts.init(chartRef.current);
    chart.setOption({
      color: ["#61785f"],
      tooltip: {},
      grid: { left: 16, right: 12, top: 20, bottom: 24, containLabel: true },
      xAxis: {
        type: "category",
        data: stats.hotTests.map((item) => item.name),
        axisLabel: { interval: 0, rotate: 20 }
      },
      yAxis: { type: "value" },
      series: [
        {
          type: "bar",
          data: stats.hotTests.map((item) => item.value),
          barWidth: 24,
          itemStyle: { borderRadius: [6, 6, 0, 0] }
        }
      ]
    });
    const resize = () => chart.resize();
    window.addEventListener("resize", resize);
    return () => {
      window.removeEventListener("resize", resize);
      chart.dispose();
    };
  }, [stats.hotTests]);

  const cards = [
    { title: "用户总数", value: stats.userTotal.toLocaleString("zh-CN"), icon: Users },
    { title: "今日新增", value: stats.todayNewUsers.toLocaleString("zh-CN"), icon: TrendingUp },
    { title: "今日收入", value: formatCurrency(stats.todayRevenue), icon: ReceiptText },
    { title: "会员数量", value: stats.membershipCount.toLocaleString("zh-CN"), icon: Crown }
  ];

  return (
    <div className="max-w-full space-y-6 overflow-hidden">
      <div className="grid gap-4 md:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.title} className="glass-panel min-w-0">
              <CardHeader className="pb-2">
                <Icon className="size-5 text-primary" />
                <CardTitle className="text-sm text-muted-foreground">{card.title}</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">{card.value}</CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_0.6fr]">
        <Card className="glass-panel min-w-0 overflow-hidden">
          <CardHeader>
            <CardTitle>热门测评</CardTitle>
          </CardHeader>
          <CardContent>
            <div ref={chartRef} className="h-72 w-full sm:h-80" />
          </CardContent>
        </Card>
        <Card className="glass-panel min-w-0">
          <CardHeader>
            <CardTitle>运营效率</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <p className="text-sm text-muted-foreground">订单数量</p>
              <p className="mt-1 text-3xl font-semibold">{stats.orderCount}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">测评完成率</p>
              <p className="mt-1 text-3xl font-semibold">{stats.completionRate}%</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
