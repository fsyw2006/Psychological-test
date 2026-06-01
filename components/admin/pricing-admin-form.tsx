"use client";

import { useState, type FormEvent } from "react";
import { Loader2, Save, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { MembershipPlan } from "@/lib/types";

export function PricingAdminForm({
  initialPlans,
  initialDailyFreeTests,
  storage
}: {
  initialPlans: MembershipPlan[];
  initialDailyFreeTests: number;
  storage: "database" | "memory";
}) {
  const [plans, setPlans] = useState(initialPlans);
  const [dailyFreeTests, setDailyFreeTests] = useState(initialDailyFreeTests);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  function updatePlan(slug: string, patch: Partial<MembershipPlan>) {
    setPlans((current) =>
      current.map((plan) => (plan.slug === slug ? { ...plan, ...patch } : plan))
    );
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const response = await fetch("/api/admin/pricing", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        plans,
        dailyFreeTests
      })
    });
    const data = await response.json();
    setSaving(false);
    setMessage(response.ok ? "定价配置已保存" : data.error || "保存失败");
    if (response.ok) {
      setPlans(data.pricing.plans);
      setDailyFreeTests(data.pricing.dailyFreeTests);
    }
  }

  return (
    <form className="space-y-5" onSubmit={save}>
      <div className="glass-panel rounded-lg p-4 text-sm leading-6 text-muted-foreground">
        当前保存位置：
        <span className="font-semibold text-foreground">
          {storage === "database" ? "Supabase SystemConfig 数据库" : "本地预览内存"}
        </span>
        。前台首页、会员页、收银台和订单金额都会读取这里的配置。
      </div>

      {message ? (
        <div className="rounded-md border border-primary/20 bg-primary/10 px-3 py-2 text-sm text-primary">
          {message}
        </div>
      ) : null}

      <Card className="glass-panel">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="size-5 text-primary" />
            免费权益
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Label htmlFor="daily-free-tests">免费用户每日测评次数</Label>
          <Input
            id="daily-free-tests"
            type="number"
            min={1}
            value={dailyFreeTests}
            onChange={(event) => setDailyFreeTests(Number(event.target.value))}
            className="mt-2 max-w-xs"
          />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {plans.map((plan) => (
          <Card key={plan.slug} className="glass-panel min-w-0 overflow-hidden">
            <CardHeader>
              <CardTitle>{plan.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor={`${plan.slug}-name`}>套餐名称</Label>
                  <Input
                    id={`${plan.slug}-name`}
                    value={plan.name}
                    onChange={(event) => updatePlan(plan.slug, { name: event.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`${plan.slug}-price`}>价格（元）</Label>
                  <Input
                    id={`${plan.slug}-price`}
                    type="number"
                    min={0}
                    step="0.01"
                    value={(plan.priceCents / 100).toFixed(2)}
                    onChange={(event) =>
                      updatePlan(plan.slug, {
                        priceCents: Math.max(0, Math.round(Number(event.target.value) * 100))
                      })
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor={`${plan.slug}-period`}>计费周期</Label>
                <Input
                  id={`${plan.slug}-period`}
                  value={plan.period}
                  onChange={(event) => updatePlan(plan.slug, { period: event.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`${plan.slug}-description`}>说明</Label>
                <Textarea
                  id={`${plan.slug}-description`}
                  value={plan.description}
                  onChange={(event) =>
                    updatePlan(plan.slug, { description: event.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`${plan.slug}-features`}>权益（一行一条）</Label>
                <Textarea
                  id={`${plan.slug}-features`}
                  value={plan.features.join("\n")}
                  onChange={(event) =>
                    updatePlan(plan.slug, {
                      features: event.target.value
                        .split("\n")
                        .map((item) => item.trim())
                        .filter(Boolean)
                    })
                  }
                />
              </div>
              <label className="flex items-center justify-between gap-3 rounded-md border border-border bg-background/60 px-3 py-2 text-sm font-medium">
                前台推荐
                <input
                  type="checkbox"
                  checked={Boolean(plan.highlighted)}
                  onChange={(event) =>
                    updatePlan(plan.slug, { highlighted: event.target.checked })
                  }
                  className="size-4 accent-primary"
                />
              </label>
            </CardContent>
          </Card>
        ))}
      </div>

      <Button disabled={saving} className="w-full sm:w-auto">
        {saving ? <Loader2 className="animate-spin" /> : <Save />}
        保存定价
      </Button>
    </form>
  );
}
