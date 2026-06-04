import Link from "next/link";
import { Check, Crown, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import type { MembershipPlan } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

function planHref(slug: string) {
  if (slug === "free") return "/tests";
  if (slug === "single-report") return "/account/reports";
  return `/checkout?plan=${encodeURIComponent(slug)}`;
}

function planActionLabel(slug: string) {
  if (slug === "free") return "免费体验";
  if (slug === "single-report") return "选择报告";
  return "立即开通";
}

export function PricingCards({ plans }: { plans: MembershipPlan[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
      {plans.map((plan) => (
        <Card
          key={plan.slug}
          className={
            plan.highlighted
              ? "glass-panel min-w-0 border-primary/40"
              : "glass-panel min-w-0"
          }
        >
          <CardHeader>
            <div className="mb-2 flex items-center justify-between">
              <CardTitle>{plan.name}</CardTitle>
              {plan.highlighted ? (
                <Badge variant="soft">
                  <Crown className="mr-1 size-3" />
                  推荐
                </Badge>
              ) : null}
            </div>
            <div className="flex flex-wrap items-end gap-1">
              <span className="text-2xl font-semibold sm:text-3xl">
                {formatCurrency(plan.priceCents)}
              </span>
              <span className="pb-1 text-sm text-muted-foreground">/{plan.period}</span>
            </div>
            <p className="text-sm leading-6 text-muted-foreground">{plan.description}</p>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-sm">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-center gap-2">
                  <Check className="size-4 text-primary" />
                  {feature}
                </li>
              ))}
            </ul>
          </CardContent>
          <CardFooter>
            <Button
              asChild
              variant={plan.slug === "free" ? "outline" : plan.highlighted ? "default" : "glass"}
              className="w-full"
            >
              <Link href={planHref(plan.slug)}>
                {plan.slug === "free" || plan.slug === "single-report" ? (
                  <Sparkles />
                ) : (
                  <Crown />
                )}
                {planActionLabel(plan.slug)}
              </Link>
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
