import type { Metadata } from "next";
import Link from "next/link";
import { ArticleCard } from "@/components/articles/article-card";
import { Input } from "@/components/ui/input";
import { getArticles } from "@/lib/content";

export const metadata: Metadata = {
  title: "心理文章",
  description: "情绪管理、人际关系、职场成长与自我提升文章。"
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ArticlesPage({
  searchParams
}: {
  searchParams: Promise<{ q?: string; category?: string }>;
}) {
  const [{ q = "", category }, articles] = await Promise.all([searchParams, getArticles()]);
  const categories = Array.from(new Set(articles.map((article) => article.category)));
  const filtered = articles.filter((article) => {
    const matchesQuery = q
      ? `${article.title}${article.excerpt}${article.tags.join("")}`.includes(q)
      : true;
    const matchesCategory = category ? article.category === category : true;
    return matchesQuery && matchesCategory;
  });

  return (
    <section className="section-shell">
      <div className="mb-8 max-w-2xl">
        <p className="eyebrow">心理文章</p>
        <h1 className="mobile-title mt-2">把理解变成可以练习的生活方式</h1>
      </div>
      <form className="mb-6 grid gap-3 sm:grid-cols-[1fr_auto]">
        <Input name="q" defaultValue={q} placeholder="搜索文章、标签或关键词" />
        <ButtonLikeSubmit />
      </form>
      <div className="mb-8 flex flex-wrap gap-2">
        <Link href="/articles" className="rounded-full border border-border px-3 py-1 text-sm">
          全部
        </Link>
        {categories.map((item) => (
          <Link
            key={item}
            href={`/articles?category=${encodeURIComponent(item)}`}
            className="rounded-full border border-border px-3 py-1 text-sm"
          >
            {item}
          </Link>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((article) => (
          <ArticleCard key={article.slug} article={article} />
        ))}
      </div>
    </section>
  );
}

function ButtonLikeSubmit() {
  return (
    <button className="focus-ring h-11 rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground">
      搜索
    </button>
  );
}
