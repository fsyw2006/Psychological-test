import type { Metadata } from "next";
import Link from "next/link";
import { AssessmentCard } from "@/components/assessment/assessment-card";
import { Badge } from "@/components/ui/badge";
import { getAssessmentCatalog, getCategories } from "@/lib/content";

export const metadata: Metadata = {
  title: "测评中心",
  description: "人格、情绪健康、职业发展与情感关系测评。"
};

export default async function TestsPage({
  searchParams
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const [{ category }, tests, categories] = await Promise.all([
    searchParams,
    getAssessmentCatalog({ includeQuestions: false }),
    getCategories()
  ]);
  const filtered = category ? tests.filter((test) => test.categorySlug === category) : tests;

  return (
    <section className="section-shell">
      <div className="mb-8 max-w-2xl">
        <p className="eyebrow">测评中心</p>
        <h1 className="mobile-title mt-2">选择一个此刻最想了解的问题</h1>
        <p className="mt-4 leading-7 text-muted-foreground">
          从当下最有感的问题开始，给自己一份清晰、温和、可继续行动的观察。
        </p>
      </div>
      <div className="mb-8 flex flex-wrap gap-2">
        <Link href="/tests">
          <Badge variant={!category ? "default" : "outline"}>全部</Badge>
        </Link>
        {categories.map((item) => (
          <Link key={item.slug} href={`/tests?category=${item.slug}`}>
            <Badge variant={category === item.slug ? "default" : "outline"}>{item.name}</Badge>
          </Link>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((test) => (
          <AssessmentCard key={test.slug} test={test} />
        ))}
      </div>
    </section>
  );
}
