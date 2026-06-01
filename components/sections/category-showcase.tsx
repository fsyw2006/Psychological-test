import Link from "next/link";
import {
  BriefcaseBusiness,
  HeartHandshake,
  HeartPulse,
  PanelsTopLeft
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Assessment, AssessmentCategory } from "@/lib/types";

const icons = {
  personality: PanelsTopLeft,
  emotion: HeartPulse,
  career: BriefcaseBusiness,
  relationship: HeartHandshake
};

export function CategoryShowcase({
  categories,
  tests
}: {
  categories: AssessmentCategory[];
  tests: Assessment[];
}) {
  return (
    <section className="section-shell">
      <div className="mb-8 max-w-2xl">
        <p className="eyebrow">测评分类</p>
        <h2 className="mobile-title mt-2">从一个问题，进入更清楚的自己</h2>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {categories.map((category) => {
          const Icon = icons[category.slug as keyof typeof icons] || PanelsTopLeft;
          const items = tests.filter((test) => test.categorySlug === category.slug);
          return (
            <Card key={category.slug} className="glass-panel">
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="mb-3 flex size-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <Icon className="size-5" />
                    </div>
                    <CardTitle>{category.name}</CardTitle>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {category.description}
                    </p>
                  </div>
                  <Badge variant="outline">{items.length} 项</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {items.map((test) => (
                    <Link
                      key={test.slug}
                      href={`/tests/${test.slug}`}
                      className="rounded-full border border-border bg-background/60 px-3 py-1 text-sm transition-colors hover:border-primary hover:text-primary"
                    >
                      {test.title}
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
