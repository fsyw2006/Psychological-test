import Link from "next/link";
import { Clock, Crown, PlayCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import type { Assessment } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

export function AssessmentCard({ test }: { test: Assessment }) {
  return (
    <Card className="glass-panel flex h-full min-w-0 flex-col overflow-hidden">
      <CardHeader>
        <div className="mb-3 flex flex-wrap gap-2">
          <Badge variant="soft">{test.category}</Badge>
          {test.isPremium ? (
            <Badge variant="secondary">
              <Crown className="mr-1 size-3" />
              高级测评
            </Badge>
          ) : null}
        </div>
        <CardTitle className="break-words leading-7">{test.title}</CardTitle>
        <p className="text-sm leading-6 text-muted-foreground">{test.subtitle}</p>
      </CardHeader>
      <CardContent className="flex-1">
        <p className="text-sm leading-6 text-muted-foreground">{test.description}</p>
        <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="size-3.5" />
            {test.estimatedMinutes} 分钟
          </span>
          {test.priceCents ? <span>{formatCurrency(test.priceCents)}</span> : <span>基础免费</span>}
        </div>
      </CardContent>
      <CardFooter>
        <Button asChild className="w-full">
          <Link href={`/tests/${test.slug}`}>
            <PlayCircle />
            开始测评
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
