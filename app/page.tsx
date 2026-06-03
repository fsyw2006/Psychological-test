import Link from "next/link";
import { ArrowRight, ShieldCheck, Sparkles, TrendingUp } from "lucide-react";
import { AssessmentCard } from "@/components/assessment/assessment-card";
import { ArticleCard } from "@/components/articles/article-card";
import { PricingCards } from "@/components/payment/pricing-cards";
import { CategoryShowcase } from "@/components/sections/category-showcase";
import { HomeHero } from "@/components/sections/home-hero";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getArticles, getAssessmentCatalog, getCategories } from "@/lib/content";
import { getMembershipPlans } from "@/lib/pricing";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function HomePage() {
  const [tests, categories, articles, plans] = await Promise.all([
    getAssessmentCatalog(),
    getCategories(),
    getArticles(),
    getMembershipPlans()
  ]);
  const featured = tests.slice(0, 3);

  return (
    <>
      <HomeHero />
      <CategoryShowcase categories={categories} tests={tests} />

      <section className="section-shell pt-0">
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="eyebrow">热门测评</p>
            <h2 className="mobile-title mt-2">先从最常见的问题开始</h2>
          </div>
          <Button asChild variant="glass">
            <Link href="/tests">
              全部测评
              <ArrowRight />
            </Link>
          </Button>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {featured.map((test) => (
            <AssessmentCard key={test.slug} test={test} />
          ))}
        </div>
      </section>

      <section className="border-y border-white/35 bg-white/30 py-14 backdrop-blur-xl dark:border-white/10 dark:bg-white/5 sm:py-20">
        <div className="container grid gap-6 md:grid-cols-3">
          {[
            {
              icon: ShieldCheck,
              title: "无 AI 生成报告",
              text: "高级分析来自数据库预设模板，结果稳定可审计。"
            },
            {
              icon: Sparkles,
              title: "会员与单次解锁",
              text: "支持订阅制、报告单次购买与高级测评。"
            },
            {
              icon: TrendingUp,
              title: "成长档案",
              text: "历史测评、报告、订单和会员状态集中管理。"
            }
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="glass-panel rounded-lg p-5">
                <Icon className="size-6 text-primary" />
                <h3 className="mt-4 font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.text}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="section-shell">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <p className="eyebrow">会员中心</p>
            <h2 className="mobile-title mt-2">按你的探索节奏选择</h2>
          </div>
          <Badge variant="soft">支持单次解锁</Badge>
        </div>
        <PricingCards plans={plans} />
      </section>

      <section className="section-shell pt-0">
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="eyebrow">心理文章</p>
            <h2 className="mobile-title mt-2">把测评转化为日常练习</h2>
          </div>
          <Button asChild variant="glass">
            <Link href="/articles">
              阅读文章
              <ArrowRight />
            </Link>
          </Button>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {articles.slice(0, 3).map((article) => (
            <ArticleCard key={article.slug} article={article} />
          ))}
        </div>
      </section>
    </>
  );
}
